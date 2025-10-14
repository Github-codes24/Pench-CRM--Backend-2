const Payment = require("../models/paymentModel");
const Product = require("../models/productModel");
const Customer = require("../models/customerModel");
const CustomerOrder = require("../models/customerOrderModel");
const moment = require("moment");

//✅ Total Sales
const TotalSales = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      sortOrder = "",
      period = "All Time",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // ---- Base Match Filter ----
    const baseMatch = { status: "Delivered" };

    let startDate, endDate;
    const today = new Date();
    if (period == "Today") {
      startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      endDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
    }
    if (period == "This Month") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (period == "This Year") {
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31);
    } else if (period == "This Week") {
      const dayOfWeek = today.getDay(); // 0=Sunday
      startDate = new Date(today);
      startDate.setDate(today.getDate() - dayOfWeek); // start of week
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = null;
      endDate = null;
    }

    // ---- Aggregation Pipeline ----
    const pipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: "customers", // collection name in MongoDB
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
    ];

    // ---- Search Filter ----
    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { "customer.name": { $regex: regex } },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: "$customer.phoneNumber" },
                  regex: regex,
                },
              },
            },
            { "products.productName": { $regex: regex } },
            { "products.productSize": { $regex: regex } },
          ],
        },
      });
    }
    // ---- Date Filter ----
    if (startDate && endDate) {
      pipeline.push({
        $addFields: {
          deliveryDateObj: {
            $dateFromString: {
              dateString: "$deliveryDate", // your field in dd/mm/yyyy
              format: "%d/%m/%Y",
            },
          },
        },
      });
      pipeline.push({
        $match: {
          deliveryDateObj: { $gte: startDate, $lte: endDate },
        },
      });
    }

    const sortOptions = sortOrder === "asc" ? 1 : -1;

    // ---- Sorting, Skip, Limit ----
    pipeline.push(
      { $sort: { createdAt: sortOptions } },
      { $skip: skip },
      { $limit: limit }
    );

    // ---- Execute Aggregation ----
    const deliveries = await CustomerOrder.aggregate(pipeline);

    if (!deliveries || deliveries.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No delivered sales found",
      });
    }

    // ---- Map Sales Data ----
    const salesData = deliveries.map((delivery) => {
      const customer = delivery.customer || {};
      const products = delivery.products.map((product) => ({
        _id: product._id,
        productName: product.productName,
        productSize: product.productSize,
        price: product.price,
        quantity: product.quantity,
        totalPrice: product.totalPrice,
      }));

      const totalAmount = products.reduce(
        (sum, p) =>
          sum + (p.totalPrice || Number(p.price) * Number(p.quantity)),
        0
      );
      const totalProductsDelivered = products.reduce(
        (sum, p) => sum + (p.quantity || 0),
        0
      );

      return {
        orderNumber: delivery.orderNumber,
        orderStatus: delivery.status,
        customerName: customer.name || "Unknown",
        phoneNumber: customer.phoneNumber || "N/A",
        paymentMethod: delivery.paymentMethod || "N/A",
        paymentStatus: delivery.paymentStatus || "Unpaid",
        products,
        totalAmount,
        totalProductsDelivered,
        deliveryDate: delivery.deliveryDate,
      };
    });

    // ---- Summary ----
    const grandTotalAmount = salesData.reduce(
      (sum, record) => sum + (record.totalAmount || 0),
      0
    );
    const totalProductsDelivered = salesData.reduce(
      (sum, record) => sum + (record.totalProductsDelivered || 0),
      0
    );

    const totalPages = Math.ceil(deliveries.length / limit);

    // ---- Response ----
    res.status(200).json({
      success: true,
      message: "Total Sales fetched successfully",
      totalRecords: deliveries.length,
      totalPages,
      currentPage: page,
      previous: page > 1,
      next: page < totalPages,
      summary: {
        grandTotalAmount,
        // totalProductsDelivered,
        totalDeliveries: deliveries.length,
      },
      sales: salesData,
    });
  } catch (err) {
    console.error("TotalSales Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

//✅ Get Low Stock Products (stock < 10)
const getLowStockProducts = async (req, res, next) => {
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
};

//✅ Get Active Subscriptions
const getActiveSubscriptions = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", sortOrder = "desc" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // ---- Build filter ----
    const filter = {
      subscriptionStatus: "active",
      customerStatus: "Active",
      isDeleted: false,
    };

    // 🔍 Search filter
    if (search) {
      const regex = new RegExp(search, "i"); // case-insensitive
      if (!isNaN(search)) {
        // If numeric search, check phoneNumber also
        filter.$or = [
          { name: regex },
          { phoneNumber: Number(search) },
          { subscriptionStatus: regex },
        ];
      } else {
        filter.$or = [{ name: regex }, { subscriptionStatus: regex }];
      }
    }

    // ---- Sort order ----
    const sortOption = sortOrder === "asc" ? 1 : -1;

    // ---- Query DB ----
    const [totalActiveSubscribedCustomers, customers] = await Promise.all([
      Customer.countDocuments(filter),
      Customer.find(filter)
        .select(
          "image name phoneNumber subscriptionStatus subscriptionPlan createdAt"
        )
        .sort({ createdAt: sortOption })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    if (!customers || customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active subscriptions found",
      });
    }

    // ✅ Format response
    const subscriptions = customers.map((c) => ({
      image: c.image,
      customerName: c.name,
      phoneNumber: c.phoneNumber,
      subscriptionStatus: c.subscriptionStatus,
      subscriptionPlan: c.subscriptionPlan,
    }));

    // ---- Pagination meta ----
    const totalPages = Math.ceil(totalActiveSubscribedCustomers / limit);
    const hasPrevious = page > 1;
    const hasNext = page < totalPages;

    return res.status(200).json({
      success: true,
      message: "Active subscriptions fetched successfully",
      totalActiveSubscribedCustomers,
      totalPages,
      currentPage: page,
      previous: hasPrevious,
      next: hasNext,
      customers: subscriptions,
    });
  } catch (err) {
    console.error("getActiveSubscriptions Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active subscriptions",
      error: err.message,
    });
  }
};

