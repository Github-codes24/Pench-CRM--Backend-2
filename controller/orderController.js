const Invoice = require("../models/invoiceModel");
const Customer = require("../models/customerModel");
const DeliveryBoy = require("../models/deliveryBoyModel");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const razorpay = require("../utils/razorpay")
const Notification = require("../models/notificationModel")
exports.getCustomerOrders = catchAsyncErrors(async (req, res, next) => {
  const { customerId } = req.params;

  // ✅ Validate customer existence
  const customer = await Customer.findById(customerId);
  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  // ✅ Fetch all invoices for the customer
  const invoices = await Invoice.find({ customer: customerId }).sort({ invoiceDate: -1 });

  // ✅ Format response
  const orders = invoices.map((inv) => ({
    date: inv.invoiceDate.toDateString(),
    productType: inv.productType,
    quantity: inv.productQuantity,
    price: inv.price / inv.productQuantity,
    totalPrice: parseFloat(inv.price), // optionally calculate if multiple quantities
    paymentStatus: inv.paymentStatus,
    subscriptionPlan: inv.subscriptionPlan,
  }));

  res.status(200).json({
    success: true,
    customer: customer.name,
    ordersCount: orders.length,
    orders,
  });
});


exports.getTotalSales = catchAsyncErrors(async (req, res, next) => {
  const invoices = await Invoice.find().populate("customer", "name");

  if (!invoices || invoices.length === 0) {
    return next(new ErrorHandler("No sales data found", 404));
  }

  const salesData = invoices.map(inv => ({
    customerName: inv.customerName || (inv.customer && inv.customer.name),
    date: inv.invoiceDate.toDateString(),
    productType: inv.productType,
    quantity: inv.productQuantity,
    totalAmount: inv.price,
    paymentMode: inv.paymentMode,
    paymentStatus: inv.paymentStatus
  }));

  const totalSalesAmount = salesData.reduce((acc, curr) => acc + parseFloat(curr.totalAmount || 0), 0);

  res.status(200).json({
    success: true,
    totalRecords: salesData.length,
    totalSalesAmount,
    salesData
  });
});

exports.getCustomerSalesById = catchAsyncErrors(async (req, res, next) => {
  const { customerId } = req.params;

  if (!customerId) {
    return next(new ErrorHandler("Customer ID is required", 400));
  }

  // Check if customer exists
  const customer = await Customer.findById(customerId);
  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  // Find all invoices for this customer
  const invoices = await Invoice.find({ customer: customerId });

  if (!invoices.length) {
    return res.status(200).json({
      success: true,
      message: "No sales records found for this customer",
      salesData: [],
      totalAmount: 0
    });
  }

  const salesData = invoices.map(inv => ({
    customerName: customer.name,
    date: inv.invoiceDate.toDateString(),
    productType: inv.productType,
    quantity: inv.productQuantity,
    totalAmount: inv.price,
    paymentMode: inv.paymentMode,
    paymentStatus: inv.paymentStatus
  }));

  const totalAmount = salesData.reduce((acc, item) => acc + parseFloat(item.totalAmount || 0), 0);

  res.status(200).json({
    success: true,
    customer: customer.name,
    totalOrders: salesData.length,
    totalAmount,
    salesData
  });
});


exports.getPendingPayments = catchAsyncErrors(async (req, res, next) => {
  const unpaidInvoices = await Invoice.find({ paymentStatus: "Unpaid" })
    .populate("customer", "name phoneNumber address");

  if (!unpaidInvoices.length) {
    return res.status(200).json({
      success: true,
      message: "No pending payments found",
      totalPendingAmount: 0,
      pendingPayments: [],
    });
  }

  let totalPendingAmount = 0;

  const pendingPayments = unpaidInvoices.map((invoice) => {
    totalPendingAmount += invoice.price;

    return {
      customerName: invoice.customer?.name || "N/A",
      phoneNumber: invoice.customer?.phoneNumber || "N/A",
      address: invoice.customer?.address || "N/A",
      invoiceDate: invoice.invoiceDate,
      productType: invoice.productType,
      quantity: invoice.productQuantity,
      price: invoice.price,
      subscriptionPlan: invoice.subscriptionPlan,
      paymentMode: invoice.paymentMode,
      paymentStatus: invoice.paymentStatus,
    };
  });

  res.status(200).json({
    success: true,
    totalPending: pendingPayments.length,
    totalPendingAmount,
    pendingPayments,
  });
});


// exports.getMyUnpaidOrders = catchAsyncErrors(async (req, res, next) => {
//   const deliveryBoyId = req.user?._id;

//   if (!deliveryBoyId) {
//     return next(new ErrorHandler("Unauthorized: Delivery boy not logged in", 401));
//   }

