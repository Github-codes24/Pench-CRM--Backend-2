const Invoice = require("../models/invoiceModel");
const Customer = require("../models/customerModel");
const Subscription = require("../models/subscrptionModel");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");
const Product = require("../models/productModel")
// ➕ Create a new invoice
// exports.createInvoice = catchAsyncErrors(async (req, res, next) => {
//   const {
//     customerName,
//     productType,
//     productQuantity,
//     price,
//     subscriptionPlan,
//     paymentMode,
//     paymentStatus
//   } = req.body;

//   if (!customerName || !productType || !productQuantity || !price || !subscriptionPlan || !paymentMode) {
//     return next(new ErrorHandler("All fields are required", 400));
//   }

//   // Find customer by name
//   const customerExists = await Customer.findOne({ name: customerName });
//   if (!customerExists) {
//     return next(new ErrorHandler("Customer not found with the provided name", 404));
//   }

//   const invoice = await Invoice.create({
//     customer: customerExists._id,
//     customerName: customerExists.name,
//     productType,
//     productQuantity,
//     price,
//     subscriptionPlan,
//     paymentMode,
//     paymentStatus
//   });

//   res.status(201).json({
//     success: true,
//     message: "Invoice created successfully",
//     invoice
//   });
// });

// 🧾 Create Invoice
const moment = require("moment");

// exports.createInvoice = catchAsyncErrors(async (req, res, next) => {
//   const {
//     customerName,
//     productType,
//     productQuantity,
//     price,
//     subscriptionPlan,
//     paymentMode,
//     paymentStatus
//   } = req.body;

//   if (!customerName || !productType || !productQuantity || !price || !subscriptionPlan || !paymentMode) {
//     return next(new ErrorHandler("All fields are required", 400));
//   }

//   // ✅ Validate quantity
//   const quantityNumber = Number(productQuantity);
//   if (isNaN(quantityNumber)) {
//     return next(new ErrorHandler("Product quantity must be a number", 400));
//   }

//   // ✅ Find customer by name
//   const customerExists = await Customer.findOne({ name: customerName });
//   if (!customerExists) {
//     return next(new ErrorHandler("Customer not found", 404));
//   }

//   // ✅ Find product by type
//   const product = await Product.findOne({ productType });
//   if (!product) {
//     return next(new ErrorHandler("Product type not found", 404));
//   }

//   if (product.stock < quantityNumber) {
//     return next(new ErrorHandler("Insufficient stock available", 400));
//   }

//   // ✅ Generate invoice ID
//   const today = new Date();
//   const dd = String(today.getDate()).padStart(2, '0');
//   const mm = String(today.getMonth() + 1).padStart(2, '0');
//   const yyyy = today.getFullYear();
//   const dateStr = `${dd}${mm}${yyyy}`;

//   const countToday = await Invoice.countDocuments({
//     createdAt: {
//       $gte: new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`),
//       $lte: new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`)
//     }
//   });

//   const paddedCount = String(countToday + 1).padStart(3, '0');
//   const invoiceId = `INV-${dateStr}-${paddedCount}`;

//   // ✅ Deduct stock
//   product.stock -= quantityNumber;
//   await product.save();

//   // ✅ Create invoice
//   const invoice = await Invoice.create({
//     invoiceId,
//     customer: customerExists._id,
//     customerName: customerExists.name,
//     productType,
//     productQuantity: quantityNumber,
//     price,
//     subscriptionPlan,
//     paymentMode,
//     paymentStatus
//   });

//   res.status(201).json({
//     success: true,
//     message: "Invoice created successfully",
//     invoice,
//     remainingStock: product.stock
//   });
// });
const Notification = require("../models/notificationModel");

// exports.createInvoice = catchAsyncErrors(async (req, res, next) => {
//   const {
//     customerName,
//     productType,
//     productQuantity,
//     price,
//     subscriptionPlan,
//     paymentMode,
//     paymentStatus
//   } = req.body;

