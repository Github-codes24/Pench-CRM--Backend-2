const DeliveryHistory = require("../models/delhiveryHistory");
const Payment = require("../models/paymentModel");
const catchAsync = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhendler");
const Product = require("../models/productModel")
const Customer = require("../models/coustomerModel")
const { formatDate, normalizeDate } = require("../utils/dateUtils");


exports.TotalSales = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  //  Total Delivered Records
  const totalRecords = await DeliveryHistory.countDocuments({ status: "Delivered" });

  if (totalRecords === 0) {
    return next(new ErrorHandler("No delivered sales found", 404));
  }


  const deliveries = await DeliveryHistory.find({ status: "Delivered" })
    .populate({ path: "customer", select: "name phoneNumber address createdAt" })
    .populate({ path: "products.product", select: "productName productCode size price" })
    .sort({ date: -1 })
    .skip(skip)
    .limit(parseInt(limit));


  const salesData = await Promise.all(
    deliveries.map(async (delivery) => {
      const customer = delivery.customer;

      if (!customer) {
        return {
          customer: {
            name: "Unknown Customer",
            phoneNumber: "N/A",
            address: "N/A",
            startDate: null,
          },
          products: [],
          totalAmount: 0,
          payment: {
            method: "N/A",
            status: "Unpaid",
            totalPaid: 0,
          },
        };
      }

      const paymentRecord = await Payment.findOne({ customer: customer._id })
        .sort({ createdAt: -1 })
        .select("paymentMethod status paidAmount");


      const products = delivery.products.map((item) => {
        const product = item.product;
        const price = Number(product?.price || item.price || 0);
        const quantity = Number(item.quantity || 0);
        const total = price * quantity;

        return {
          productName: product?.productName || "N/A",
          productCode: product?.productCode || "N/A",
          size: product?.size || "N/A",
          price,
          quantity,
          total,
        };
      });


      const deliveryTotal = products.reduce((sum, p) => sum + p.total, 0);

      return {
        customer: {
          name: customer.name,
          phoneNumber: customer.phoneNumber,
          address: customer.address,
          startDate: customer.createdAt,
        },
        products,
        totalAmount: deliveryTotal,
        payment: {
          method: paymentRecord?.paymentMethod || "N/A",
          status: paymentRecord?.status || "Unpaid",
          totalPaid: paymentRecord?.paidAmount || 0,
        },
      };
    })
  );

  // grand total amount 

  const grandTotalAmount = salesData.reduce((sum, record) => sum + (record.totalAmount || 0), 0);


  const allDeliveries = await DeliveryHistory.find({ status: "Delivered" }).populate("products.product");

  let totalProductsDelivered = 0;
  allDeliveries.forEach((d) => {
    d.products.forEach((p) => {
      totalProductsDelivered += Number(p.quantity || 0);
    });
  });

  const totalDeliveries = allDeliveries.length;


  const totalPages = Math.ceil(totalRecords / limit);

  res.status(200).json({
    success: true,
    data: {
      sales: salesData,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit),
      },
      summary: {
        grandTotalAmount,
        totalProductsDelivered,
        totalDeliveries,
      },
    },
  });
});






//  Get Low Stock Products (stock < 10)

exports.getLowStockProducts = catchAsync(async (req, res, next) => {
  const products = await Product.find(
    { stock: { $lt: 10 } },
    { productName: 1, productCode: 1, stock: 1, size: 1, _id: 1 }
  ).sort({ stock: 1 });

  if (!products || products.length === 0) {
    return next(new ErrorHandler("No low stock products found", 404));
  }

  res.status(200).json({
    success: true,
    count: products.length,
    products,
  });
});




// 3. Get Active Subscriptions 
exports.getActiveSubscriptions = catchAsync(async (req, res, next) => {
  const { customerId } = req.query;


  const match = {};
  if (customerId) match._id = customerId;


  const customers = await Customer.find(match)
    .select("name phoneNumber address userProfile products")
    .populate({
      path: "products.product",
      select: "productName size productCode",
    })
    .lean();

  if (!customers || customers.length === 0) {
    return next(new ErrorHandler("No customers found", 404));
  }

  const subscriptions = [];

  for (const c of customers) {

    if (!Array.isArray(c.products) || c.products.length === 0) {
      subscriptions.push({
        id: c._id,
        fullName: c.name,
        phoneNumber: c.phoneNumber,
        address: c.address,
        userProfile: c.userProfile,
        productType: "N/A",
        productSize: "N/A",
        productCode: "N/A",
        quantity: 0,
        startDate: null,
        endDate: null,
        subscription: "N/A",
        deliveryDays: [],
        status: "Inactive",
      });
      continue;
    }


    for (const p of c.products) {
      if (!p || !p.product) {
        subscriptions.push({
          id: c._id,
          fullName: c.name,
          phoneNumber: c.phoneNumber,
          address: c.address,
          userProfile: c.userProfile,
          productType: "N/A",
          productSize: "N/A",
          productCode: "N/A",
          quantity: 0,
          startDate: null,
          endDate: null,
          subscription: "N/A",
          deliveryDays: [],
          status: "Inactive",
        });
        continue;
      }

      subscriptions.push({
        id: c._id,
        fullName: c.name,
        phoneNumber: c.phoneNumber,
        address: c.address,
        userProfile: c.userProfile,
        productType: p.product.productName,
        productSize: p.product.size,
        productCode: p.product.productCode,
        quantity: p.quantity,
        startDate: p.startDate ? formatDate(p.startDate) : null,
        endDate: p.endDate ? formatDate(p.endDate) : null,
        subscription: p.subscriptionPlan,
        deliveryDays: p.deliveryDays,
        status: "Active",
      });
    }
  }

  if (subscriptions.length === 0) {
    return next(new ErrorHandler("No active subscriptions found", 404));
  }

  res.status(200).json({
    success: true,
    count: subscriptions.length,
    data: subscriptions,
  });
});





// 5. Get Top &lowest Products by Sales

exports.getTopAndLowestProducts = catchAsync(async (req, res, next) => {
  let { startDate, endDate } = req.query;

  // Prepare match stage
  const matchStage = { status: "Delivered" };
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = normalizeDate(startDate);
    if (endDate) matchStage.date.$lte = normalizeDate(endDate);
  }

  // Aggregate deliveries
  const productAggregation = await DeliveryHistory.aggregate([
    { $match: matchStage },
    { $unwind: "$products" },
    { $match: { "products.status": "delivered" } },
    {
      $group: {
        _id: "$products.product",
        totalQuantity: { $sum: "$products.quantity" }
      }
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productInfo"
      }
    },
    { $unwind: "$productInfo" },
    {
      $project: {
        productName: "$productInfo.productName",
        productCode: "$productInfo.productCode",
        totalQuantity: 1
      }
    },
    { $sort: { totalQuantity: -1 } } // Descending for top products
  ]);

  if (!productAggregation || productAggregation.length === 0) {
    return next(new ErrorHandler("No product deliveries found", 404));
  }

  const topProduct = productAggregation[0];
  const lowestProduct = productAggregation[productAggregation.length - 1];

  res.status(200).json({
    success: true,
    data: {
      topProduct: topProduct ? {
        productName: topProduct.productName,
        productCode: topProduct.productCode,
        count: topProduct.totalQuantity
      } : null,
      lowestProduct: lowestProduct ? {
        productName: lowestProduct.productName,
        productCode: lowestProduct.productCode,
        count: lowestProduct.totalQuantity
      } : null
    }
  });
});