//   // Step 1: Find customers assigned to this delivery boy
//   const customers = await Customer.find({ deliveryBoy: deliveryBoyId });

//   if (customers.length === 0) {
//     return res.status(200).json({
//       success: true,
//       message: "No customers assigned to this delivery boy.",
//       orders: [],
//     });
//   }

//   const customerIds = customers.map(c => c._id);

//   // Step 2: Get unpaid invoices for these customers
//   const unpaidInvoices = await Invoice.find({
//     customer: { $in: customerIds },
//     paymentStatus: "Unpaid",
//   }).populate("customer", "name");

//   res.status(200).json({
//     success: true,
//     count: unpaidInvoices.length,
//     orders: unpaidInvoices.map(inv => ({
//       invoiceId: inv.invoiceId,
//       customerName: inv.customer?.name,
//       productType: inv.productType,
//       quantity: inv.productQuantity,
//       price: inv.price,
//       subscriptionPlan: inv.subscriptionPlan,
//       paymentStatus: inv.paymentStatus,
//     })),
//   });
// });

exports.getMyUnpaidOrders = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoyId = req.deliveryBoy?._id || req.deliveryBoy;

  if (!deliveryBoyId) {
    return next(new ErrorHandler("Delivery boy not authenticated", 401));
  }

  // Step 1: Get customers assigned to delivery boy
  const customers = await Customer.find({ deliveryBoy: deliveryBoyId }).select("_id");

  if (customers.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No customers assigned to this delivery boy",
      invoices: [],
    });
  }

  const customerIds = customers.map((c) => c._id);

  // Step 2: Get pending orders
  const pendingInvoices = await Invoice.find({
    customer: { $in: customerIds },
    status: "Pending",
  })
    .populate("customer", "name phoneNumber address")
    .populate("productId", "productType description price image");

  res.status(200).json({
    success: true,
    count: pendingInvoices.length,
    invoices: pendingInvoices,
  });
});
exports.getMyAcceptedOrders = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoyId = req.deliveryBoy?._id || req.deliveryBoy;

  if (!deliveryBoyId) {
    return next(new ErrorHandler("Delivery boy not authenticated", 401));
  }

  // ✅ Step 1: Get customers assigned to delivery boy
  const customers = await Customer.find({ deliveryBoy: deliveryBoyId }).select("_id");

  if (customers.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No customers assigned to this delivery boy",
      invoices: [],
    });
  }

  const customerIds = customers.map((c) => c._id);

  // ✅ Step 2: Get accepted invoices
  const acceptedInvoices = await Invoice.find({
    customer: { $in: customerIds },
    status: "Accepted", // <- here’s the key change
  })
    .populate("customer", "name phoneNumber address")
    .populate("productId", "productType description price image");

  res.status(200).json({
    success: true,
    count: acceptedInvoices.length,
    invoices: acceptedInvoices,
  });
});



// Accept an order by invoice ID
exports.acceptOrder = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid invoice ID", 400));
  }

  const invoice = await Invoice.findById(id);
  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  if (invoice.status === "Accepted" || invoice.status === "Delivered") {
    return next(new ErrorHandler(`Invoice is already ${invoice.status}`, 400));
  }

  invoice.status = "Accepted";
  await invoice.save();

  res.status(200).json({
    success: true,
    message: "Invoice accepted successfully",
    _id: invoice._id,
    invoice,
  });
});



// exports.acceptInvoiceAndPay = catchAsyncErrors(async (req, res, next) => {
//   const { id } = req.params;
//   const { payment } = req.body;

//   if (!payment || !["UPI", "COD"].includes(payment)) {
//     return next(new ErrorHandler("Invalid payment mode. Use 'UPI' or 'COD'", 400));
//   }

//   const invoice = await Invoice.findById(id);
//   if (!invoice) {
//     return next(new ErrorHandler("Invoice not found", 404));
//   }

//   if (invoice.status === "Accepted" || invoice.status === "Delivered") {
//     return next(new ErrorHandler("Invoice is already accepted or completed", 400));
//   }

//   invoice.status = "Accepted";
//   invoice.payment = payment;

//   if (payment === "UPI") {
//     // Create a Razorpay order
//     const razorpayOrder = await Razorpay.orders.create({
//       amount: invoice.price * 100, // Razorpay takes amount in paise
//       currency: "INR",
//       receipt: invoice._id.toString(),
//       payment_capture: 1,
//     });

//     invoice.paymentLink = `https://checkout.razorpay.com/v1/checkout.js?order_id=${razorpayOrder.id}`;
//     await invoice.save();

//     return res.status(200).json({
//       success: true,
//       message: "Invoice accepted, UPI payment link generated",
//       invoiceId: invoice._id,
//       paymentLink: invoice.paymentLink,
//     });
//   }

//   await invoice.save();

