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
const { calculateFullPeriodAmount } = require("../helper/helperFuctions");
const DeliveryBoy = require("../models/deliveryBoyModel");
const moment = require("moment");
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

    const deliveryBoy = await DeliveryBoy.findOne({
      name: customer?.deliveryBoy,
    });

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    const customerId = customer._id;
    const phoneNumber = customer.phoneNumber;
    const address = customer.address;
    const subscriptionPlan = customer.subscriptionPlan;
    const paymentMethod = customer.paymentMethod || "COD";
    const paymentStatus = customer.paymentStatus || "Unpaid";
    const deliveryBoyId = deliveryBoy?._id;

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
      deliveryBoy: deliveryBoyId,
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
      matchStage["period.startDate"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      matchStage["period.startDate"] = { $gte: new Date(startDate) };
    } else if (endDate) {
      matchStage["period.endDate"] = { $lte: new Date(endDate) };
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      if (!isNaN(search)) {
        matchStage.$or = [
          { invoiceNumber: searchRegex },
          { subscriptionPlan: searchRegex },
          { "products.productName": searchRegex },
          { "products.productSize": searchRegex },
          { phoneNumber: Number(search) },
          { "customerData.name": searchRegex },
        ];
      } else {
        matchStage.$or = [
          { invoiceNumber: searchRegex },
          { subscriptionPlan: searchRegex },
          { "products.productName": searchRegex },
          { "products.productSize": searchRegex },
          { "customerData.name": searchRegex },
        ];
      }
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
      deliveryBoy: invoice?.deliveryBoyData?.name || "N/A",
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

    const existingInvoices = await Invoice.find({
      customer: customerId,
    }).sort({ issueDate: -1 });

    let start, end;

    if (startDate && endDate) {
      start = parseUniversalDate(startDate) || new Date(startDate);
      end = parseUniversalDate(endDate) || new Date(endDate);
    } else if (startDate) {
      start = parseUniversalDate(startDate) || new Date(startDate);
      end = new Date();
    } else if (endDate) {
      if (existingInvoices.length > 0) {
        const lastInvoice = existingInvoices[0];
        if (
          lastInvoice.payment?.status === "Unpaid" ||
          lastInvoice.payment?.status === "Partially Paid"
        ) {
          start =
            parseUniversalDate(lastInvoice.period?.startDate) ||
            new Date(lastInvoice.period?.startDate);
        } else {
          start =
            parseUniversalDate(lastInvoice.period?.endDate) ||
            new Date(lastInvoice.period?.endDate);
        }
      } else {
        start =
          parseUniversalDate(customer.startDate) ||
          new Date(customer.startDate);
      }
      end = parseUniversalDate(endDate) || new Date(endDate);
    } else {
      if (existingInvoices.length > 0) {
        const lastInvoice = existingInvoices[0];
        if (
          lastInvoice.payment?.status === "Unpaid" ||
          lastInvoice.payment?.status === "Partially Paid"
        ) {
          start =
            parseUniversalDate(lastInvoice.period?.startDate) ||
            new Date(lastInvoice.period?.startDate);
        } else {
          start =
            parseUniversalDate(lastInvoice.period?.endDate) ||
            new Date(lastInvoice.period?.endDate);
        }
        end = new Date();
      } else {
        const customerStartDate =
          parseUniversalDate(customer?.startDate) ||
          new Date(customer.startDate);
        const now = new Date();

        if (customerStartDate > now) {
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          end = now;
        } else {
          start = customerStartDate;
          end = now;
        }
      }
    }

    if (!start || isNaN(start.getTime())) {
      start = new Date();
    }
    if (!end || isNaN(end.getTime())) {
      end = new Date();
    }

    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }

    const customerStartDate =
      parseUniversalDate(customer.startDate) || new Date(customer.startDate);

    const now = new Date();
    let effectiveStartDate = start;

    if (start > now) {
      effectiveStartDate = now;
    }

    if (end > now || end.getTime() === effectiveStartDate.getTime()) {
      end = now;
    }

    let finalStartDate = effectiveStartDate;
    let finalEndDate = end;
    let isPartialPayment = false;
    let partialPaymentDays = 0;

    if (paymentStatus === "Partially Paid") {
      const timeDiff = end.getTime() - effectiveStartDate.getTime();
      const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      partialPaymentDays = Math.floor(totalDays / 2);

      finalEndDate = new Date(
        effectiveStartDate.getTime() +
          (partialPaymentDays - 1) * (1000 * 3600 * 24)
      );
      isPartialPayment = true;
    }

    const startDateStr = formatDateToDDMMYYYY(finalStartDate);
    const endDateStr = formatDateToDDMMYYYY(finalEndDate);

    const orders = await CustomerOrders.find({
      customer: customerId,
      status: "Delivered",
      deliveryDate: {
        $gte: startDateStr,
        $lte: endDateStr,
      },
    }).populate(
      "products._id",
      "productName productCode price size description"
    );

    const startDateObj =
      parseUniversalDate(startDateStr) || new Date(startDateStr);
    const endDateObj = parseUniversalDate(endDateStr) || new Date(endDateStr);
    const timeDiff = endDateObj.getTime() - startDateObj.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    const productMap = new Map();

    orders.forEach((order) => {
      order.products.forEach((product) => {
        const key = `${product._id._id}_${product.productSize}`;

        if (productMap.has(key)) {
          const existing = productMap.get(key);
          existing.quantity += product.quantity;
          existing.totalPrice += product.totalPrice;
        } else {
          productMap.set(key, {
            productId: product._id._id,
            productName: product._id.productName,
            productCode: product._id.productCode,
            productSize: product.productSize,
            quantity: product.quantity,
            price: parseFloat(product.price),
            totalPrice: product.totalPrice,
          });
        }
      });
    });

    const products = Array.from(productMap.values());
    const totalAmount = products.reduce(
      (sum, product) => sum + product.totalPrice,
      0
    );

    const actualOrders = orders.length;

    const absentDays = [];
    const startDateForAbsent =
      parseUniversalDate(startDateStr) || new Date(startDateStr);
    const endDateForAbsent =
      parseUniversalDate(endDateStr) || new Date(endDateStr);

    const allDates = [];
    const currentDate = new Date(startDateForAbsent);

    while (currentDate <= endDateForAbsent) {
      allDates.push(formatDateToDDMMYYYY(new Date(currentDate)));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const orderDates = orders.map((order) => order.deliveryDate);

    allDates.forEach((date) => {
      if (!orderDates.includes(date)) {
        absentDays.push(new Date(parseUniversalDate(date) || new Date(date)));
      }
    });

    const deliveries = actualOrders;

    const previousUnpaidInvoices = await Invoice.find({
      customer: customerId,
      paymentStatus: { $in: ["Unpaid", "Partially Paid"] },
    }).sort({ issueDate: 1 });

    const carryForwardAmount = previousUnpaidInvoices.reduce(
      (total, invoice) => {
        return total + (invoice.totalAmount - (invoice.paidAmount || 0));
      },
      0
    );

    let partialPaymentAmount = totalAmount;
    let balanceAmount = 0;

    if (isPartialPayment) {
      const fullPeriodAmount = await calculateFullPeriodAmount(
        customerId,
        effectiveStartDate,
        end
      );
      balanceAmount = fullPeriodAmount - partialPaymentAmount;
    }

    const grandTotal =
      (isPartialPayment ? partialPaymentAmount : totalAmount) +
      carryForwardAmount;

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
        startDate: startDateStr,
        endDate: endDateStr,
      },
      products,
      grandTotal,
      deliveryStats: {
        actualOrders,
        absentDays: absentDays.length,
        deliveries,
      },
      partialPayment: isPartialPayment
        ? {
            partialPaymentAmount,
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

module.exports = {
  createCustomerInvoice,
  getAllCustomerInvoices,
  searchCustomers,
  getCustomerData,
};