//✅ Get New Onboard Customers (first delivery)
const getNewOnboardCustomers = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      productName = "",
      size = "",
      range = "prev",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const today = moment().startOf("day");
    let startDate, endDate;

    if (range === "prev") {
      startDate = moment(today).subtract(1, "week").startOf("day");
      endDate = moment(today).endOf("day");
    } else if (range === "next") {
      startDate = moment(today).startOf("day");
      endDate = moment(today).add(1, "week").endOf("day");
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid range. Use 'prev' or 'next'.",
      });
    }

    // ---- Base filter for customers ----
    const filter = {
      isDeleted: false,
      createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
    };

    // ---- Fetch customers and populate products ----
    let customers = await Customer.find(filter)
      .populate({
        path: "products.product",
        model: Product,
        select: "productName size",
      })
      .sort({ createdAt: -1 })
      .lean();

    if (!customers || customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No onboard customers found for this range",
      });
    }

    // ---- Filter by productName and size ----
    if (productName || size) {
      customers = customers.filter((customer) =>
        customer.products.some(
          (p) =>
            p.product &&
            (!productName ||
              p.product.productName
                .toLowerCase()
                .includes(productName.toLowerCase())) &&
            (!size ||
              (p.productSize || p.product?.size || "").toLowerCase() ===
                size.toLowerCase())
        )
      );
    }

    // ---- Pagination ----
    const totalFilteredCustomers = customers.length;
    const totalPages = Math.ceil(totalFilteredCustomers / limit);
    const paginatedCustomers = customers.slice(skip, skip + limit);

    // ---- Format response ----
    const response = paginatedCustomers.map((customer) => {
      const allProducts = customer.products.filter((p) => p.product);
      return {
        _id: customer._id,
        customerName: customer.name,
        // productId: allProducts.map((p) => p.product._id),
        productNames: allProducts
          .map((p) => p.product?.productName || "N/A")
          .join(", "),
        sizes: allProducts
          .map((p) => p.productSize || p.product?.size || "N/A")
          .join(", "),
        quantities: allProducts.map((p) => p.quantity).join(", "),
        date: moment(customer.createdAt).format("DD/MM/YYYY"),
      };
    });

    return res.status(200).json({
      success: true,
      message: "Onboard customers fetched successfully",
      weekRange: {
        from: startDate.format("DD/MM/YYYY"),
        to: endDate.format("DD/MM/YYYY"),
      },
      totalOnBoardedCustomers: totalFilteredCustomers,
      totalPages,
      currentPage: page,
      previous: page > 1,
      next: page < totalPages,
      customers: response,
    });
  } catch (error) {
    console.error("getNewOnboardCustomers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch onboard customers",
      error: error.message,
    });
  }
};