//   res.status(200).json({
//     success: true,
//     message: "Invoice accepted with COD",
//     invoiceId: invoice._id,
//     invoice,
//   });
// });

exports.acceptInvoiceAndPayfri = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { payment } = req.body;

  if (!["UPI", "COD"].includes(payment)) {
    return next(new ErrorHandler("Invalid payment method", 400));
  }

  const invoice = await Invoice.findById(id).populate("customer");
  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  if (invoice.status !== "Accepted") {
    return next(new ErrorHandler("Invoice must be accepted before payment", 400));
  }

  if (invoice.paymentStatus === "Paid") {
    return res.status(200).json({
      success: true,
      message: "Invoice already paid",
      invoice,
    });
  }

  invoice.payment = payment;

  if (payment === "UPI") {
    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(invoice.price * 100),
      currency: "INR",
      accept_partial: false,
      description: `Invoice #${invoice.invoiceId}`,
      customer: {
        name: invoice.customerName,
        contact: invoice.customer.phoneNumber?.toString(),
        email: invoice.customer.email || "",
      },
      notify: {
        sms: true,
        email: true,
      },
      notes: {
        "Invoice ID": invoice.invoiceId,
      },
      callback_url: `http://localhost:5000/api/v1/verify-payment`,
      callback_method: "get",
    });

    invoice.paymentLink = paymentLink.short_url;
    invoice.paymentLinkId = paymentLink.id; // ✅ this line is important
    invoice.paymentStatus = "Unpaid";
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Payment link generated. Awaiting payment.",
      paymentUrl: paymentLink.short_url,
      invoiceId: invoice.invoiceId,
    });
  }

  // COD logic
  invoice.paymentStatus = "Paid";
  invoice.status = "Delivered";
  await invoice.save();

  res.status(200).json({
    success: true,
    message: "Invoice marked paid and delivered via COD",
    invoice,
  });
});

exports.acceptInvoiceAndPaysat = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { payment } = req.body;

  if (!["UPI", "COD"].includes(payment)) {
    return next(new ErrorHandler("Invalid payment method", 400));
  }

  const invoice = await Invoice.findById(id).populate("customer");
  if (!invoice) return next(new ErrorHandler("Invoice not found", 404));

  if (invoice.status !== "Accepted") {
    return next(new ErrorHandler("Invoice must be accepted before payment", 400));
  }

  invoice.payment = payment;

  const totalAmount = invoice.price;
  const amountPaid = invoice.amountPaid || 0;
  const amountDue = totalAmount - amountPaid;

  // ✅ Case 1: Already paid fully
  if (amountDue <= 0 && invoice.paymentStatus === "Paid") {
    invoice.status = "Delivered";
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Invoice already paid, marked as delivered via COD",
      invoice,
    });
  }

  // ✅ Case 2: Payment is still Unpaid and COD selected — just mark as Delivered, leave paymentStatus
  if (payment === "COD" && invoice.paymentStatus === "Unpaid") {
    invoice.status = "Delivered";
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Invoice marked as delivered via COD (payment still unpaid)",
      invoice,
    });
  }

  // ✅ Case 3: UPI flow — create payment link for remaining due
  if (payment === "UPI") {
    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(amountDue * 100),
      currency: "INR",
      accept_partial: false,
      description: `Invoice #${invoice.invoiceId}`,
      customer: {
        name: invoice.customerName,
        contact: invoice.customer.phoneNumber?.toString(),
        email: invoice.customer.email || "",
      },
      notify: {
        sms: true,
        email: true,
      },
      notes: {
        "Invoice ID": invoice.invoiceId,
      },
      callback_url: `http://localhost:5000/api/v1/verify-payment`,
      callback_method: "get",
    });

    invoice.paymentLink = paymentLink.short_url;
    invoice.paymentLinkId = paymentLink.id;
    invoice.amountDue = amountDue;
    invoice.paymentStatus = "Partial";
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Payment link generated for pending amount",
      paymentUrl: paymentLink.short_url,
      amountDue,
      invoiceId: invoice.invoiceId,
    });
  }

  // ✅ Case 4: COD for partial paid — collect remaining and complete
  invoice.amountPaid = totalAmount;
  invoice.amountDue = 0;
  invoice.paymentStatus = "Paid";
  invoice.status = "Delivered";
  await invoice.save();

  return res.status(200).json({
    success: true,
    message: "Remaining amount collected via COD. Marked as paid and delivered.",
    invoice,
  });
});
exports.acceptInvoiceAndPay = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { payment, wantToPay } = req.body;

  if (!["UPI", "COD"].includes(payment)) {
    return next(new ErrorHandler("Invalid payment method", 400));
  }

  const invoice = await Invoice.findById(id).populate("customer");
  if (!invoice) return next(new ErrorHandler("Invoice not found", 404));
  if (invoice.status !== "Accepted") {
    return next(new ErrorHandler("Invoice must be accepted before payment", 400));
  }

  invoice.payment = payment;

  const totalAmount = invoice.price;
  const amountPaid = invoice.amountPaid || 0;
  const amountDue = totalAmount - amountPaid;

  // ✅ CASE 1: Already Paid
  if (amountDue <= 0 && invoice.paymentStatus === "Paid") {
    invoice.status = "Delivered";
    await invoice.save();
    return res.status(200).json({
      success: true,
      message: "Invoice already paid, marked as delivered",
      invoice
    });
  }

  // ✅ CASE 2: Customer Does NOT Want to Pay
  if (wantToPay === false) {
    invoice.status = "Delivered";
    await invoice.save();
    return res.status(200).json({
      success: true,
      message: "Marked as delivered without payment. Payment status remains.",
      invoice
    });
  }

  // ✅ CASE 3: UPI Payment
  if (payment === "UPI") {
    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(amountDue * 100),
      currency: "INR",
      accept_partial: false,
      description: `Invoice #${invoice.invoiceId}`,
      customer: {
        name: invoice.customerName,
        contact: invoice.customer.phoneNumber?.toString(),
        email: invoice.customer.email || "",
      },
      notify: {
        sms: true,
        email: true,
      },
      notes: {
        "Invoice ID": invoice.invoiceId,
      },
      callback_url: `http://localhost:5000/api/v1/verify-payment`,
      callback_method: "get",
    });

    invoice.paymentLink = paymentLink.short_url;
    invoice.paymentLinkId = paymentLink.id;
    invoice.amountDue = amountDue;
    invoice.paymentStatus = "Partial";
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Payment link generated for remaining amount",
      paymentUrl: paymentLink.short_url,
      amountDue,
      invoiceId: invoice.invoiceId,
    });
  }

  // ✅ CASE 4: COD — Collect remaining and notify
  invoice.amountPaid = totalAmount;
  invoice.amountDue = 0;
  invoice.paymentStatus = "Paid";
  invoice.status = "Delivered";
  await invoice.save();

  // ✅ Notification: Send cash collection info
  const customerName = invoice.customer?.name || "Unknown";
  const deliveryBoyId = invoice.customer?.deliveryBoy;

  if (deliveryBoyId) {
    await Notification.create({
      deliveryBoy: deliveryBoyId,
      message: `COD Payment of ₹${totalAmount} collected from ${customerName} for Invoice ${invoice.invoiceId}.`,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Remaining amount collected via COD. Invoice delivered.",
    invoice,
  });
});



