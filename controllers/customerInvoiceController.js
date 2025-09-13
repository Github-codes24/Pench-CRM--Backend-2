const Invoice = require("../models/customerInvoicesModel");
const generateInvoiceNumber = require("../utils/generateInvoiceNumber");
const { generateInvoicePDF } = require("../service/pdfService");
const { cloudinary } = require("../config/cloudinary");
const Customer = require("../models/customerModel");
const CustomerOrders = require("../models/customerOrderModel");
const {
  parseUniversalDate,
  formatDateToDDMMYYYY,
} = require("../utils/parsedDateAndDay");
const moment = require("moment");
const { calculateFullPeriodAmount } = require("../helper/helperFunctions");

const createCustomerInvoice = async (req, res) => {
  try {
    const {
      customer,
      period,
      products,
      grandTotal,
      deliveryStats,
      partialPayment,
    } = req.body;

    if (
      !customer ||
      !period ||
      !products ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer data, period, and products are required",
      });
    }

    const customerId = customer._id;
    const phoneNumber = customer.phoneNumber;
    const address = customer.address;
    const subscriptionPlan = customer.subscriptionPlan;
    const paymentMethod = customer.paymentMethod || "COD";
    const paymentStatus = customer.paymentStatus || "Unpaid";

    const subtotal = products.reduce(
      (sum, product) => sum + product.totalPrice,
      0
    );
    const carryForwardAmount = grandTotal - subtotal;
    const paidAmount = partialPayment ? partialPayment.partialPaymentAmount : 0;
    const balanceAmount = grandTotal - paidAmount;

    const partialPayments = [];
    if (paymentStatus === "Partially Paid" && partialPayment) {
      partialPayments.push({
        amount: partialPayment.partialPaymentAmount,
        date: new Date(),
        method: paymentMethod,
        notes: `Partial payment for ${partialPayment.partialPaymentDays} days`,
      });
    }

    const invoiceNumber = generateInvoiceNumber();

    const invoice = await Invoice.create({
      invoiceNumber,
      customer: customerId,
      phoneNumber: parseInt(phoneNumber),
      address,
      subscriptionPlan,
      Deliveries: deliveryStats?.deliveries || 0,
      absentDays: deliveryStats?.absentDaysList
        ? deliveryStats.absentDaysList.map((date) => new Date(date))
        : [],
      actualOrders: deliveryStats?.actualOrders || 0,
      period: {
        startDate:
          parseUniversalDate(period.startDate) || new Date(period.startDate),
        endDate: parseUniversalDate(period.endDate) || new Date(period.endDate),
      },
      products: products.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        productSize: product.productSize,
        quantity: product.quantity,
        price: product.price,
        totalPrice: product.totalPrice,
      })),
      payment: {
        status: paymentStatus,
        method: paymentMethod,
        amount: paidAmount,
        paidDate: paymentStatus === "Paid" ? new Date() : null,
        partialPayments: partialPayments,
      },
      totals: {
        subtotal,
        paidAmount,
        balanceAmount,
        carryForwardAmount,
      },
      state: "Draft",
    });

    const invoiceWithStats = {
      ...invoice.toObject(),
      customer: {
        name: customer.name,
        phoneNumber: customer.phoneNumber,
        address: customer.address,
      },
      deliveryStats: deliveryStats || {
        actualOrders: products.length,
        absentDays: 0,
        deliveries: products.length,
      },
    };

    const pdfBuffer = await generateInvoicePDF(invoiceWithStats);

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "raw",
            folder: "Pench/Invoices",
            public_id: `invoice-${invoiceNumber}`,
            format: "pdf",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        )
        .end(pdfBuffer);
    });

    invoice.pdfUrl = result.secure_url;
    await invoice.save();

    return res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      pdfUrl: result.secure_url,
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create invoice",
      error: error.message,
    });
  }
};

