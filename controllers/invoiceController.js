const Invoice = require("../models/invoiceModel");
const Customer = require("../models/customerModel");
const Subscription = require("../models/subscriptionModel");
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
const SubscriptionPlan = require("../models/subscriptionPlanModel"); // Import the model

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

// exports.createInvoice = catchAsyncErrors(async (req, res, next) => {
//   const {
//     customerName,
//     productType,
//     productQuantity,
//     price, // full price, not unit price
//     subscriptionPlan,
//     paymentMode,
//     paymentStatus,
//     isPartialPayment,
//     amountPaid
//   } = req.body;

//   if (!customerName || !productType || productQuantity == null || price == null || !subscriptionPlan || !paymentMode) {
//     return next(new ErrorHandler("All fields are required", 400));
//   }

//   const quantityNumber = parseFloat(productQuantity);
//   const fixedPrice = parseFloat(price); // ✅ treat price as full amount

//   if (isNaN(quantityNumber) || quantityNumber <= 0) {
//     return next(new ErrorHandler("Product quantity must be a valid number", 400));
//   }

//   if (isNaN(fixedPrice) || fixedPrice <= 0) {
//     return next(new ErrorHandler("Price must be a valid number", 400));
//   }

//   const customerExists = await Customer.findOne({ name: customerName }).populate("deliveryBoy");
//   if (!customerExists) return next(new ErrorHandler("Customer not found", 404));

//   const product = await Product.findOne({ productType }).select("productType stock price image");
//   if (!product) return next(new ErrorHandler("Product type not found", 404));

//   if (product.stock < quantityNumber) {
//     return next(new ErrorHandler("Insufficient stock available", 400));
//   }

//   const plan = await SubscriptionPlan.findOne({ subscriptionPlan }).populate("products");
//   if (!plan) return next(new ErrorHandler("Subscription plan not found", 404));

//   const totalPrice = fixedPrice; // ✅ Don't multiply with quantity

//   // ✅ Handle partial payment
//   let finalPaymentStatus = paymentStatus || "Unpaid";
//   let paidAmount = 0;
//   let dueAmount = totalPrice;
//   let isPartial = false;

//   if (isPartialPayment && amountPaid) {
//     paidAmount = parseFloat(amountPaid);
//     dueAmount = totalPrice - paidAmount;
//     isPartial = true;

//     if (paidAmount < totalPrice) {
//       finalPaymentStatus = "Partial";
//     } else {
//       finalPaymentStatus = "Paid";
//     }
//   } else {
//     if (finalPaymentStatus === "Paid") {
//       paidAmount = totalPrice;
//       dueAmount = 0;
//     }
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

//   // Update product stock
//   product.stock -= quantityNumber;
//   await product.save();

//   const invoice = await Invoice.create({
//     invoiceId,
//     customer: customerExists._id,
//     customerName: customerExists.name,
//     productId: product._id,
//     productType,
//     productQuantity: quantityNumber,
//     price: fixedPrice, // ✅ save price exactly as passed
//     subscriptionPlan,
//     paymentMode,
//     paymentStatus: finalPaymentStatus,
//     partialPayment: isPartial,
//     amountPaid: paidAmount,
//     amountDue: dueAmount
//   });

//   // ✅ Subscription logic
//   const existingSubscription = await Subscription.findOne({
//     customer: customerExists._id,
//     productType,
//     isActive: true
//   });

//   if (!existingSubscription) {
//     await Subscription.create({
//       customer: customerExists._id,
//       name: customerExists.name,
//       phoneNumber: customerExists.phoneNumber,
//       productType,
//       deliveryDays: "Daily",
//       assignedDeliveryBoy: customerExists.deliveryBoy?._id || null,
//       address: customerExists.address || "",
//       subscriptionPlan: plan.subscriptionPlan,
//       frequency: "Every Day",
//       price: plan.totalPrice,
//       startDate: new Date(),
//       status: "Active",
//       deliveryTime: plan.deliveryTime,
//       products: plan.products,
//       discount: plan.discount,
//       totalPrice: plan.totalPrice,
//       isActive: true,
//     });
//   }