exports.getAdminNotifications = catchAsyncErrors(async (req, res, next) => {
  const notifications = await Notification.find({ admin: null }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: notifications.length,
    notifications
  });
});


exports.verifyInvoicePayment = catchAsyncErrors(async (req, res, next) => {
  const {
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_payment_link_status,
  } = req.query;

  if (!razorpay_payment_id || !razorpay_payment_link_id || !razorpay_payment_link_status) {
    return next(new ErrorHandler("Missing Razorpay verification details", 400));
  }

  const invoice = await Invoice.findOne({
    paymentLinkId: razorpay_payment_link_id, // ✅ match on correct field
  });

  if (!invoice) {
    return next(new ErrorHandler("Invoice not found for this payment", 404));
  }

  if (invoice.paymentStatus === "Paid") {
    return res.status(200).json({
      success: true,
      message: "Invoice already marked as Paid",
      invoiceId: invoice.invoiceId,
      paymentId: razorpay_payment_id,
    });
  }

  if (razorpay_payment_link_status === "paid") {
    invoice.paymentStatus = "Paid";
    invoice.status = "Delivered";
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified and invoice marked Delivered",
      invoiceId: invoice.invoiceId,
      paymentId: razorpay_payment_id,
    });
  }

  return res.status(400).json({ message: "Payment not completed yet." });
});


// controller/invoiceController.js

// exports.getBottleReturnSummary = catchAsyncErrors(async (req, res, next) => {
//   // Fetch all delivered invoices
//   const invoices = await Invoice.find({ status: "Delivered" });

//   let totalPickupQuantity = 0;
//   let bottleSummary = {
//     "1L": 0,
//     "2L": 0,
//     others: 0
//   };

//   invoices.forEach(invoice => {
//     const quantityStr = invoice.productQuantity; // e.g., "1L", "2L"
//     const quantityLiters = parseFloat(quantityStr); // convert "1L" -> 1

//     // Add to total pickup quantity
//     totalPickupQuantity += quantityLiters;