const getAllCustomerInvoices = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      startDate,
      endDate,
      sortOrder = "desc",
    } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    let matchStage = {};
    
    if (startDate && endDate) {
      const startDateObj = parseUniversalDate(startDate) || new Date(startDate);
      const endDateObj = parseUniversalDate(endDate) || new Date(endDate);
      matchStage.$and = [
        { "period.startDate": { $lte: endDateObj } },
        { "period.endDate": { $gte: startDateObj } },
      ];
    } else if (startDate) {
      const startDateObj = parseUniversalDate(startDate) || new Date(startDate);
      matchStage["period.endDate"] = { $gte: startDateObj };
    } else if (endDate) {
      const endDateObj = parseUniversalDate(endDate) || new Date(endDate);
      matchStage["period.startDate"] = { $lte: endDateObj };
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      const searchConditions = [
        { invoiceNumber: searchRegex },
        { subscriptionPlan: searchRegex },
        { "customerData.name": searchRegex },
      ];

      if (!isNaN(search)) {
        searchConditions.push({ phoneNumber: Number(search) });
      }

      matchStage.$or = searchConditions;
    }

    const sortStage = { createdAt: sortOrder === "asc" ? 1 : -1 };

    const invoices = await Invoice.aggregate([
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customerData",
        },
      },
      { $unwind: { path: "$customerData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "deliveryboys",
          localField: "deliveryBoy",
          foreignField: "_id",
          as: "deliveryBoyData",
        },
      },
      {
        $unwind: { path: "$deliveryBoyData", preserveNullAndEmptyArrays: true },
      },
      { $match: matchStage },
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limit },
    ]);

    const totalInvoices = await Invoice.aggregate([
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customerData",
        },
      },
      { $unwind: { path: "$customerData", preserveNullAndEmptyArrays: true } },
      { $match: matchStage },
      { $count: "count" },
    ]);

    const totalCount = totalInvoices.length > 0 ? totalInvoices[0].count : 0;
    const totalPages = Math.ceil(totalCount / limit);

    const formattedInvoices = invoices.map((invoice) => ({
      invoiceId: invoice?._id,
      invoiceNumber: invoice?.invoiceNumber,
      customerName: invoice?.customerData?.name || "N/A",
      phoneNumber: invoice?.phoneNumber || invoice?.customerData?.phoneNumber,
      subscriptionPlan: invoice?.subscriptionPlan || "N/A",
      amount: invoice?.totals?.subtotal || 0,
      status: invoice?.payment?.status || "Unpaid",
      pdfUrl: invoice?.pdfUrl,
      period: {
        startDate: invoice?.period?.startDate
          ? moment(invoice?.period?.startDate).format("DD/MM/YYYY")
          : null,
        endDate: invoice?.period?.endDate
          ? moment(invoice?.period?.endDate).format("DD/MM/YYYY")
          : null,
      },
      createdAt: invoice?.createdAt,
    }));

    return res.status(200).json({
      success: true,
      message: "Invoices fetched successfully",
      totalInvoices: totalCount,
      totalPages,
      currentPage: page,
      previous: page > 1,
      next: page < totalPages,
      invoices: formattedInvoices,
    });
  } catch (error) {
    console.error("getAllCustomerInvoices Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching invoices",
      error: error.message,
    });
  }
};

const searchCustomers = async (req, res) => {
  try {
    const { customerName, phoneNumber } = req.query;

    if (!customerName && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Either customerName or phoneNumber is required",
      });
    }

    let searchCriteria = {};

    if (customerName && phoneNumber) {
      searchCriteria.$or = [
        { name: { $regex: customerName, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$phoneNumber" },
              regex: phoneNumber,
              options: "i",
            },
          },
        },
      ];
    } else if (customerName) {
      searchCriteria.name = { $regex: customerName, $options: "i" };
    } else if (phoneNumber) {
      searchCriteria.$expr = {
        $regexMatch: {
          input: { $toString: "$phoneNumber" },
          regex: phoneNumber,
          options: "i",
        },
      };
    }

    searchCriteria.isDeleted = false;
    searchCriteria.subscriptionStatus = "active";

    const customers = await Customer.find(searchCriteria)
      .select(
        "name phoneNumber address subscriptionPlan paymentMethod paymentStatus"
      )
      .populate("deliveryBoy", "name")
      .limit(10);

    return res.json({
      success: true,
      message: "Customers Information fetched successfully",
      customersData: customers.map((customer) => ({
        _id: customer._id,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
      })),
    });
  } catch (error) {
    console.error("Error searching customers:", error);
    return res.status(500).json({
      success: false,
      message: "Error searching customers",
      error: error.message,
    });
  }
};

