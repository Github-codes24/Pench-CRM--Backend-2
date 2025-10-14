const Customer = require("../models/customerModel");
const CustomerOrders = require("../models/customerOrderModel"); // daily orders
const Payment = require("../models/paymentModel");
const Razorpay = require("razorpay");
const { formatDateToDDMMYYYY } = require("../utils/parsedDateAndDay");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Payment for Customer
const createPaymentForCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { wantToPay, paymentMethod, paidAmount } = req.body;

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    if (!wantToPay) {
      return res.status(400).json({
        success: false,
        message: "wantToPay must be true to create a payment",
      });
    }

    if (!paymentMethod || !["Online", "COD"].includes(paymentMethod)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid paymentMethod" });
    }

    if (!paidAmount || paidAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Provide a valid paidAmount" });
    }

    // ✅ Fetch all delivered orders (oldest first)
    const allOrders = await CustomerOrders.find({
      customer: customerId,
      status: "Delivered",
      paymentStatus: "Unpaid",
    }).sort({ createdAt: 1 });    

    const totalAmount = allOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );    

    const latestPayment = await Payment.findOne({
      customer: customerId,
    }).sort({ createdAt: -1 });    

    let finalBalanceAmount = totalAmount;

    if (latestPayment && latestPayment.carryForwardBalance > 0) {
      finalBalanceAmount = totalAmount - latestPayment.carryForwardBalance;
    }

    // Calculate actual total amount from orders (without carryforward adjustment)
    const actualTotalAmount = allOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );

    if (paidAmount > finalBalanceAmount) {
      return res.status(400).json({
        success: false,
        message: `Paid amount cannot exceed total amount (${finalBalanceAmount})`,
      });
    }

    let paymentDocData = {
      customer: customerId,
      totalAmount: actualTotalAmount,
      paidAmount: 0,
      balanceAmount: finalBalanceAmount,
      carryForwardBalance: 0,
      paidDate: formatDateToDDMMYYYY(new Date()),
      orderStartDate: null,
      orderEndDate: null,
      paymentMethod,
      paymentStatus: "Unpaid",
    };

    // ✅ Online payment: generate Razorpay link
    if (paymentMethod === "Online") {
      try {
        const paymentLink = await razorpay.paymentLink.create({
          amount: Math.round(paidAmount * 100), // paise me bhejna hai
          currency: "INR",
          description: `Payment of ₹${paidAmount} for ${customer.name}`,
          customer: {
            name: customer.name,
            email: customer.email || "test@example.com",
            contact: String(customer.phoneNumber),
          },
          callback_url: `${process.env.FRONTEND_BASE_URL}/orderrequestpaneltwo`,
          callback_method: "get",
        });

        paymentDocData.razorpayLinkId = paymentLink.id;
        paymentDocData.razorpayLinkStatus = paymentLink.status;
        paymentDocData.razorpayLinkUrl = paymentLink.short_url; // ✅ actual clickable link
      } catch (err) {
        console.error("Razorpay error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to create Razorpay link",
          error: err.message,
        });
      }
    }

    // ✅ COD / confirmed payment: allocate paidAmount to orders
    if (paymentMethod === "COD") {
      const isFullyPaid = paidAmount >= finalBalanceAmount;
      const isPartiallyPaid = paidAmount > 0 && paidAmount < finalBalanceAmount;

      let remainingAmount = paidAmount;
      let paidOrders = [];
      let carryForwardUsed = 0;

      if (latestPayment && latestPayment.carryForwardBalance > 0) {
        carryForwardUsed = Math.min(
          latestPayment.carryForwardBalance,
          actualTotalAmount
        );
        remainingAmount += carryForwardUsed;
      }

      for (const order of allOrders) {
        if (remainingAmount <= 0) break;

        let orderPaymentStatus = "Unpaid";
        let orderPaidAmount = 0;

        if (remainingAmount >= order.totalAmount) {
          if (isFullyPaid) {
            orderPaymentStatus = "Paid";
            orderPaidAmount = order.totalAmount;
            remainingAmount -= order.totalAmount;
          } else if (isPartiallyPaid) {
            orderPaymentStatus = "Partially Paid";
            orderPaidAmount = order.totalAmount;
            remainingAmount -= order.totalAmount;
          }

          await CustomerOrders.findByIdAndUpdate(order._id, {
            $set: {
              paymentStatus: orderPaymentStatus,
              paymentMethod,
              paidAmount: orderPaidAmount,
            },
          });

          paymentDocData.paidAmount += orderPaidAmount;
          paidOrders.push(order);
        } else {
          if (remainingAmount > 0) {
            paymentDocData.carryForwardBalance += remainingAmount;
            remainingAmount = 0;
          }
          break;
        }
      }

      if (paidOrders.length > 0) {
        paymentDocData.orderStartDate = paidOrders[0].deliveryDate;
        paymentDocData.orderEndDate =
          paidOrders[paidOrders.length - 1].deliveryDate;
      }

      paymentDocData.balanceAmount =
        finalBalanceAmount - paymentDocData.paidAmount;

      // Set payment status based on overall payment amount (isFullyPaid/isPartiallyPaid)
      if (isFullyPaid) {
        paymentDocData.paymentStatus = "Paid";
      } else if (isPartiallyPaid) {
        paymentDocData.paymentStatus = "Partially Paid";
      } else {
        paymentDocData.paymentStatus = "Unpaid";
      }
    }

    // ✅ Save Payment doc
    const paymentDoc = new Payment(paymentDocData);
    await paymentDoc.save();

    const paymentObj = paymentDoc.toObject();
    delete paymentObj.razorpayLinkUrl;

    // ✅ Update Customer (only for COD payments)
    if (paymentMethod === "COD") {
      customer.amountPaidTillDate += paymentDoc.paidAmount;
      customer.amountDue = actualTotalAmount - customer.amountPaidTillDate;
      customer.paymentStatus =
        customer.amountPaidTillDate < actualTotalAmount
          ? "Partially Paid"
          : "Paid";
      await customer.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      payment: paymentObj,
      ...(paymentMethod === "Online" && {
        paymentUrl: paymentDoc.razorpayLinkUrl,
      }),
    });
  } catch (error) {
    console.error("createPaymentForCustomer Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating payment",
      error: error.message,
    });
  }
};