//     // Track bottle return by size
//     if (quantityStr === "1L") {
//       bottleSummary["1L"] += invoice.bottleReturned || 0;
//     } else if (quantityStr === "2L") {
//       bottleSummary["2L"] += invoice.bottleReturned || 0;
//     } else {
//       bottleSummary.others += invoice.bottleReturned || 0;
//     }
//   });

//   return res.status(200).json({
//     success: true,
//     message: "Bottle return summary fetched",
//     totalPickupQuantityInLiters: totalPickupQuantity,
//     bottleReturns: bottleSummary
//   });
// });



// controllers/invoiceController.js
// productquantity basis return bottle count 
exports.getBottleReturnSummaryold = catchAsyncErrors(async (req, res, next) => {
  const invoices = await Invoice.find({ status: "Delivered" });

  const summary = {
    totalDeliveredOrders: invoices.length,
    pickup: { "1L": 0, "2L": 0 },
    bottleReturns: { "1L": 0, "2L": 0 },
    totalBottleReturns: 0,
    bottleReturnedYesNoCount: 0
  };

  invoices.forEach(invoice => {
    const quantity = Number(invoice.productQuantity);  // Ensure number
    const returned = Number(invoice.bottleReturned || 0);  // default to 0
    const hasReturned = invoice.bottleReturnedYesNo === true;

    // Count pickup by quantity
    if (quantity === 1) summary.pickup["1L"] += 1;
    else if (quantity === 2) summary.pickup["2L"] += 1;

    // Add returned bottles by quantity
    if (quantity === 1) summary.bottleReturns["1L"] += returned;
    else if (quantity === 2) summary.bottleReturns["2L"] += returned;

    summary.totalBottleReturns += returned;

    if (hasReturned) summary.bottleReturnedYesNoCount += 1;
  });

  res.status(200).json({
    success: true,
    message: "Bottle return summary fetched successfully",
    ...summary
  });
});
exports.getBottleReturnSummaryfri = catchAsyncErrors(async (req, res, next) => {
  const invoices = await Invoice.find({ status: "Delivered" });

  const summary = {
    totalDeliveredOrders: invoices.length,
    pickup: { "1L": 0, "2L": 0 },
    bottleReturns: { "1L": 0, "2L": 0 },
    totalBottleReturns: 0,
    bottleReturnedYesNoCount: 0
  };

  invoices.forEach(invoice => {
    const qty = invoice.productQuantity?.toString().trim();
    const hasReturned = invoice.bottleReturnedYesNo === true;

    // Count pickups
    if (qty === "1L" || qty === "1") {
      summary.pickup["1L"] += 1;
      if (hasReturned) {
        summary.bottleReturns["1L"] += 1;
      }
    } else if (qty === "2L" || qty === "2") {
      summary.pickup["2L"] += 1;
      if (hasReturned) {
        summary.bottleReturns["2L"] += 1;
      }
    }

    if (hasReturned) {
      summary.totalBottleReturns += 1;
      summary.bottleReturnedYesNoCount += 1;
    }
  });

  res.status(200).json({
    success: true,
    message: "Bottle return summary fetched successfully",
    ...summary
  });
});

exports.getBottleReturnSummary = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoyId = req.deliveryBoy && req.deliveryBoy._id;

  // ✅ Fetch only 'Delivered' invoices and populate customer to get deliveryBoy
  const invoices = await Invoice.find({ status: "Delivered" }).populate("customer");

  const summary = {
    totalDeliveredOrders: 0,
    pickup: { "1L": 0, "0.5L": 0 },
    bottleReturns: { "1L": 0, "0.5L": 0 },
    totalBottleReturns: 0,
    bottleReturnedYesNoCount: 0
  };

  invoices.forEach(invoice => {
    if (
      invoice.customer &&
      invoice.customer.deliveryBoy &&
      invoice.customer.deliveryBoy.toString() === deliveryBoyId.toString()
    ) {
      summary.totalDeliveredOrders += 1;

      const qty = invoice.productQuantity?.toString().trim();
      const hasReturned = invoice.bottleReturnedYesNo === true;

      if (qty === "1L" || qty === "1") {
        summary.pickup["1L"] += 1;
        if (hasReturned) summary.bottleReturns["1L"] += 1;
      } else if (qty === "0.5L" || qty === "0.5" || qty === "500ml") {
        summary.pickup["0.5L"] += 1;
        if (hasReturned) summary.bottleReturns["0.5L"] += 1;
      }

      if (hasReturned) {
        summary.totalBottleReturns += 1;
        summary.bottleReturnedYesNoCount += 1;
      }
    }
  });

  res.status(200).json({
    success: true,
    message: "Bottle return summary fetched successfully",
    ...summary
  });
});





// controller/invoiceController.js

// exports.getAllInvoicesWithSummary = catchAsyncErrors(async (req, res, next) => {
//   const invoices = await Invoice.find().populate("customer");

