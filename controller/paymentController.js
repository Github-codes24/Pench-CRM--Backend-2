const Invoice = require("../models/invoiceModel");
const Product = require("../models/productModel");
const Customer = require("../models/customerModel");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors")

// Payment Summary API
// GET /api/v1/payment-summary
// exports.getPaymentSummary = catchAsyncErrors(async (req, res, next) => {
//   const invoices = await Invoice.find()
//     .populate("productId", "productType") // Populate only productType
//     .populate("customer", "name")         // Populate only customer name
//     .sort({ createdAt: -1 });             // Most recent first

//   // Count payment statuses
//   const receivedCount = invoices.filter(inv => inv.paymentStatus === "Paid").length;
//   const pendingCount = invoices.filter(inv => inv.paymentStatus === "Unpaid").length;
//   const partialCount = invoices.filter(inv => inv.paymentStatus === "Partial").length;

//   // Create payment list
//   const paymentList = invoices.map(inv => ({
//     date: inv.createdAt,
//     productType: inv.productId?.productType || "N/A",
//     customerName: inv.customer?.name || "Customer not found",
//     paymentStatus: inv.paymentStatus
//   }));

//   res.status(200).json({
//     success: true,
//     counts: {
//       received: receivedCount,
//       pending: pendingCount,
//       partial: partialCount,
//       total: invoices.length
//     },
//     paymentList
//   });
// });




// controllers/invoiceController.js
exports.getPaymentSummary = catchAsyncErrors(async (req, res, next) => {
  const { paymentMethod } = req.query;

  // Fetch all invoices
  let invoices = await Invoice.find()
    .select("createdAt payment paymentStatus productType customer")
    .populate({
      path: "customer",
      select: "name"
    })
    .sort({ createdAt: -1 });

  // Filter by payment method if specified (e.g., UPI or COD)
  if (paymentMethod) {
    invoices = invoices.filter(inv => inv.payment === paymentMethod);
  }

  // Payment status counts
  const receivedCount = invoices.filter(inv => inv.paymentStatus === "Paid").length;
  const pendingCount = invoices.filter(inv => inv.paymentStatus === "Unpaid").length;
  const partialCount = invoices.filter(inv => inv.paymentStatus === "Partial").length;

  // Prepare payment list
  const paymentList = invoices.map(inv => ({
    _id: inv._id,
    date: inv.createdAt,
    payment: inv.payment,
    productType: inv.productType || "N/A",
    customerName: inv.customer?.name || "N/A",
    paymentStatus: inv.paymentStatus
  }));

  // Send response
  res.status(200).json({
    success: true,
    counts: {
      received: receivedCount,
      pending: pendingCount,
      partial: partialCount,
      total: invoices.length
    },
    paymentList
  });
});


exports.viewPaymentByCustomer = catchAsyncErrors(async (req, res, next) => {
  const customerId = req.params.id;

  const invoices = await Invoice.find({ customer: customerId })
    .populate({
      path: "customer",
      select: "name deliveryBoy",
      populate: {
        path: "deliveryBoy",
        select: "name"
      }
    })
    .populate({
      path: "productId",
      select: "productType image"
    })
    .sort({ createdAt: -1 });

  if (!invoices || invoices.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No invoices found for this customer",
    });
  }

  const paymentDetails = invoices.map(inv => ({
    productType: inv.productId?.productType || inv.productType || "N/A",
    productImage: inv.productId?.image?.[0] || null,
    customerName: inv.customer?.name || "N/A",
    totalAmount: inv.price,
    deliveryBoyName: inv.customer?.deliveryBoy?.name || "N/A",
    invoiceDate: inv.createdAt,
    paymentStatus: inv.paymentStatus,
  }));

  const grandTotal = invoices.reduce((sum, inv) => sum + inv.price, 0);

  res.status(200).json({
    success: true,
    customerId,
    paymentCount: invoices.length,
    data: paymentDetails,
    grandTotal,
  });
});

// controllers/invoiceController.js
exports.getPaymentDetailsById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const invoice = await Invoice.findById(id)
    .populate({
      path: "customer",
      select: "name phoneNumber email deliveryBoy",
      populate: {
        path: "deliveryBoy",
        select: "name phoneNumber"
      }
    })
    .populate({
      path: "productId",
      select: "productType price image"
    });

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  // Build payment details response
  const paymentDetails = {
    invoiceId: invoice.invoiceId,
    productType: invoice.productType || invoice.productId?.productType || "N/A",
    productImage: invoice.productId?.image || [],
    quantity: invoice.productQuantity,
    subscriptionPlan: invoice.subscriptionPlan,
    customerName: invoice.customer?.name || "N/A",
    customerPhone: invoice.customer?.phoneNumber || "N/A",
    deliveryBoyName: invoice.customer?.deliveryBoy?.name || "N/A",
    deliveryBoyPhone: invoice.customer?.deliveryBoy?.phoneNumber || "N/A",
    price: invoice.price,
    paymentMethod: invoice.paymentMode || "N/A",
    razorpayPaymentId : invoice.razorpayPaymentId || "N/A",
    paymentStatus: invoice.paymentStatus,
    invoiceDate: invoice.createdAt,
    status: invoice.status
  };

  // Grand total (currently only price; add taxes if needed)
  const grandTotal = invoice.price;

  res.status(200).json({
    success: true,
    paymentDetails,
    grandTotal,
  });
});