// ✅ New Verify Payment Code
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_payment_link_id,
      razorpay_payment_link_status,
      customerId, // from query string
    } = req.query;

    if (!razorpay_payment_id || !razorpay_payment_link_id || !customerId) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment verification request",
      });
    }

    // 🔍 Find payment record by link ID
    const paymentDoc = await Payment.findOne({
      customer: customerId,
      razorpayLinkId: razorpay_payment_link_id,
    });

    if (!paymentDoc) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found for this link",
      });
    }

    // ✅ Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    const paidAmount = payment.amount / 100; // paise → INR

    if (!paidAmount || paidAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    // ✅ Allocate paidAmount to orders (oldest first)
    const allOrders = await CustomerOrders.find({
      customer: customerId,
      status: "Delivered",
      paymentStatus: "Unpaid",
    }).sort({ createdAt: 1 });

    // Calculate total unpaid amount
    const totalAmount = allOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );

    const latestPayment = await Payment.findOne({
      customer: customerId,
    }).sort({ createdAt: -1 });

    let finalBalanceAmount = totalAmount;

    if (latestPayment && latestPayment.carryForwardBalance > 0) {
      finalBalanceAmount = totalAmount - latestPayment.carryForwardBalance;
    }

    // Calculate actual total amount from orders (without carryforward adjustment)
    const actualTotalAmount = allOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );

    const isFullyPaid = paidAmount >= finalBalanceAmount;
    const isPartiallyPaid = paidAmount > 0 && paidAmount < finalBalanceAmount;

    let remainingAmount = paidAmount;
    let totalPaidNow = 0;
    let paidOrders = [];
    let carryForwardUsed = 0;

    // First, use any existing carryforward balance
    if (latestPayment && latestPayment.carryForwardBalance > 0) {
      carryForwardUsed = Math.min(
        latestPayment.carryForwardBalance,
        actualTotalAmount
      );
      remainingAmount += carryForwardUsed; // Add carryforward to remaining amount
    }

    for (const order of allOrders) {
      if (remainingAmount <= 0) break;

      let orderPaymentStatus = "Unpaid";
      let orderPaidAmount = 0;

      if (remainingAmount >= order.totalAmount) {
        if (isFullyPaid) {
          orderPaymentStatus = "Paid";
          orderPaidAmount = order.totalAmount;
          remainingAmount -= order.totalAmount;
        } else if (isPartiallyPaid) {
          orderPaymentStatus = "Partially Paid";
          orderPaidAmount = order.totalAmount;
          remainingAmount -= order.totalAmount;
        }

        await CustomerOrders.findByIdAndUpdate(order._id, {
          $set: {
            paymentStatus: orderPaymentStatus,
            paymentMethod: "Online",
            paidAmount: orderPaidAmount,
          },
        });

        totalPaidNow += orderPaidAmount;
        paidOrders.push(order);
      } else {
        if (remainingAmount > 0) {
          paymentDoc.carryForwardBalance += remainingAmount;
          remainingAmount = 0;
        }
        break;
      }
    }

    // ✅ Update Payment document (with validation to prevent over-payment)
    const newPaidAmount = Math.min(
      paymentDoc.paidAmount + totalPaidNow,
      paymentDoc.totalAmount
    );
    paymentDoc.paidAmount = newPaidAmount;
    paymentDoc.balanceAmount = finalBalanceAmount - newPaidAmount;
    paymentDoc.razorpayPaymentId = razorpay_payment_id;
    paymentDoc.razorpayLinkStatus = razorpay_payment_link_status;

    // Update order date range based on actually paid orders
    if (paidOrders.length > 0) {
      paymentDoc.orderStartDate = paidOrders[0].deliveryDate;
      paymentDoc.orderEndDate = paidOrders[paidOrders.length - 1].deliveryDate;
    }

    // Set payment status based on overall payment amount (isFullyPaid/isPartiallyPaid)
    if (isFullyPaid) {
      paymentDoc.paymentStatus = "Paid";
      paymentDoc.balanceAmount = 0;
    } else if (isPartiallyPaid) {
      paymentDoc.paymentStatus = "Partially Paid";
    } else {
      paymentDoc.paymentStatus = "Unpaid";
    }
    await paymentDoc.save();

    // ✅ Update Customer document
    const customer = await Customer.findById(customerId);
    if (customer) {
      customer.amountPaidTillDate += totalPaidNow; // 🔥 increment not overwrite
      customer.amountDue = actualTotalAmount - customer.amountPaidTillDate;
      customer.paymentStatus =
        customer.amountDue > 0 ? "Partially Paid" : "Paid";
      await customer.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      paymentDetails: {
        paidAmount: totalPaidNow,
        totalPaid: paymentDoc.paidAmount,
        balance: paymentDoc.balanceAmount,
        status: paymentDoc.paymentStatus,
      },
      payment: paymentDoc,
    });
  } catch (error) {
    console.error("verifyPayment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.message,
    });
  }
};