const getCustomerData = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { startDate, endDate, paymentStatus } = req.query;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    const availablePaymentStatus = ["Paid", "partially Paid", "Unpaid"];

    if (paymentStatus && !availablePaymentStatus.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
        availablePaymentStatus,
      });
    }

    const customer = await Customer.findById(customerId)
      .populate(
        "products.product",
        "productName productCode price size description"
      )
      .populate("deliveryBoy", "name phoneNumber");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const {
      finalStartDate,
      finalEndDate,
      isPartialPayment,
      partialPaymentDays,
    } = await determineDateRange(
      customerId,
      customer,
      startDate,
      endDate,
      paymentStatus
    );
        
    const existingInvoice = await Invoice.findOne({
      customer: customerId,
      "period.startDate": { $lte: finalEndDate },
      "period.endDate": { $gte: finalStartDate },
    });

    if (existingInvoice) {
      return res.status(409).json({
        success: false,
        message: "Invoice already exists for this date range",
        existingInvoice: {
          invoiceNumber: existingInvoice.invoiceNumber,
          period: {
            startDate: formatDateToDDMMYYYY(existingInvoice.period.startDate),
            endDate: formatDateToDDMMYYYY(existingInvoice.period.endDate),
          },
          status: existingInvoice.payment?.status || "Unpaid",
          pdfUrl: existingInvoice.pdfUrl,
        },
      });
    }

    const orders = await fetchOrdersInRange(
      customerId,
      finalStartDate,
      finalEndDate,
      paymentStatus
    );
    const { products, totalAmount } = processProducts(orders, paymentStatus);
    const { actualOrders, absentDays } = await calculateDeliveryStats(
      orders,
      finalStartDate,
      finalEndDate,
      paymentStatus,
      customerId
    );
    const { grandTotal, carryForwardAmount, balanceAmount } =
      await calculateFinancials(
        customerId,
        totalAmount,
        isPartialPayment,
        partialPaymentDays,
        finalStartDate,
        finalEndDate
      );

    return res.json({
      success: true,
      message: "Customer data retrieved successfully",
      customer: {
        _id: customer._id,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
        address: customer.address,
        subscriptionPlan: customer.subscriptionPlan,
        paymentMethod: customer.paymentMethod,
        paymentStatus: customer.paymentStatus,
        deliveryBoy: customer.deliveryBoy?.name,
      },
      period: {
        startDate: formatDateToDDMMYYYY(finalStartDate),
        endDate: formatDateToDDMMYYYY(finalEndDate),
      },
      products,
      grandTotal,
      deliveryStats: {
        actualOrders,
        absentDays: absentDays.length,
        deliveries: actualOrders,
      },
      partialPayment: isPartialPayment
        ? {
            partialPaymentAmount: totalAmount,
            partialPaymentDays,
            balanceAmount,
          }
        : false,
    });
  } catch (error) {
    console.error("Error getting customer data:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting customer data",
      error: error.message,
    });
  }
};

// Helper function to determine date range
const determineDateRange = async (
  customerId,
  customer,
  startDate,
  endDate,
  paymentStatus
) => {
  const existingInvoices = await Invoice.find({ customer: customerId }).sort({
    issueDate: -1,
  });

  let start, end;

  if (startDate && endDate) {
    start = parseUniversalDate(startDate) || new Date(startDate);
    end = parseUniversalDate(endDate) || new Date(endDate);
  } else if (startDate) {
    start = await getStartDateFromInvoice(customerId, customer, startDate);
    end = await getLastOrderDate(customerId, start);
  } else if (endDate) {
    start = await getStartDateFromLastInvoice(customer, existingInvoices);
    end = parseUniversalDate(endDate) || new Date(endDate);
  } else {
    start = await getStartDateFromLastInvoice(customer, existingInvoices);
    end = await getLastOrderDate(customerId, start);
  }

  // Validate and fix dates
  if (!start || isNaN(start.getTime())) start = new Date();
  if (!end || isNaN(end.getTime())) end = new Date();
  if (start > end) [start, end] = [end, start];

  // Handle partial payment
  let finalStartDate = start;
  let finalEndDate = end;
  let isPartialPayment = false;
  let partialPaymentDays = 0;

  if (paymentStatus === "Partially Paid") {
    const totalDays =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    partialPaymentDays = Math.floor(totalDays / 2);
    finalEndDate = new Date(
      start.getTime() + (partialPaymentDays - 1) * (1000 * 3600 * 24)
    );
    isPartialPayment = true;
  }

  return { finalStartDate, finalEndDate, isPartialPayment, partialPaymentDays };
};

// Helper function to get start date from invoice
const getStartDateFromInvoice = async (
  customerId,
  customer,
  providedStartDate
) => {
  const invoicesInPeriod = await Invoice.find({
    customer: customerId,
    "period.startDate": {
      $gte:
        parseUniversalDate(providedStartDate) || new Date(providedStartDate),
    },
  }).sort({ "period.endDate": -1 });

  if (invoicesInPeriod.length > 0) {
    const endDate =
      parseUniversalDate(invoicesInPeriod[0].period?.endDate) ||
      new Date(invoicesInPeriod[0].period?.endDate);
    return new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  }

  return parseUniversalDate(customer.startDate) || new Date(customer.startDate);
};

// Helper function to get start date from last invoice
const getStartDateFromLastInvoice = (customer, existingInvoices) => {
  if (existingInvoices.length > 0) {
    const lastInvoice = existingInvoices[0];
    const isUnpaidOrPartial = ["Unpaid", "Partially Paid"].includes(
      lastInvoice.payment?.status
    );
    const targetDate = isUnpaidOrPartial
      ? lastInvoice.period?.startDate
      : lastInvoice.period?.endDate;
    return parseUniversalDate(targetDate) || new Date(targetDate);
  }
  return parseUniversalDate(customer.startDate) || new Date(customer.startDate);
};