//   if (!customerName || !productType || !productQuantity || !price || !subscriptionPlan || !paymentMode) {
//     return next(new ErrorHandler("All fields are required", 400));
//   }

//   const quantityNumber = Number(productQuantity);
//   if (isNaN(quantityNumber)) {
//     return next(new ErrorHandler("Product quantity must be a number", 400));
//   }

//   const customerExists = await Customer.findOne({ name: customerName }).populate("deliveryBoy");
//   if (!customerExists) {
//     return next(new ErrorHandler("Customer not found", 404));
//   }

//   const product = await Product.findOne({ productType });
//   if (!product) {
//     return next(new ErrorHandler("Product type not found", 404));
//   }

//   if (product.stock < quantityNumber) {
//     return next(new ErrorHandler("Insufficient stock available", 400));
//   }

//   const today = new Date();
//   const dd = String(today.getDate()).padStart(2, '0');
//   const mm = String(today.getMonth() + 1).padStart(2, '0');
//   const yyyy = today.getFullYear();
//   const dateStr = `${dd}${mm}${yyyy}`;

//   const countToday = await Invoice.countDocuments({
//     createdAt: {
//       $gte: new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`),
//       $lte: new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`)
//     }
//   });

//   const paddedCount = String(countToday + 1).padStart(3, '0');
//   const invoiceId = `INV-${dateStr}-${paddedCount}`;

//   product.stock -= quantityNumber;
//   await product.save();

//   const invoice = await Invoice.create({
//     invoiceId,
//     customer: customerExists._id,
//     customerName: customerExists.name,
//     productType,
//     productQuantity: quantityNumber,
//     price,
//     subscriptionPlan,
//     paymentMode,
//     paymentStatus
//   });

//   // ✅ Notify delivery boy
// //   if (customerExists.deliveryBoy) {
// //     await Notification.create({
// //       deliveryBoy: customerExists.deliveryBoy._id,
// //       message: `New invoice (${invoiceId}) created for ${customerExists.name}.`
// //     });
// //   }
// const notification = await Notification.create({
//   deliveryBoy: customerExists.deliveryBoy._id,
//   message: `New invoice (${invoiceId}) created for ${customerExists.name}.`
// });
// console.log("Notification created:", notification);

// console.log("Delivery boy for notification:", customerExists.deliveryBoy);


//   res.status(201).json({
//     success: true,
//     message: "Invoice created and notification sent",
//     invoice,
//     remainingStock: product.stock
//   });
// });
const SubscriptionPlan = require("../models/subscrptionplanModel"); // Import the model