//   // ✅ Notify delivery boy
//   if (customerExists.deliveryBoy) {
//     await Notification.create({
//       deliveryBoy: customerExists.deliveryBoy._id,
//       message: `New invoice (${invoiceId}) created for ${customerExists.name}.`
//     });
//   }

//   res.status(201).json({
//     success: true,
//     message: "Invoice created. Subscription ensured. Notification sent.",
//     invoice,
//     subscriptionPlanDetails: {
//       plan: plan.subscriptionPlan,
//       discount: plan.discount,
//       totalPrice: plan.totalPrice,
//       deliveryTime: plan.deliveryTime,
//       products: plan.products
//     },
//     remainingStock: product.stock
//   });
// });

const generateInvoiceId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = date.getTime().toString().slice(-6); // Last 6 digits of timestamp

    return `INV-${year}${month}${day}-${timestamp}`;
};

exports.createInvoice = catchAsyncErrors(async (req, res, next) => {
  try {
        const {
            customerName,
            phoneNumber,
            productType,
            productSize,
            productQuantity,
            price,
            subscriptionPlan,
            paymentMode,
            paymentStatus,
            invoiceDate
        } = req.body;

        // Basic validation
        if (!customerName || !phoneNumber || !price) {
            return res.status(400).json({
                message: 'Customer Name, Phone Number, and Price are required fields.'
            });
        }

        // Create a new invoice instance
        const newInvoice = new Invoice({
            customerName,
            phoneNumber,
            invoiceId: generateInvoiceId(), // Generate a unique ID
            productType,
            productSize,
            productQuantity,
            price,
            subscriptionPlan,
            paymentMode,
            paymentStatus,
            invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(), // Use provided date or now
        });

        // Save the invoice to the database
        const savedInvoice = await newInvoice.save();

        res.status(201).json({
            message: 'Invoice created successfully!',
            invoice: savedInvoice
        });

    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({
            message: 'Server error while creating invoice.',
            error: error.message
        });
    }
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
  const { from, to, productType } = req.query;

  const filter = {};

  // Apply date range filter if both are provided
  if (from && to) {
    filter.createdAt = {
      $gte: new Date(from + "T00:00:00.000Z"),
      $lte: new Date(to + "T23:59:59.999Z")
    };
  }

  // Apply productType filter if provided
  if (productType) {
    filter.productType = productType; // ✅ filter by productType
  }

  // Fetch invoices with filters
  const invoices = await Invoice.find(filter, {
    customerName: 1,
    invoiceId: 1,
    subscriptionPlan: 1,
    productType: 1,       // ensure productType is returned
    price: 1,
    paymentStatus: 1,
    _id: 1,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: invoices.length,
    invoices
  });
});


const { generateInvoiceMessage } = require("../utils/whatsappFormatter");

// exports.sendInvoiceOnWhatsApp = catchAsyncErrors(async (req, res, next) => {
//   const { id } = req.params;

//   const invoice = await Invoice.findById(id).populate("customer");
//   if (!invoice) return next(new ErrorHandler("Invoice not found", 404));

//   // ✅ Construct WhatsApp message
//   const message = generateInvoiceMessage(invoice);
//   const phone = invoice.customer?.phoneNumber;

//   if (!phone) return next(new ErrorHandler("Customer phone number missing", 400));

//   // ✅ Create WhatsApp link
//   const whatsappLink = `https://wa.me/91${phone}?text=${message}`;

//   res.status(200).json({
//     success: true,
//     whatsappLink,
//   });
// });

exports.sendInvoiceOnWhatsApp = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const invoice = await Invoice.findById(id).populate({
    path: "customer",
    select: "phoneNumber name"
  });

  if (!invoice) return next(new ErrorHandler("Invoice not found", 404));

  const customer = invoice.customer;
  if (!customer || !customer.phoneNumber) {
    return next(new ErrorHandler("Customer phone number missing", 400));
  }

  const message = generateInvoiceMessage(invoice);
  const encodedMessage = encodeURIComponent(message);
  const whatsappLink = `https://wa.me/91${customer.phoneNumber}?text=${encodedMessage}`;

  res.status(200).json({
    success: true,
    whatsappLink,
  });
});