// Helper function to get last order date
const getLastOrderDate = async (customerId, startDate) => {
  const lastOrder = await CustomerOrders.findOne({
    customer: customerId,
    deliveryDate: { $gte: formatDateToDDMMYYYY(startDate) },
  }).sort({ deliveryDate: -1 });

  return lastOrder
    ? parseUniversalDate(lastOrder.deliveryDate) ||
        new Date(lastOrder.deliveryDate)
    : new Date();
};

// Helper function to fetch orders in range
const fetchOrdersInRange = async (
  customerId,
  startDate,
  endDate,
  paymentStatus
) => {
  const allOrders = await CustomerOrders.find({
    customer: customerId,
  }).populate("products._id", "productName productCode price size description");

  const startDateObj =
    parseUniversalDate(formatDateToDDMMYYYY(startDate)) || startDate;
  const endDateObj =
    parseUniversalDate(formatDateToDDMMYYYY(endDate)) || endDate;

  let orders = allOrders.filter((order) => {
    const orderDate = parseUniversalDate(order.deliveryDate);
    return orderDate && orderDate >= startDateObj && orderDate <= endDateObj;
  });

  if (paymentStatus === "Partially Paid") {
    orders = orders.filter((order) => order.status === "Delivered");
  }

  return orders;
};

// Helper function to process products
const processProducts = (orders, paymentStatus) => {
  const productMap = new Map();

  orders.forEach((order) => {
    if (paymentStatus === "Partially Paid" && order.status !== "Delivered")
      return;

    order.products.forEach((product) => {
      const key = `${product._id._id}_${product.productSize}`;
      const price = parseFloat(product.price);

      if (productMap.has(key)) {
        const existing = productMap.get(key);
        existing.quantity += product.quantity;
        existing.totalPrice = existing.quantity * existing.price;
      } else {
        productMap.set(key, {
          productId: product._id._id,
          productName: product._id.productName,
          productCode: product._id.productCode,
          productSize: product.productSize,
          quantity: product.quantity,
          price: price,
          totalPrice: product.quantity * price,
        });
      }
    });
  });

  const products = Array.from(productMap.values());
  const totalAmount = products.reduce(
    (sum, product) => sum + product.totalPrice,
    0
  );

  return { products, totalAmount };
};

// Helper function to calculate delivery stats
const calculateDeliveryStats = async (
  orders,
  startDate,
  endDate,
  paymentStatus,
  customerId
) => {
  const actualOrders =
    paymentStatus === "Partially Paid"
      ? orders.filter((order) => order.status === "Delivered").length
      : orders.length;

  const startDateStr = formatDateToDDMMYYYY(startDate);
  const endDateStr = formatDateToDDMMYYYY(endDate);
  const startDateObj =
    parseUniversalDate(startDateStr) || new Date(startDateStr);
  const endDateObj = parseUniversalDate(endDateStr) || new Date(endDateStr);

  const allDates = [];
  const currentDate = new Date(startDateObj);
  while (currentDate <= endDateObj) {
    allDates.push(formatDateToDDMMYYYY(new Date(currentDate)));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const orderDates =
    paymentStatus === "Partially Paid"
      ? orders
          .filter((order) => order.status === "Delivered")
          .map((order) => order.deliveryDate)
      : orders.map((order) => order.deliveryDate);

  // Get customer's absent days list
  const customer = await Customer.findById(customerId);
  const customerAbsentDays = customer.absentDays.map((absentDate) =>
    formatDateToDDMMYYYY(absentDate)
  );

  // Only count dates that have no order AND are in customer's absent list
  const absentDays = allDates
    .filter(
      (date) => !orderDates.includes(date) && customerAbsentDays.includes(date)
    )
    .map((date) => new Date(parseUniversalDate(date) || new Date(date)));

  return { actualOrders, absentDays };
};

// Helper function to calculate financials
const calculateFinancials = async (
  customerId,
  totalAmount,
  isPartialPayment,
  partialPaymentDays,
  startDate,
  endDate
) => {
  const previousUnpaidInvoices = await Invoice.find({
    customer: customerId,
    paymentStatus: { $in: ["Unpaid", "Partially Paid"] },
  }).sort({ issueDate: 1 });

  const carryForwardAmount = previousUnpaidInvoices.reduce(
    (total, invoice) =>
      total + (invoice.totalAmount - (invoice.paidAmount || 0)),
    0
  );

  let balanceAmount = 0;
  if (isPartialPayment) {
    const fullPeriodAmount = await calculateFullPeriodAmount(
      customerId,
      startDate,
      endDate
    );
    balanceAmount = fullPeriodAmount - totalAmount;
  }

  const grandTotal = totalAmount + carryForwardAmount;

  return { grandTotal, carryForwardAmount, balanceAmount };
};

module.exports = {
  createCustomerInvoice,
  getAllCustomerInvoices,
  searchCustomers,
  getCustomerData,
};