exports.createInvoicefri = catchAsyncErrors(async (req, res, next) => {
  const {
    customerName,
    productType,
    productQuantity,
    price, // This is unit price
    subscriptionPlan,
    paymentMode,
    paymentStatus
  } = req.body;

  // Validate required fields
  if (!customerName || !productType || !productQuantity || !price || !subscriptionPlan || !paymentMode) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  const quantityNumber = Number(productQuantity);
  const unitPrice = Number(price);

  if (isNaN(quantityNumber) || quantityNumber <= 0) {
    return next(new ErrorHandler("Product quantity must be a valid number", 400));
  }

  if (isNaN(unitPrice) || unitPrice <= 0) {
    return next(new ErrorHandler("Unit price must be a valid number", 400));
  }

  // Fetch customer
  const customerExists = await Customer.findOne({ name: customerName }).populate("deliveryBoy");
  if (!customerExists) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  // Fetch product
  const product = await Product.findOne({ productType });
  if (!product) {
    return next(new ErrorHandler("Product type not found", 404));
  }

  // Check stock
  if (product.stock < quantityNumber) {
    return next(new ErrorHandler("Insufficient stock available", 400));
  }

  // Fetch subscription plan
  const plan = await SubscriptionPlan.findOne({ subscriptionPlan }).populate("products");
  if (!plan) {
    return next(new ErrorHandler("Subscription plan not found", 404));
  }

  // Calculate total price (unitPrice * quantity)
  const totalPrice = unitPrice * quantityNumber;

  // Generate invoice ID
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const dateStr = `${dd}${mm}${yyyy}`;

  const countToday = await Invoice.countDocuments({
    createdAt: {
      $gte: new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`),
      $lte: new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`)
    }
  });

  const paddedCount = String(countToday + 1).padStart(3, '0');
  const invoiceId = `INV-${dateStr}-${paddedCount}`;

  // Update stock
  product.stock -= quantityNumber;
  await product.save();

  // Create invoice
  const invoice = await Invoice.create({
    invoiceId,
    customer: customerExists._id,
    customerName: customerExists.name,
    productType,
    productQuantity: quantityNumber,
    price: totalPrice, // ✅ Final price based on quantity
    subscriptionPlan,
    paymentMode,
    paymentStatus
  });

  // Notify delivery boy
  if (customerExists.deliveryBoy) {
    const notification = await Notification.create({
      deliveryBoy: customerExists.deliveryBoy._id,
      message: `New invoice (${invoiceId}) created for ${customerExists.name}.`
    });
    console.log("Notification created:", notification);
  }

  // Response
  res.status(201).json({
    success: true,
    message: "Invoice created and notification sent",
    invoice,
    subscriptionPlanDetails: {
      plan: plan.subscriptionPlan,
      discount: plan.discount,
      totalPrice: plan.totalPrice,
      deliveryTime: plan.deliveryTime,
      products: plan.products
    },
    remainingStock: product.stock
  });
});

exports.createInvoice = catchAsyncErrors(async (req, res, next) => {
  const {
    customerName,
    productType,
    productQuantity,
    price, // Unit price
    subscriptionPlan,
    paymentMode,
    paymentStatus
  } = req.body;

  // ✅ Validate required fields
  if (!customerName || !productType || !productQuantity || !price || !subscriptionPlan || !paymentMode) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  const quantityNumber = Number(productQuantity);
  const unitPrice = Number(price);

  if (isNaN(quantityNumber) || quantityNumber <= 0) {
    return next(new ErrorHandler("Product quantity must be a valid number", 400));
  }

  if (isNaN(unitPrice) || unitPrice <= 0) {
    return next(new ErrorHandler("Unit price must be a valid number", 400));
  }

  // ✅ Fetch customer
  const customerExists = await Customer.findOne({ name: customerName }).populate("deliveryBoy");
  if (!customerExists) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  // ✅ Fetch product
  const product = await Product.findOne({ productType }).select("productType stock price image");
  if (!product) {
    return next(new ErrorHandler("Product type not found", 404));
  }

  // ✅ Check stock
  if (product.stock < quantityNumber) {
    return next(new ErrorHandler("Insufficient stock available", 400));
  }

  // ✅ Fetch subscription plan
  const plan = await SubscriptionPlan.findOne({ subscriptionPlan }).populate("products");
  if (!plan) {
    return next(new ErrorHandler("Subscription plan not found", 404));
  }

  // ✅ Calculate total price
  const totalPrice = unitPrice * quantityNumber;

  // ✅ Generate invoice ID
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const dateStr = `${dd}${mm}${yyyy}`;

  const countToday = await Invoice.countDocuments({
    createdAt: {
      $gte: new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`),
      $lte: new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`)
    }
  });

  const paddedCount = String(countToday + 1).padStart(3, '0');
  const invoiceId = `INV-${dateStr}-${paddedCount}`;

  // ✅ Update product stock
  product.stock -= quantityNumber;
  await product.save();

  // ✅ Create invoice
  const invoice = await Invoice.create({
    invoiceId,
    customer: customerExists._id,
    customerName: customerExists.name,
    productId: product._id,
    productType,
    productQuantity: quantityNumber,
    price: totalPrice,
    subscriptionPlan,
    paymentMode,
    paymentStatus
  });

  // ✅ Create subscription if not already exists
  const existingSubscription = await Subscription.findOne({
    customer: customerExists._id,
    productType,
    isActive: true
  });

  if (!existingSubscription) {
    const newSubscription = await Subscription.create({
      customer: customerExists._id,
      name: customerExists.name,
      phoneNumber: customerExists.phoneNumber,
      productType,
      deliveryDays: "Daily", // default, update as needed
      assignedDeliveryBoy: customerExists.deliveryBoy?._id || null,
      address: customerExists.address || "",
      subscriptionPlan: plan.subscriptionPlan,
      frequency: "Every Day", // default
      price: plan.totalPrice,
      startDate: new Date(),
      endDate: null,
      status: "Active",
      deliveryTime: plan.deliveryTime,
      products: plan.products,
      discount: plan.discount,
      totalPrice: plan.totalPrice,
      isActive: true,
    });
    console.log("Created subscription from invoice:", newSubscription._id);
  }

  // ✅ Notify delivery boy
  if (customerExists.deliveryBoy) {
    await Notification.create({
      deliveryBoy: customerExists.deliveryBoy._id,
      message: `New invoice (${invoiceId}) created for ${customerExists.name}.`
    });
  }

  // ✅ Send response
  res.status(201).json({
    success: true,
    message: "Invoice created. Subscription ensured. Notification sent.",
    invoice,
    subscriptionPlanDetails: {
      plan: plan.subscriptionPlan,
      discount: plan.discount,
      totalPrice: plan.totalPrice,
      deliveryTime: plan.deliveryTime,
      products: plan.products
    },
    remainingStock: product.stock
  });
});