//✅ Get Earning Overview
const getEarningOverview = async (req, res) => {
  try {
    const { period } = req.query;

    // ---- Allowed periods ----
    const allowedPeriods = ["Daily", "Weekly", "Monthly", "All"];
    if (period && !allowedPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: `Invalid period "${period}". Allowed values: ${allowedPeriods.join(
          ", "
        )}.`,
      });
    }

    // ---- Date Range ----
    const today = moment().startOf("day");
    let startDate, endDate;

    switch (period) {
      case "Daily":
        startDate = moment(today).startOf("day");
        endDate = moment(today).endOf("day");
        break;
      case "Weekly":
        startDate = moment(today).startOf("week");
        endDate = moment(today).endOf("week");
        break;
      case "Monthly":
        startDate = moment(today).startOf("month");
        endDate = moment(today).endOf("month");
        break;
      default:
        startDate = null;
        endDate = null;
    }

    // ---- Base filter ----
    const filter = {
      paymentStatus: { $in: ["Paid", "Partially Paid"] },
    };

    if (startDate && endDate) {
      filter.createdAt = { $gte: startDate.toDate(), $lte: endDate.toDate() };
    }

    // ---- Aggregate payments ----
    const payments = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$paidAmount" },
        },
      },
    ]);

    const totalEarnings =
      payments && payments.length > 0 ? payments[0].totalEarnings : 0;

    return res.status(200).json({
      success: true,
      message: `${period || "All"} Earning overview fetched successfully`,
      period: period || "All",
      earnings: totalEarnings,
    });
  } catch (error) {
    console.error("getEarningOverview Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch earnings overview",
      error: error.message,
    });
  }
};

//✅ Get Product Of The Day
const getProductOfTheDay = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const pipeline = [
      // Match delivered orders
      { $match: { status: "Delivered" } },

      // Convert deliveryDate (dd/mm/yyyy string) -> Date
      {
        $addFields: {
          deliveryDateObj: {
            $dateFromString: {
              dateString: "$deliveryDate",
              format: "%d/%m/%Y",
            },
          },
        },
      },

      // Match only today's orders
      {
        $match: {
          deliveryDateObj: { $gte: startOfDay, $lte: endOfDay },
        },
      },

      // Break down products array
      { $unwind: "$products" },

      // Group by product name (or _id if you prefer)
      {
        $group: {
          _id: "$products._id",
          productName: { $first: "$products.productName" },
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: "$products.totalPrice" },
        },
      },

      // Sort by quantity sold
      { $sort: { totalQuantity: -1 } },

      // Keep top 1 product
      { $limit: 1 },
    ];

    const result = await CustomerOrder.aggregate(pipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No product sales found for today",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product of the day fetched successfully",
      productOfTheDay: result[0],
    });
  } catch (error) {
    console.error("getProductOfTheDay Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product of the day",
      error: error.message,
    });
  }
};

//✅ Get Lowest Product Sale
const getLowestProductSale = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const pipeline = [
      // Match delivered orders
      { $match: { status: "Delivered" } },

      // Convert deliveryDate (dd/mm/yyyy string) -> Date
      {
        $addFields: {
          deliveryDateObj: {
            $dateFromString: {
              dateString: "$deliveryDate",
              format: "%d/%m/%Y",
            },
          },
        },
      },

      // Match only today's orders
      {
        $match: {
          deliveryDateObj: { $gte: startOfDay, $lte: endOfDay },
        },
      },

      // Break down products array
      { $unwind: "$products" },

      // Group by product name
      {
        $group: {
          _id: "$products._id",
          productName: { $first: "$products.productName" },
          productSize: { $first: "$products.productSize" },
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: "$products.totalPrice" },
        },
      },

      // Sort ascending by quantity
      { $sort: { totalQuantity: 1 } },
    ];

    const result = await CustomerOrder.aggregate(pipeline);
    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No product sales found for today",
      });
    }

    // Find minimum quantity
    const minQuantity = result[0].totalQuantity;

    // Filter all products that have this minimum quantity
    const lowestProducts = result.filter(
      (p) => p.totalQuantity === minQuantity
    );

    const lowestSalesCount = lowestProducts.length;
    return res.status(200).json({
      success: true,
      message: "Lowest sold product(s) fetched successfully",
      lowestSalesCount,
      lowestProductSale: lowestProducts,
    });
  } catch (error) {
    console.error("getLowestProductSale Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch lowest sold product(s)",
      error: error.message,
    });
  }
};