//   // Summary counts
//   const summary = {
//     totalInvoices: invoices.length,
//     totalPaid: 0,
//     totalUnpaid: 0,
//     totalPending: 0,
//     totalDelivered: 0
//   };

//   invoices.forEach(invoice => {
//     if (invoice.paymentStatus === "Paid") summary.totalPaid += 1;
//     if (invoice.paymentStatus === "Unpaid") summary.totalUnpaid += 1;
//     if (invoice.status === "Pending") summary.totalPending += 1;
//     if (invoice.status === "Delivered") summary.totalDelivered += 1;
//   });

//   res.status(200).json({
//     success: true,
//     message: "All invoices fetched successfully",
//     summary,
//     invoices
//   });
// });


// exports.getAllInvoicesWithSummary = catchAsyncErrors(async (req, res, next) => {
//   const invoices = await Invoice.find().populate("customer");

//   // Summary
//   const summary = {
//     totalInvoices: invoices.length,
//     totalPaid: 0,
//     totalUnpaid: 0,
//     totalPending: 0,
//     totalDelivered: 0,
//     totalBottleReturned: 0,
//     totalBottleIssued: 0
//   };

//   invoices.forEach((invoice) => {
//     if (invoice.paymentStatus === "Paid") summary.totalPaid += 1;
//     if (invoice.paymentStatus === "Unpaid") summary.totalUnpaid += 1;
//     if (invoice.status === "Pending") summary.totalPending += 1;
//     if (invoice.status === "Delivered") summary.totalDelivered += 1;
//     if (invoice.bottleReturnedYesNo) summary.totalBottleReturned += 1;
//     if (invoice.bottleIssued) summary.totalBottleIssued += 1;
//   });

//   res.status(200).json({
//     success: true,
//     message: "All invoices fetched with summary",
//     summary,
//     invoices
//   });
// });

exports.getAllInvoicesWithSummary = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoyId = req.deliveryBoy && req.deliveryBoy._id;

  const allInvoices = await Invoice.find().populate("customer");

  // ✅ Filter invoices for this delivery boy
  const invoices = allInvoices.filter(invoice => {
    return (
      invoice.customer &&
      invoice.customer.deliveryBoy &&
      invoice.customer.deliveryBoy.toString() === deliveryBoyId.toString()
    );
  });

  // Summary
  const summary = {
    totalInvoices: invoices.length,
    totalPaid: 0,
    totalUnpaid: 0,
    totalPending: 0,
    totalDelivered: 0,
    totalBottleReturned: 0,
    totalBottleIssued: 0
  };

  invoices.forEach((invoice) => {
    if (invoice.paymentStatus === "Paid") summary.totalPaid += 1;
    if (invoice.paymentStatus === "Unpaid") summary.totalUnpaid += 1;
    if (invoice.status === "Pending") summary.totalPending += 1;
    if (invoice.status === "Delivered") summary.totalDelivered += 1;
    if (invoice.bottleReturnedYesNo) summary.totalBottleReturned += 1;
    if (invoice.bottleIssued) summary.totalBottleIssued += 1;
  });

  res.status(200).json({
    success: true,
    message: "All invoices fetched with summary",
    summary,
    invoices
  });
});

// Get all pending invoices
// exports.getAllPendingInvoices = catchAsyncErrors(async (req, res, next) => {
//   const pendingInvoices = await Invoice.find({ status: "Pending" }).populate("customer");

//   res.status(200).json({
//     success: true,
//     count: pendingInvoices.length,
//     invoices: pendingInvoices,
//   });
// });
exports.getAllPendingInvoices = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoyId = req.deliveryBoy && req.deliveryBoy._id;

  // ✅ Get all pending invoices and populate customer to access deliveryBoy
  const allPendingInvoices = await Invoice.find({ status: "Pending" }).populate("customer");

  // ✅ Filter by deliveryBoy assigned to the customer
  const pendingInvoices = allPendingInvoices.filter(invoice =>
    invoice.customer &&
    invoice.customer.deliveryBoy &&
    invoice.customer.deliveryBoy.toString() === deliveryBoyId.toString()
  );

  res.status(200).json({
    success: true,
    count: pendingInvoices.length,
    invoices: pendingInvoices,
  });
});

// Get all delivered invoices
// exports.getAllDeliveredInvoices = catchAsyncErrors(async (req, res, next) => {
//   const deliveredInvoices = await Invoice.find({ status: "Delivered" }).populate("customer");

