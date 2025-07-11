const Invoice = require("../models/invoiceModel")
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

exports.getDeliveryManagement = catchAsyncErrors(async (req, res, next) => {
  const invoices = await Invoice.find()
    .populate({
      path: "customer",
      select: "name deliveryBoy",
      populate: {
        path: "deliveryBoy",
        select: "name"
      }
    })
    .sort({ createdAt: -1 });

  const result = invoices.map(inv => ({
    deliveryBoyName: inv.customer?.deliveryBoy?.name || "Not Assigned",
    customerName: inv.customer?.name || "Unknown",
    productType: inv.productType || "N/A",
    productQuantity: inv.productQuantity,
    status: inv.status,
    paymentMode: inv.payment || "N/A",
    bottleReturned: inv.bottleReturned || 0
  }));

  res.status(200).json({
    success: true,
    count: result.length,
    data: result
  });
});

// exports.getDeliveryDetails = catchAsyncErrors(async (req, res, next) => {
//   const { id } = req.params; // invoice ID

//   const invoice = await Invoice.findById(id)
//     .populate({
//       path: "customer",
//       select: "name phoneNumber address deliveryBoy",
//       populate: {
//         path: "deliveryBoy",
//         select: "name phoneNumber"
//       }
//     });

//   if (!invoice) {
//     return res.status(404).json({
//       success: false,
//       message: "Invoice not found",
//     });
//   }

//   const deliveryBoy = invoice.customer?.deliveryBoy;
//   const customer = invoice.customer;

//   const response = {
//     deliveryBoyDetails: {
//       name: deliveryBoy?.name || "Not Assigned",
//       phoneNumber: deliveryBoy?.phoneNumber || "N/A",
//     },
//     customerDetails: {
//       name: customer?.name || "N/A",
//       phoneNumber: customer?.phoneNumber || "N/A",
//       address: customer?.address || "N/A",
//     },
//     deliveryDetails: {
//       productType: invoice.productType,
//       productQuantity: invoice.productQuantity,
//       status: invoice.status,
//     },
//     bottleTracking: {
//       bottleIssued: invoice.productQuantity ? "Yes" : "No",
//       bottleReturned: invoice.bottleReturned > 0 ? "Yes" : "No",
//     },
//     paymentInformation: {
//       amount: invoice.price,
//       paymentMode: invoice.payment || "N/A",
//       paymentStatus: invoice.paymentStatus,
//     },
//   };

//   res.status(200).json({
//     success: true,
//     invoiceId: invoice.invoiceId,
//     data: response,
//   });
// });

// controllers/invoiceController.js
exports.getDeliveryDetails = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params; // Invoice ID

  const invoice = await Invoice.findById(id)
    .populate({
      path: "customer",
      select: "name phoneNumber address deliveryBoy",
      populate: {
        path: "deliveryBoy",
        select: "name phoneNumber"
      }
    });

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  const deliveryBoy = invoice.customer?.deliveryBoy;
  const customer = invoice.customer;

  const response = {
    deliveryBoyDetails: {
      name: deliveryBoy?.name || "Not Assigned",
      phoneNumber: deliveryBoy?.phoneNumber || "N/A",
    },
    customerDetails: {
      name: customer?.name || "N/A",
      phoneNumber: customer?.phoneNumber || "N/A",
      address: customer?.address || "N/A",
    },
    deliveryDetails: {
      productType: invoice.productType,
      productQuantity: invoice.productQuantity,
      status: invoice.status,
    },
    bottleTracking: {
      bottleIssued: invoice.bottleIssued ? "Yes" : "No",
      bottleReturned: invoice.bottleReturnedYesNo ? "Yes" : "No",
      returnedCount: invoice.bottleReturned || 0
    },
    paymentInformation: {
      amount: invoice.price,
      paymentMode: invoice.payment || "N/A",
      paymentStatus: invoice.paymentStatus,
    },
  };

  res.status(200).json({
    success: true,
    invoiceId: invoice.invoiceId,
    data: response,
  });
});


// exports.updateInvoiceDetails = catchAsyncErrors(async (req, res, next) => {
//   const { id } = req.params;
//   const {
//     customer,
//     productType,
//     productQuantity,
//     price,
//     payment,
//     paymentStatus,
//     status,
//     bottleReturned,
//     razorpayPaymentId,
//     paymentMode
//   } = req.body;

//   const invoice = await Invoice.findById(id);

//   if (!invoice) {
//     return next(new ErrorHandler("Invoice not found", 404));
//   }

//   // Update fields if provided
//   if (customer) invoice.customer = customer;
//   if (productType) invoice.productType = productType;
//   if (productQuantity) invoice.productQuantity = productQuantity;
//   if (price !== undefined) invoice.price = price;
//   if (payment) invoice.payment = payment;
//   if (paymentStatus) invoice.paymentStatus = paymentStatus;
//   if (status) invoice.status = status;
//   if (bottleReturned !== undefined) invoice.bottleReturned = bottleReturned;
//   if (razorpayPaymentId) invoice.razorpayPaymentId = razorpayPaymentId;
//   if (paymentMode) invoice.paymentMode = paymentMode;

//   await invoice.save();

//   res.status(200).json({
//     success: true,
//     message: "Invoice updated successfully",
//     invoice,
//   });
// });
exports.updateInvoiceDetails = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const {
    customer,
    productType,
    productQuantity,
    price,
    payment,
    paymentStatus,
    status,
    bottleReturned,
    razorpayPaymentId,
    paymentMode,
    bottleIssued,
    bottleReturnedYesNo
  } = req.body;

  const invoice = await Invoice.findById(id);

  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  // ✅ Update fields if provided
  if (customer) invoice.customer = customer;
  if (productType) invoice.productType = productType;
  if (productQuantity) invoice.productQuantity = productQuantity;
  if (price !== undefined) invoice.price = price;
  if (payment) invoice.payment = payment;
  if (paymentStatus) invoice.paymentStatus = paymentStatus;
  if (status) invoice.status = status;
  if (bottleReturned !== undefined) invoice.bottleReturned = bottleReturned;
  if (razorpayPaymentId) invoice.razorpayPaymentId = razorpayPaymentId;
  if (paymentMode) invoice.paymentMode = paymentMode;

  // ✅ Update bottleIssued and bottleReturnedYesNo
  if (typeof bottleIssued === "boolean") {
    invoice.bottleIssued = bottleIssued;
  }

  if (typeof bottleReturnedYesNo === "boolean") {
    invoice.bottleReturnedYesNo = bottleReturnedYesNo;
  }

  await invoice.save();

  res.status(200).json({
    success: true,
    message: "Invoice updated successfully",
    invoice,
  });
});