//✅ Get All Payments by Payment Status
const getAllPaymentsByStatus = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      paymentStatus = "All",
      paymentMode = "All",
      productName = "",
      productSize = "",
      from = "",
      to = "",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // Validate paymentStatus
    const validStatuses = ["All", "Paid", "Partially Paid", "Unpaid"];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid paymentStatus. Use: All, Paid, Partially Paid, or Unpaid",
      });
    }

    // Validate paymentMode
    const validModes = ["All", "COD", "Online"];
    if (!validModes.includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid paymentMode. Use: All, COD, or Online",
      });
    }

    // ---- Base Filter ----
    const filter = {};
    if (paymentStatus !== "All") {
      filter.paymentStatus = paymentStatus;
    }
    if (paymentMode !== "All") {
      filter.paymentMethod = paymentMode;
    }

    // Handle date filtering
    if (from && to) {
      filter.paidDate = { $gte: from, $lte: to };
    } else if (from) {
      filter.paidDate = { $gte: from };
    } else if (to) {
      filter.paidDate = { $lte: to };
    }

    // ---- Aggregation Pipeline ----
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
      {
        $unwind: {
          path: "$customer.products",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "customer.products.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          customerName: { $first: "$customer.name" },
          phoneNumber: { $first: "$customer.phoneNumber" },
          totalAmount: { $first: "$totalAmount" },
          paidAmount: { $first: "$paidAmount" },
          balanceAmount: { $first: "$balanceAmount" },
          productNames: { $push: "$productInfo.productName" },
          productSizes: { $push: "$customer.products.productSize" },
          paymentStatus: { $first: "$paymentStatus" },
          paymentMethod: { $first: "$paymentMethod" },
          createdAt: { $first: "$createdAt" },
        },
      },
      ...(productName || productSize
        ? [
            {
              $match: {
                ...(productName && {
                  productNames: { $regex: productName, $options: "i" },
                }),
                ...(productSize && {
                  productSizes: { $regex: productSize, $options: "i" },
                }),
              },
            },
          ]
        : []),
      {
        $project: {
          _id: 1,
          customerName: 1,
          phoneNumber: 1,
          totalAmount: 1,
          paidAmount: 1,
          balanceAmount: 1,
          productName: {
            $reduce: {
              input: "$productNames",
              initialValue: "",
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  "$$this",
                  { $concat: ["$$value", ", ", "$$this"] },
                ],
              },
            },
          },
          productSize: {
            $reduce: {
              input: "$productSizes",
              initialValue: "",
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  "$$this",
                  { $concat: ["$$value", ", ", "$$this"] },
                ],
              },
            },
          },
          date: { $dateToString: { format: "%d/%m/%Y", date: "$createdAt" } },
          paymentMode: "$paymentMethod",
          status: "$paymentStatus",
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    // ---- Count Pipeline ----
    const countPipeline = [{ $match: filter }, { $count: "total" }];

    // Execute all queries in parallel
    const [results, countResult, countPartiallyPaid, countPaid, countUnpaid] =
      await Promise.all([
        Payment.aggregate(pipeline),
        Payment.aggregate(countPipeline),
        Payment.countDocuments({ paymentStatus: "Partially Paid" }),
        Payment.countDocuments({ paymentStatus: "Paid" }),
        Payment.countDocuments({ paymentStatus: "Unpaid" }),
      ]);

    const totalRecords = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      message: `Payments fetched successfully`,
      partiallyPaid: countPartiallyPaid,
      paid: countPaid,
      pending: countUnpaid,
      totalRecords,
      totalPages,
      currentPage: page,
      previous: page > 1,
      next: page < totalPages,
      data: results,
    });
  } catch (error) {
    console.error("getAllPaymentsByStatus Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed To Fetch Payments",
      error: error.message,
    });
  }
};

