const Invoice = require("../models/invoiceModel")
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const DeliveryBoy = require("../models/deliveryBoyModel");
const Customer = require("../models/customerModel");
const Product = require("../models/productModel");
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
    _id: inv._id,
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
    _id: invoice._id,
    deliveryBoyDetails: {
      _id: deliveryBoy?._id || "Not Assigned",
      name: deliveryBoy?.name || "Not Assigned",
      phoneNumber: deliveryBoy?.phoneNumber || "N/A",
    },
    customerDetails: {
      _id: customer?._id || "N/A",
      name: customer?.name || "N/A",
      phoneNumber: customer?.phoneNumber || "N/A",
      address: customer?.address || "N/A",
    },
    deliveryDetails: {
      _id: invoice._id,
      productType: invoice.productType,
      productQuantity: invoice.productQuantity,
      status: invoice.status,
    },
    bottleTracking: {
      _id: invoice._id,
      bottleIssued: invoice.bottleIssued ? "Yes" : "No",
      bottleReturned: invoice.bottleReturnedYesNo ? "Yes" : "No",
      returnedCount: invoice.bottleReturned || 0
    },
    paymentInformation: {
      _id: invoice._id,
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
exports.updateInvoiceDetailsmonday = catchAsyncErrors(async (req, res, next) => {
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
exports.updateInvoiceDetails = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const {
    deliveryBoy,            // ObjectId
    customer,               // ObjectId
    productType,
    productQuantity,
    price,
    payment,
    paymentStatus,
    status,
    bottleIssued,
    bottleReturned,
    bottleReturnedYesNo,
    paymentMode
  } = req.body;

  const invoice = await Invoice.findById(id);

  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  // 🛠 Update Delivery Boy & Customer
  if (deliveryBoy) invoice.deliveryBoy = deliveryBoy;
  if (customer) invoice.customer = customer;

  // 🛠 Update Product/Delivery Details
  if (productType) invoice.productType = productType;
  if (productQuantity) invoice.productQuantity = productQuantity;
  if (status) invoice.status = status;

  // 🛠 Bottle Tracking
  if (typeof bottleIssued === "boolean") {
    invoice.bottleIssued = bottleIssued;
  }

  if (typeof bottleReturnedYesNo === "boolean") {
    invoice.bottleReturnedYesNo = bottleReturnedYesNo;
  }

  if (bottleReturned !== undefined) {
    invoice.bottleReturned = bottleReturned;
  }

  // 🛠 Payment Info
  if (price !== undefined) invoice.price = price;
  if (payment) invoice.payment = payment;
  if (paymentStatus) invoice.paymentStatus = paymentStatus;
  if (paymentMode) invoice.paymentMode = paymentMode;

  await invoice.save();

  res.status(200).json({
    success: true,
    message: "Delivery details updated successfully",
    invoice,
  });
});



//deliveryboy dropdown

exports.getDeliveryBoyDropdown = async (req, res) => {
  try {
    const deliveryBoys = await DeliveryBoy.find({}, "_id name").sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: deliveryBoys,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery boys",
      error: error.message,
    });
  }
};

// Get all customers for dropdown
exports.getCustomerDropdown = async (req, res) => {
  try {
    const customers = await Customer.find({}, { _id: 1, name: 1 }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer dropdown",
      error: error.message,
    });
  }
};

exports.getAllProductsDropdown = async (req, res) => {
  try {
    const products = await Product.find({}, "productType quantity price");

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
exports.getDeliveryStatusDropdowna = async (req, res) => {
  try {
    const invoices = await Invoice.find({}, "status");

    res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
exports.getDeliveryStatusDropdown = (req, res) => {
  const statusOptions = ["Pending", "Accepted", "Delivered"];
  res.status(200).json({
    success: true,
    statusOptions
  });
};

exports.getDeliveryStatusDropdown = (req, res) => {
  const statusOptions = ["Pending", "Accepted", "Delivered"];
  res.status(200).json({
    success: true,
    statusOptions
  });
};
exports.getBottleIssueStatusDropdown = (req, res) => {
  const statusOptions = ["Pending", "Accepted", "Delivered"];
  res.status(200).json({
    success: true,
    statusOptions
  });
};

exports.getpaymentModeDropdown = (req, res) => {
  const paymentModes = ["GooglePay", "BHIM", "UPI", "Cash"];
  res.status(200).json({
    success: true,
    paymentModes
  });
}

exports.gepaymentStatusDropdown = (req, res) => {
  const paymentStatuses = ["Paid", "Unpaid", "Partial"];
  res.status(200).json({
    success: true,
    paymentStatuses
  });
}