//✅ Get Total Delivered Product Unit
const getTotalDeliveredProductUnit = async (req, res) => {
  try {
    let { productName, productSize, period } = req.query;

    const allowedPeriods = ["Daily", "Weekly", "Monthly", "All"];
    if (period && !allowedPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: `Invalid period "${period}". Allowed values are: ${allowedPeriods.join(
          ", "
        )}.`,
      });
    }

    // ---- Validate productName ----
    let productDoc = [];
    if (productName) {
      productDoc = await Product.find({ productName });

      if (!productDoc || productDoc.length === 0) {
        const allProducts = await Product.find({}, "productName size");
        return res.status(400).json({
          success: false,
          message: `Invalid product name: "${productName}". Please choose from the available list.`,
          availableProducts: allProducts.map((p) => ({
            name: p.productName,
            size: p.productSize,
          })),
        });
      }
    }

    // ---- Validate quantity unit if product exists ----
    if (productSize && productDoc.length > 0) {
      const valideSize = productDoc.map((p) => p.size);
      if (!valideSize.includes(productSize)) {
        return res.status(400).json({
          success: false,
          message: `Invalid size "${productSize}" for product "${productName}". Please choose from the available list.`,
          availableSizes: valideSize,
        });
      }
    }

    // ---- Date Range based on period ----
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case "Daily":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "Weekly":
        const firstDayOfWeek = new Date(now);
        firstDayOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        firstDayOfWeek.setHours(0, 0, 0, 0);

        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        lastDayOfWeek.setHours(23, 59, 59, 999);

        startDate = firstDayOfWeek;
        endDate = lastDayOfWeek;
        break;
      case "Monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        break;
      default:
        startDate = null;
        endDate = null;
    }

    // ---- Pipeline ----
    const pipeline = [
      { $match: { status: "Delivered" } },
      {
        $addFields: {
          deliveryDateObj: {
            $dateFromString: {
              dateString: "$deliveryDate",
              format: "%d/%m/%Y",
            },
          },
        },
      },
    ];

    if (startDate && endDate) {
      pipeline.push({
        $match: { deliveryDateObj: { $gte: startDate, $lte: endDate } },
      });
    }

    pipeline.push({ $unwind: "$products" });

    const productMatch = {};
    if (productName) productMatch["products.productName"] = productName;
    if (productSize) productMatch["products.productSize"] = productSize;

    if (Object.keys(productMatch).length > 0) {
      pipeline.push({ $match: productMatch });
    }

    pipeline.push({
      $group: {
        _id: "$products._id",
        productName: { $first: "$products.productName" },
        productSize: { $first: "$products.productSize" },
        totalUnits: { $sum: "$products.quantity" },
        totalRevenue: { $sum: "$products.totalPrice" },
      },
    });

    pipeline.push({ $sort: { totalUnits: -1 } });

    const result = await CustomerOrder.aggregate(pipeline);

    if (!result || result.length === 0) {
      return res.status(200).json({
        success: false,
        // message: "No delivered products found",
        period: period || "All",
        deliveredUnits: 0,
      });
    }
    const grandTotalUnits = result.reduce((sum, r) => sum + r.totalUnits, 0);

    return res.status(200).json({
      success: true,
      message: "Delivered Product Units Fetched Successfully",
      period: period || "All",
      deliveredUnits: grandTotalUnits,
      result,
    });
  } catch (error) {
    console.error("getTotalDelivierdProductUnit Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to Fetch Total Delivered Product Unit",
      error: error.message,
    });
  }
};

module.exports = {
  TotalSales,
  getLowStockProducts,
  getActiveSubscriptions,
  getNewOnboardCustomers,
  getProductOfTheDay,
  getProductOfTheDay,
  getLowestProductSale,
  getTotalDeliveredProductUnit,
  getEarningOverview,
};