// exports.sendMultipleInvoicesOnWhatsApp = catchAsyncErrors(async (req, res, next) => {
//   const { invoiceIds } = req.body;

//   if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
//     return next(new ErrorHandler("Invoice IDs are required", 400));
//   }

//   const invoices = await Invoice.find({ invoiceId: { $in: invoiceIds } }).populate("customer");

//   const links = invoices.map((invoice) => {
//     const message = generateInvoiceMessage(invoice);
//     const phone = invoice.customer?.phoneNumber || "9999999999";
//     return {
//       invoiceId: invoice.invoiceId,
//       customerName: invoice.customer?.name,
//       whatsappLink: `https://wa.me/91${phone}?text=${message}`
//     };
//   });

//   res.status(200).json({
//     success: true,
//     count: links.length,
//     links
//   });
// });

exports.sendMultipleInvoicesOnWhatsAppsat = catchAsyncErrors(async (req, res, next) => {
  // ✅ 1. Get all invoices and populate customer info
  const invoices = await Invoice.find().populate("customer");

  if (!invoices || invoices.length === 0) {
    return next(new ErrorHandler("No invoices found", 404));
  }

  // ✅ 2. Generate WhatsApp message links
  const links = invoices.map((invoice) => {
    const message = generateInvoiceMessage(invoice); // You must already have this function
    const phone = invoice.customer?.phoneNumber || "9999999999";

    return {
      invoiceId: invoice.invoiceId,
      customerName: invoice.customer?.name,
      whatsappLink: `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`
    };
  });

  // ✅ 3. Return all WhatsApp links
  res.status(200).json({
    success: true,
    count: links.length,
    links
  });
});
exports.sendMultipleInvoicesOnWhatsApp = catchAsyncErrors(async (req, res, next) => {
  // 1. Fetch all invoices
  const invoices = await Invoice.find().populate("customer");

  if (!invoices || invoices.length === 0) {
    return next(new ErrorHandler("No invoices found", 404));
  }

  // 2. Create WhatsApp message links
  const links = invoices.map((invoice) => {
    const phone = invoice.customer?.phoneNumber || "9999999999";
    const message = generateInvoiceMessage(invoice); // Pre-encoded inside

    return {
      invoiceId: invoice.invoiceId,
      customerName: invoice.customer?.name,
      whatsappLink: `https://wa.me/91${phone}?text=${message}`
    };
  });

  // 3. Respond with all links
  res.status(200).json({
    success: true,
    count: links.length,
    links
  });
});

exports.getInvoiceById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // 1. Find invoice by ID
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  // 2. Safely get customer name (fallback to invoice.customerName)
  let customerName = invoice.customerName || "N/A";
  let phoneNumber = invoice.phoneNumber || "N/A"
  if (invoice.customer) {
    const customer = await Customer.findById(invoice.customer).select("name phoneNumber");
    if (customer && customer.name) {
      customerName = customer.name;
    }
   if (customer && customer.phoneNumber) {
      phoneNumber = customer.phoneNumber;
    }
  }

  // 3. Get product description (optional)
  let productDescription = "N/A";
  if (invoice.productType) {
    const product = await Product.findById(invoice.productType).select("description");
    if (product?.description) {
      productDescription = product.description;
    }
  }

  // 4. Format response
  const total = invoice.price;
  const formattedDate = invoice.createdAt?.toISOString().split("T")[0] || "N/A";

  res.status(200).json({
    success: true,
    invoiceDetails: {
      invoiceId: invoice.invoiceId,
      customerName,
      phoneNumber,
      date: formattedDate,
      productType: invoice.productType,
      description: productDescription,
      quantity: invoice.productQuantity,
      price: invoice.price,
      total,
      grandTotal: total,
      paymentStatus: invoice.paymentStatus,
      paymentMode: invoice.paymentMode,
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

  await invoice.deleteOne(); // ✅ use deleteOne() instead of remove()

  res.status(200).json({
    success: true,
    message: "Invoice deleted successfully"
  });
});