//   res.status(200).json({
//     success: true,
//     count: deliveredInvoices.length,
//     invoices: deliveredInvoices,
//   });
// });
exports.getAllDeliveredInvoices = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoyId = req.deliveryBoy && req.deliveryBoy._id;

  // ✅ Get all delivered invoices and populate customer
  const allDeliveredInvoices = await Invoice.find({ status: "Delivered" }).populate("customer");

  // ✅ Filter by deliveryBoy assigned to customer
  const deliveredInvoices = allDeliveredInvoices.filter(invoice =>
    invoice.customer &&
    invoice.customer.deliveryBoy &&
    invoice.customer.deliveryBoy.toString() === deliveryBoyId.toString()
  );

  res.status(200).json({
    success: true,
    count: deliveredInvoices.length,
    invoices: deliveredInvoices,
  });
});


// controllers/invoiceController.js
exports.updateBottleReturnOrDelivery = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { bottleReturnedYesNo, isDelivered } = req.body;

  const invoice = await Invoice.findById(id);
  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  // Update bottle return yes/no and auto update returned quantity
  if (typeof bottleReturnedYesNo === "boolean") {
    invoice.bottleReturnedYesNo = bottleReturnedYesNo;

    if (bottleReturnedYesNo === true) {
      const qty = Number(invoice.productQuantity);
      if (!isNaN(qty)) {
        invoice.bottleReturned = qty;
      }
    } else {
      invoice.bottleReturned = 0;
    }
  }

  // Update delivery status
  if (typeof isDelivered === "boolean") {
    invoice.isDelivered = isDelivered;

    // Optional: set status to Delivered
    if (isDelivered) {
      invoice.status = "Delivered";
    }
  }

  await invoice.save();

  res.status(200).json({
    success: true,
    message: "Invoice updated successfully",
    invoice,
  });
});



// exports.getAllOrderHistory = catchAsyncErrors(async (req, res, next) => {
//   const invoices = await Invoice.find()
//     .populate("customer", "name address")
//     .populate("productId", "image") // Ensure your product model has 'image' field
//     .sort({ createdAt: -1 }); // Latest orders first

//   const orderHistory = invoices.map(inv => ({
//     customerName: inv.customer?.name || "N/A",
//     address: inv.customer?.address || "N/A",
//     productType: inv.productType,
//     productImage: inv.productId?.image || null,
//     price: inv.price,
//     bottleReturned: inv.bottleReturnedYesNo === true,
//     isDelivered: inv.isDelivered,
//     status: inv.status
//   }));

//   res.status(200).json({
//     success: true,
//     message: "Order history fetched successfully",
//     total: orderHistory.length,
//     orders: orderHistory
//   });
// });

// API: Get Order History for Authenticated Delivery Boy
exports.getAllOrderHistorysat = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoyId = req.deliveryBoy?._id;

  if (!deliveryBoyId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login as delivery boy."
    });
  }

  // Step 1: Get delivery boy details
  const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
  if (!deliveryBoy || deliveryBoy.assignedCustomers.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No customers assigned to this delivery boy.",
      summary: {
        totalOrders: 0,
        totalDelivered: 0,
        totalPending: 0,
        totalAccepted: 0,
        totalBottleReturnedYes: 0,
        totalBottleReturnedNo: 0
      },
      orders: []
    });
  }

  const assignedCustomerIds = deliveryBoy.assignedCustomers.map(id =>
    new mongoose.Types.ObjectId(id)
  );

  // Step 2: Fetch all relevant invoices
  const invoices = await Invoice.find({
    customer: { $in: assignedCustomerIds }
  }).populate("customer", "name address");

  // Step 3: Summary counters
  const summary = {
    totalOrders: invoices.length,
    totalDelivered: 0,
    totalPending: 0,
    totalAccepted: 0,
    totalBottleReturnedYes: 0,
    totalBottleReturnedNo: 0
  };

  const orderHistory = invoices.map(inv => {
    const isReturned = inv.bottleReturnedYesNo === true;

    if (inv.status === "Delivered") summary.totalDelivered += 1;
    if (inv.status === "Pending") summary.totalPending += 1;
    if (inv.status === "Accepted") summary.totalAccepted += 1;
    if (isReturned) summary.totalBottleReturnedYes += 1;
    else summary.totalBottleReturnedNo += 1;

    return {
      customerName: inv.customer?.name || "N/A",
      address: inv.customer?.address || "N/A",
      productImage: inv.image,
      productType: inv.productType,
      amount: inv.price,
      bottleReturned: isReturned ? "Yes" : "No",
      isDelivered: inv.isDelivered,
      status: inv.status,
      date: inv.createdAt
    };
  });

  // Step 4: Return response
  res.status(200).json({
    success: true,
    message: "Order history with summary fetched successfully",
    summary,
    orders: orderHistory
  });
});
exports.getAllOrderHistory = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoyId = req.deliveryBoy?._id;

  if (!deliveryBoyId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login as delivery boy."
    });
  }

  // Step 1: Get delivery boy details
  const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
  if (!deliveryBoy || deliveryBoy.assignedCustomers.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No customers assigned to this delivery boy.",
      summary: {
        totalOrders: 0,
        totalDelivered: 0,
        totalPending: 0,
        totalAccepted: 0,
        totalBottleReturnedYes: 0,
        totalBottleReturnedNo: 0
      },
      orders: []
    });
  }

  const assignedCustomerIds = deliveryBoy.assignedCustomers.map(id =>
    new mongoose.Types.ObjectId(id)
  );

  // Step 2: Fetch all relevant invoices with populated customer and product info
  const invoices = await Invoice.find({
    customer: { $in: assignedCustomerIds }
  })
    .populate("customer", "name address")
    .populate("productId", "image productType");

  // Step 3: Summary counters
  const summary = {
    totalOrders: invoices.length,
    totalDelivered: 0,
    totalPending: 0,
    totalAccepted: 0,
    totalBottleReturnedYes: 0,
    totalBottleReturnedNo: 0
  };

  const orderHistory = invoices.map(inv => {
    const isReturned = inv.bottleReturnedYesNo === true;

    if (inv.status === "Delivered") summary.totalDelivered += 1;
    if (inv.status === "Pending") summary.totalPending += 1;
    if (inv.status === "Accepted") summary.totalAccepted += 1;
    if (isReturned) summary.totalBottleReturnedYes += 1;
    else summary.totalBottleReturnedNo += 1;

    return {
      customerName: inv.customer?.name || "N/A",
      address: inv.customer?.address || "N/A",
      productType: inv.productType,
      productImage: inv.productId?.image?.[0] || null,  // Use first image if available
      amount: inv.price,
      bottleReturned: isReturned ? "Yes" : "No",
      isDelivered: inv.isDelivered,
      status: inv.status,
      date: inv.createdAt
    };
  });

  // Step 4: Return response
  res.status(200).json({
    success: true,
    message: "Order history with summary fetched successfully",
    summary,
    orders: orderHistory
  });
});