// ✅ Get Only Pending (Unpaid) Payments Count
const getPendingPaymentsCount = async (req, res) => {
  try {
    const pendingCount = await Payment.countDocuments({
      paymentStatus: "Unpaid",
    });

    return res.status(200).json({
      success: true,
      message: "Pending payments count fetched successfully",
      pendingPayments: pendingCount,
    });
  } catch (error) {
    console.error("getPendingPaymentsCount Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending payments count",
      error: error.message,
    });
  }
};

// ✅ Verify Payment for Invoice Creation (Helper function)
const verifyPaymentForInvoice = async (customerId, startDate, endDate) => {
  try {
    // Find a specific payment that matches the date range and customer
    const payment = await Payment.findOne({
      customer: customerId,
      orderStartDate: { $lte: endDate },
      orderEndDate: { $gte: startDate },
      paymentStatus: { $in: ["Paid", "Partially Paid"] },
    });

    if (!payment) {
      return {
        success: false,
        message: "No matching payment found for the specified period",
        verification: null,
      };
    }

    // Get the paid amount from the single payment
    const totalPaidAmount = payment.paidAmount;

    // Get orders for the same period to verify
    const orders = await CustomerOrders.find({
      customer: customerId,
      deliveryDate: { $gte: startDate, $lte: endDate },
      status: "Delivered",
    });

    const totalOrderAmount = orders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );

    // Check if payment amount matches order amount
    const isAmountMatching =
      Math.abs(totalPaidAmount - totalOrderAmount) < 0.01;

    return {
      success: true,
      verification: {
        isAmountMatching,
        totalPaidAmount,
        totalOrderAmount,
        difference: Math.abs(totalPaidAmount - totalOrderAmount),
        ordersFound: orders.length,
        period: { startDate, endDate },
      },
      payment: {
        id: payment._id,
        paidAmount: payment.paidAmount,
        totalAmount: payment.totalAmount,
        paymentStatus: payment.paymentStatus,
        paymentMethod: payment.paymentMethod,
        orderStartDate: payment.orderStartDate,
        orderEndDate: payment.orderEndDate,
        paidDate: payment.paidDate,
      },
    };
  } catch (error) {
    console.error("verifyPaymentForInvoice Error:", error);
    return {
      success: false,
      message: "Error verifying payment for invoice",
      error: error.message,
    };
  }
};