// 📋 Get all invoices
// exports.getAllInvoices = catchAsyncErrors(async (req, res, next) => {
//   const invoices = await Invoice.find()
//     .populate("customer", "name phoneNumber address");

//   res.status(200).json({
//     success: true,
//     count: invoices.length,
//     invoices
//   });
// });

exports.getAllInvoices = catchAsyncErrors(async (req, res, next) => {
  const invoices = await Invoice.find({}, {
    customerName: 1,
    invoiceId: 1,
    subscriptionPlan: 1,
    price: 1,
    paymentStatus: 1,
    _id: 1, // don't return _id
  }).sort({ createdAt: -1 }); // optional: sort by latest first

  res.status(200).json({
    success: true,
    count: invoices.length,
    invoices
  });
});

exports.getInvoiceById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // Find invoice by MongoDB _id
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  // Find customer name
  const customer = await Customer.findById(invoice.customer);
  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  // Find product details
  const product = await Product.findOne({ productType: invoice.productType });

  const total = invoice.price;

  res.status(200).json({
    success: true,
    invoiceDetails: {
      invoiceId: invoice.invoiceId,
      customerName: customer.name,
      date: invoice.createdAt.toISOString().split("T")[0],
      productType: invoice.productType,
      description: product?.description || "N/A",
      quantity: invoice.productQuantity,
      price: invoice.price,
      total,
      grandTotal: total,
      paymentStatus: invoice.paymentStatus,
      paymentMode: invoice.paymentMode
    }
  });
});

// 🔍 Get single invoice by ID
// exports.getInvoiceById = catchAsyncErrors(async (req, res, next) => {
//   const { id } = req.params;

//   const invoice = await Invoice.findById(id).populate("customer", "name phoneNumber address");

//   if (!invoice) {
//     return next(new ErrorHandler("Invoice not found", 404));
//   }

//   res.status(200).json({
//     success: true,
//     invoice
//   });
// });

// ✏️ Update invoice
exports.updateInvoice = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  let invoice = await Invoice.findById(id);
  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  invoice = await Invoice.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: "Invoice updated successfully",
    invoice
  });
});

// ❌ Delete invoice
exports.deleteInvoice = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const invoice = await Invoice.findById(id);
  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  await invoice.remove();

  res.status(200).json({
    success: true,
    message: "Invoice deleted successfully"
  });
});