exports.getPendingOrders = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoyId = req.deliveryBoy?._id;

  if (!deliveryBoyId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login as delivery boy."
    });
  }

  // Step 1: Fetch delivery boy details and assigned customers
  const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
  if (!deliveryBoy || deliveryBoy.assignedCustomers.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No customers assigned to this delivery boy.",
      pendingOrders: []
    });
  }

  const assignedCustomerIds = deliveryBoy.assignedCustomers.map(id =>
    new mongoose.Types.ObjectId(id)
  );

  // Step 2: Fetch all "Pending" invoices
  const pendingOrders = await Invoice.find({
    status: "Pending",
    customer: { $in: assignedCustomerIds }
  }).populate("customer", "name address")
    .populate("productId", "image productType");


  // Step 3: Map response
  const result = pendingOrders.map(order => ({
    customerName: order.customer?.name || "N/A",
    address: order.customer?.address || "N/A",
    productType: order.productType,
    productImage: inv.productId?.image?.[0] || null,  // Use first image if available
    productQuantity: order.productQuantity,
    amount: order.price,
    bottleReturned: order.bottleReturnedYesNo ? "Yes" : "No",
    isDelivered: order.isDelivered,
    status: order.status,
    date: order.createdAt
  }));

  res.status(200).json({
    success: true,
    message: "Pending orders fetched successfully",
    count: result.length,
    orders: result
  });
});

exports.getDeliveredOrders = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoyId = req.deliveryBoy?._id;

  if (!deliveryBoyId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login as delivery boy."
    });
  }

  // Step 1: Get the delivery boy's assigned customers
  const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
  if (!deliveryBoy || deliveryBoy.assignedCustomers.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No customers assigned to this delivery boy.",
      deliveredOrders: []
    });
  }

  const assignedCustomerIds = deliveryBoy.assignedCustomers.map(id =>
    new mongoose.Types.ObjectId(id)
  );

  // Step 2: Get all Delivered invoices for these customers
  const deliveredOrders = await Invoice.find({
    status: "Delivered",
    customer: { $in: assignedCustomerIds }
  }).populate("customer", "name address")
    .populate("productId", "image productType");

  // Step 3: Format response
  const result = deliveredOrders.map(order => ({
    customerName: order.customer?.name || "N/A",
    address: order.customer?.address || "N/A",
    productType: order.productType,
    productImage: inv.productId?.image?.[0] || null,  // Use first image if available
    productQuantity: order.productQuantity,
    amount: order.price,
    bottleReturned: order.bottleReturnedYesNo ? "Yes" : "No",
    isDelivered: order.isDelivered,
    status: order.status,
    date: order.createdAt
  }));

  res.status(200).json({
    success: true,
    message: "Delivered orders fetched successfully",
    count: result.length,
    orders: result
  });
});