exports.getAllReceivedPayments = catchAsyncErrors(async (req, res, next) => {
  const invoices = await Invoice.find({ paymentStatus: "Paid" })
    .populate({
      path: "customer",
      select: "name phoneNumber deliveryBoy",
      populate: {
        path: "deliveryBoy",
        select: "name"
      }
    })
    .populate({
      path: "productId",
      select: "productType image"
    })
    .sort({ createdAt: -1 });

  if (!invoices.length) {
    return res.status(404).json({
      success: false,
      message: "No paid invoices found",
    });
  }

  const paymentList = invoices.map(inv => ({
    invoiceId: inv.invoiceId,
    productType: inv.productType || inv.productId?.productType || "N/A",
    productImage: inv.productId?.image || [],
    customerName: inv.customer?.name || "N/A",
    deliveryBoyName: inv.customer?.deliveryBoy?.name || "N/A",
    date: inv.createdAt,
    amount: inv.price,
    paymentMode: inv.payment || "N/A",
    paymentStatus: inv.paymentStatus,
  }));

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.price, 0);

  res.status(200).json({
    success: true,
    totalReceivedPayments: invoices.length,
    totalAmount,
    paymentList,
  });
});


exports.viewPaymentDetails = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params; // invoice ID

  const invoice = await Invoice.findById(id)
    .populate({
      path: "customer",
      select: "name"
    });

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  const paymentDetails = {
    customerName: invoice.customer?.name || "N/A",
    invoiceId: invoice.invoiceId,
    date: invoice.createdAt.toLocaleDateString(),
    time: invoice.createdAt.toLocaleTimeString(),
    transactionId: invoice.razorpayPaymentId || "COD",
    modeOfPayment: invoice.payment || "N/A",
    totalAmount: invoice.price,
    paymentStatus: invoice.paymentStatus,
  };

  res.status(200).json({
    success: true,
    data: paymentDetails,
  });
});

exports.getAllPendingPayments = catchAsyncErrors(async (req, res, next) => {
  const pendingInvoices = await Invoice.find({ paymentStatus: "Unpaid" })
    .populate("customer", "name")
    .sort({ createdAt: -1 });

  const data = pendingInvoices.map(inv => ({
    invoiceId: inv.invoiceId,
    customerName: inv.customer?.name || "N/A",
    productType: inv.productType,
    date: inv.createdAt.toLocaleDateString(),
    amount: inv.price,
    paymentMode: inv.payment || "N/A",
    status: inv.paymentStatus
  }));

  res.status(200).json({
    success: true,
    count: pendingInvoices.length,
    data
  });
});


// exports.getAllPartialPayments = catchAsyncErrors(async (req, res, next) => {
//   const partialInvoices = await Invoice.find({ paymentStatus: "Partially Paid" })
//     .populate({
//       path: "customer",
//       select: "name phoneNumber deliveryBoy",
//       populate: {
//         path: "deliveryBoy",
//         select: "name"
//       }
//     })
//     .populate({
//       path: "productId",
//       select: "productType image"
//     })
//     .sort({ createdAt: -1 });

//   if (!partialInvoices.length) {
//     return res.status(404).json({
//       success: false,
//       message: "No partially paid invoices found",
//     });
//   }

//   const paymentList = partialInvoices.map(inv => ({
//     invoiceId: inv.invoiceId,
//     productType: inv.productType || inv.productId?.productType || "N/A",
//     productImage: inv.productId?.image || [],
//     customerName: inv.customer?.name || "N/A",
//     deliveryBoyName: inv.customer?.deliveryBoy?.name || "N/A",
//     date: inv.createdAt,
//     totalAmount: inv.price,
//     paidAmount: inv.paidAmount,
//     dueAmount: inv.dueAmount,
//     paymentMode: inv.payment || "N/A",
//     paymentStatus: inv.paymentStatus,
//     paymentHistory: inv.paymentHistory || []
//   }));

//   const totalReceivedAmount = partialInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
//   const totalDueAmount = partialInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0);

//   res.status(200).json({
//     success: true,
//     totalPartialPayments: partialInvoices.length,
//     totalReceivedAmount,
//     totalDueAmount,
//     paymentList,
//   });
// });

exports.getAllPartialPayments = catchAsyncErrors(async (req, res, next) => {
  const partialInvoices = await Invoice.find({ paymentStatus: "Partial" })
    .populate("customer", "name")
    .sort({ createdAt: -1 });

  const data = partialInvoices.map(inv => ({
    invoiceId: inv.invoiceId,
    customerName: inv.customer?.name || "N/A",
    productType: inv.productType,
    date: inv.createdAt.toLocaleDateString(),
    amount: inv.price,
    amountPaid: inv.amountPaid,
    amountDue: inv.amountDue,
    paymentMode: inv.paymentMode || "N/A",
    status: inv.paymentStatus
  }));

  res.status(200).json({
    success: true,
    count: partialInvoices.length,
    data
  });
});


exports.submitRemainingPayment = catchAsyncErrors(async (req, res, next) => {
  const { invoiceId, additionalAmountPaid } = req.body;

  if (!invoiceId || !additionalAmountPaid) {
    return next(new ErrorHandler("Invoice ID and additional amount are required", 400));
  }

  const invoice = await Invoice.findOne({ invoiceId });

  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  if (invoice.paymentStatus !== "Partial") {
    return next(new ErrorHandler("This invoice is not marked as partial", 400));
  }

  const additionalAmount = Number(additionalAmountPaid);
  if (isNaN(additionalAmount) || additionalAmount <= 0) {
    return next(new ErrorHandler("Invalid additional amount", 400));
  }

  invoice.amountPaid += additionalAmount;
  invoice.amountDue -= additionalAmount;

  if (invoice.amountDue <= 0) {
    invoice.amountDue = 0;
    invoice.paymentStatus = "Paid";
    invoice.partialPayment = false;
  }

  await invoice.save();

  res.status(200).json({
    success: true,
    message: "Remaining payment submitted successfully",
    invoice: {
      invoiceId: invoice.invoiceId,
      totalAmount: invoice.price,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,
      paymentStatus: invoice.paymentStatus
    }
  });
});