//✅ Get Customer Balance Amount
const getCustomerBalanceAmount = async (req, res) => {
  try {
    const { customerId } = req?.params;

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const allOrders = await CustomerOrders.find({
      customer: customerId,
      status: "Delivered",
      paymentStatus: "Unpaid",
    }).sort({ createdAt: 1 });

    const totalAmount = allOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );

    const latestPayment = await Payment.findOne({
      customer: customerId,
    }).sort({ createdAt: -1 });

    let finalBalanceAmount = totalAmount;

    if (latestPayment && latestPayment.carryForwardBalance > 0) {
      finalBalanceAmount = totalAmount - latestPayment.carryForwardBalance;
    }

    return res.status(200).json({
      success: true,
      message: "Customer remaining balance fetch successfully",
      balanceAmount: finalBalanceAmount,
      totalsOfUnpaidOrders: totalAmount,
      carryForwardBalance: latestPayment?.carryForwardBalance || 0,
    });
  } catch (error) {
    console.log("Error while getting customer remaining balance");
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

//✅ Get All Cash Payments For DeliveryBoy
const getAllCashPaymentsForDeliveryBoy = async (req, res) => {
  try {
    const deliveryBoy = req?.deliveryBoy?._id;

    if (!deliveryBoy) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const today = formatDateToDDMMYYYY(new Date());

    // Fetch all paid/partially paid COD orders (any date)
    const paidOrders = await CustomerOrders.find({
      status: "Delivered",
      paymentMethod: "COD",
      deliveryBoy: deliveryBoy,
      deliveryDate: today,
      paymentStatus: { $in: ["Paid", "Partially Paid"] },
    })
      .populate("customer", "name")
      .populate("deliveryBoy", "name")
      .sort({ deliveryDate: -1 })
      .lean();

    // Fetch today's unpaid COD orders
    const todayUnpaidOrders = await CustomerOrders.find({
      status: "Delivered",
      paymentMethod: "COD",
      deliveryBoy: deliveryBoy,
      deliveryDate: today,
      paymentStatus: "Unpaid",
    })
      .populate("customer", "name")
      .populate("deliveryBoy", "name")
      .sort({ deliveryDate: -1 })
      .lean();

    // ---- Format data for UI ----
    const results = paidOrders.map((order) => {
      let status = "Received";

      return {
        customerId: order.customer?._id,
        customerName: order.customer?.name || "N/A",
        orderId: order?._id,
        orderNumber: order.orderNumber,
        paymentStatus: status,
        deliveryBoy: order.deliveryBoy?.name || "N/A",
        deliveryDate: order.deliveryDate,
        paidAmount: order.totalAmount || 0,
      };
    });

    // ---- Calculate totals ----
    let totalCollected = 0;
    let pendingCollections = 0;
    let customersPaidSet = new Set();

    // Calculate totalCollected from paid/partially paid orders
    paidOrders.forEach((order) => {
      totalCollected += order.totalAmount || 0;
      customersPaidSet.add(order.customer._id.toString());
    });

    // Calculate pendingCollections from today's unpaid orders
    todayUnpaidOrders.forEach((order) => {
      pendingCollections += order.totalAmount || 0;
    });

    return res.status(200).json({
      success: true,
      message: "Cash Payments for Delivery Boy fetched successfully",
      summary: {
        totalCollected,
        pendingCollections,
        customersPaid: customersPaidSet.size,
      },
      totalRecords: paidOrders.length,
      data: results,
    });
  } catch (error) {
    console.error("getAllCashPaymentsForDeliveryBoy Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cash payments",
      error: error.message,
    });
  }
};

module.exports = {
  createPaymentForCustomer,
  verifyPayment,
  getAllPaymentsByStatus,
  getPendingPaymentsCount,
  verifyPaymentForInvoice,
  getCustomerBalanceAmount,
  getAllCashPaymentsForDeliveryBoy,
};
