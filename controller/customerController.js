const Customer = require("../models/customerModel");
const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const SubscriptionPlan = require("../models/subscriptionPlanModel");
const Subscription = require("../models/subscriptionModel");
const DeliveryBoy = require("../models/deliveryBoyModel");
const Product = require("../models/productModel");
const Invoice = require("../models/invoiceModel");
const Notification = require("../models/notificationModel");
// ➕ Add a new customer

// exports.createCustomer = catchAsyncErrors(async (req, res, next) => {
//   const {
//     name,
//     phoneNumber,
//     productType,
//     deliveryDays,
//     deliveryBoy,
//     subscriptionPlan,
//     quantity,
//     price,           // ✅ NEW FIELD ADDED
//     address,
//     frequency, // optional
//   } = req.body;

//   // ✅ 1. Validate required fields
//   if (
//     !name ||
//     !phoneNumber ||
//     !productType ||
//     !deliveryDays ||
//     !deliveryBoy ||
//     !subscriptionPlan ||
//     !quantity ||
//     !price ||        // ✅ VALIDATE PRICE
//     !address
//   ) {
//     return next(new ErrorHandler("All fields are required", 400));
//   }

//   const existingCustomer = await Customer.findOne({ phoneNumber });
// if (existingCustomer) {
//    return next(new ErrorHandler("Customer with this phone number already exists", 400));
// }

//   // ✅ 2. Validate quantity & price
//   const quantityNumber = Number(quantity);
//   const priceNumber = Number(price);

//   if (isNaN(quantityNumber) || quantityNumber <= 0) {
//     return next(new ErrorHandler("Quantity must be a valid number", 400));
//   }

//   if (isNaN(priceNumber) || priceNumber <= 0) {
//     return next(new ErrorHandler("Price must be a valid number", 400));
//   }

//   // ✅ 3. Validate subscription plan
//   const plan = await SubscriptionPlan.findOne({ subscriptionPlan });
//   if (!plan) {
//     return next(new ErrorHandler("Subscription plan not found", 404));
//   }

//   // ✅ 4. Create Customer
//   const customer = await Customer.create({
//     name,
//     phoneNumber,
//     productType,
//     deliveryDays,
//     deliveryBoy,
//     subscriptionPlan,
//     quantity: quantityNumber,
//     price: priceNumber,   // ✅ SAVE PRICE IN CUSTOMER
//     address,
//     createdBy: req.user?._id || null, // Optional
//   });

//   // ✅ 5. Create Subscription linked to this customer
//   const subscription = await Subscription.create({
//     customer: customer._id,
//     name: customer.name,
//     phoneNumber: customer.phoneNumber,
//     productType: customer.productType,
//     deliveryDays: customer.deliveryDays,
//     assignedDeliveryBoy: customer.deliveryBoy,
//     address: customer.address,
//     subscriptionPlan: plan.subscriptionPlan,
//     frequency: frequency || "Every Day",
//     price: priceNumber,     // ✅ USE PRICE FROM REQUEST
//     startDate: new Date(),
//     endDate: null, // Optional: can be calculated later
//     status: "Active",
//     deliveryTime: plan.deliveryTime,
//     products: plan.products,
//     discount: plan.discount,
//     totalPrice: priceNumber, // ✅ CALCULATE TOTAL PRICE
//     isActive: true,
//   });

//   // ✅ 6. Response
//   res.status(201).json({
//     success: true,
//     message: "Customer and subscription created successfully",
//     customer,
//     subscription,
//   });
// });
// controllers/customerController.js

exports.createCustomer = catchAsyncErrors(async (req, res, next) => {
  const {
    name,
    phoneNumber,
    productType, // <-- this will be the name, like "Fresh Milk"
    size,
    deliveryDays,
    deliveryBoy,
    subscriptionPlan,
    quantity,
    price,
    address,
    frequency,
    paymentMode,
    paymentStatus,
    isPartialPayment,
    amountPaid,
  } = req.body;

  // Validate required fields
  if (
    !name ||
    !phoneNumber ||
    !productType ||
    !size ||
    !deliveryDays ||
    !deliveryBoy ||
    !subscriptionPlan ||
    !quantity ||
    !price ||
    !address ||
    !paymentMode
  ) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  // Check if customer already exists
  const existingCustomer = await Customer.findOne({ phoneNumber });
  if (existingCustomer) {
    return next(
      new ErrorHandler("Customer with this phone number already exists", 400)
    );
  }

  const quantityNumber = Number(quantity);
  const priceNumber = Number(price);

  if (isNaN(quantityNumber) || quantityNumber <= 0) {
    return next(new ErrorHandler("Quantity must be a valid number", 400));
  }

  if (isNaN(priceNumber) || priceNumber <= 0) {
    return next(new ErrorHandler("Price must be a valid number", 400));
  }

  // Get subscription plan
  const plan = await SubscriptionPlan.findOne({ subscriptionPlan });
  if (!plan) {
    return next(new ErrorHandler("Subscription plan not found", 404));
  }

  // Get product by name (productType) and size
  const product = await Product.findOne({ productType, size });
  if (!product) {
    return next(
      new ErrorHandler("Product not found for given type and size", 404)
    );
  }

  if (product.stock < quantityNumber) {
    return next(new ErrorHandler("Insufficient stock available", 400));
  }

  // Create customer
  const customer = await Customer.create({
    name,
    phoneNumber,
    productType: product._id,
    size,
    deliveryDays,
    deliveryBoy,
    subscriptionPlan,
    quantity,
    price,
    address,
    createdBy: req.user?._id || null,
  });

  // Create subscription
  const subscription = await Subscription.create({
    customer: customer._id,
    name: customer.name,
    phoneNumber: customer.phoneNumber,
    productType: product._id, // ✅ fixed here
    size,
    deliveryDays: customer.deliveryDays,
    assignedDeliveryBoy: customer.deliveryBoy,
    address: customer.address,
    subscriptionPlan: plan.subscriptionPlan,
    frequency: frequency || "Every Day",
    price: priceNumber,
    startDate: new Date(),
    status: "Active",
    deliveryTime: plan.deliveryTime,
    products: plan.products,
    discount: plan.discount,
    totalPrice: priceNumber,
    isActive: true,
  });

  // Generate invoice ID
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const dateStr = `${dd}${mm}${yyyy}`;

  const countToday = await Invoice.countDocuments({
    createdAt: {
      $gte: new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`),
      $lte: new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`),
    },
  });

  const paddedCount = String(countToday + 1).padStart(3, "0");
  const invoiceId = `INV-${dateStr}-${paddedCount}`;

  // Calculate payment
  let finalPaymentStatus = paymentStatus || "Unpaid";
  let paidAmount = 0;
  let dueAmount = priceNumber;
  let isPartial = false;

  if (isPartialPayment && amountPaid) {
    paidAmount = parseFloat(amountPaid);
    dueAmount = priceNumber - paidAmount;
    isPartial = true;
    finalPaymentStatus = paidAmount < priceNumber ? "Partial" : "Paid";
  } else if (finalPaymentStatus === "Paid") {
    paidAmount = priceNumber;
    dueAmount = 0;
  }

  // Deduct product stock
  product.stock -= quantityNumber;
  await product.save();

  // Create invoice
  const invoice = await Invoice.create({
    invoiceId,
    customer: customer._id,
    customerName: customer.name,
    productId: product._id,
    productType: product._id, // ✅ fixed here
    size,
    productQuantity: quantityNumber,
    price: priceNumber,
    subscriptionPlan,
    paymentMode,
    paymentStatus: finalPaymentStatus,
    partialPayment: isPartial,
    amountPaid: paidAmount,
    amountDue: dueAmount,
  });

  // Create delivery boy notification
  if (customer.deliveryBoy) {
    await Notification.create({
      deliveryBoy: customer.deliveryBoy,
      message: `New invoice (${invoiceId}) created for ${customer.name}.`,
    });
  }

  res.status(201).json({
    success: true,
    message: "Customer, subscription, and invoice created successfully",
    customer,
    subscription,
    invoice,
  });
});

// 📋 Get all customers
// exports.getAllCustomers = catchAsyncErrors(async (req, res, next) => {
//   const customers = await Customer.find()
//     .populate("deliveryBoy", "name email phoneNumber area")
//     .populate("createdBy", "name email");

//   res.status(200).json({
//     success: true,
//     count: customers.length,
//     customers,
//   });
// });
exports.getAllCustomerss = catchAsyncErrors(async (req, res, next) => {
  // Fetch all customers with delivery boy and creator info
  const customers = await Customer.find()
    .populate("deliveryBoy", "name email phoneNumber area")
    .populate("createdBy", "name email");

  // Fetch all subscriptions (only active or blocked)
  const subscriptions = await Subscription.find({
    status: { $in: ["Active", "Blocked"] },
  }).select("customer status subscriptionPlan startDate endDate isActive");

  // Create a map of customerId => subscription details
  const subscriptionMap = {};
  subscriptions.forEach((sub) => {
    if (sub.customer) {
      subscriptionMap[sub.customer.toString()] = {
        status: sub.status,
        subscriptionPlan: sub.subscriptionPlan,
        startDate: sub.startDate,
        endDate: sub.endDate,
        isActive: sub.isActive,
      };
    }
  });

  // Attach subscription info to each customer
  const enrichedCustomers = customers.map((customer) => {
    const subInfo = subscriptionMap[customer._id.toString()] || null;
    return {
      ...customer.toObject(),
      subscriptionStatus: subInfo?.status || "No Plan",
      subscriptionPlan: subInfo?.subscriptionPlan || null,
      subscriptionStartDate: subInfo?.startDate || null,
      subscriptionEndDate: subInfo?.endDate || null,
      isActive: subInfo?.isActive ?? false,
    };
  });

  res.status(200).json({
    success: true,
    count: enrichedCustomers.length,
    customers: enrichedCustomers,
  });
});

exports.getAllCustomers = catchAsyncErrors(async (req, res, next) => {
  const { productType } = req.query; // ✅ productType filter from query params

  // 1. Fetch all customers (sorted by newest first)
  const customers = await Customer.find()
    .populate("deliveryBoy", "name email phoneNumber area")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 }); // ✅ Sort by latest created

  if (!customers.length) {
    return res.status(200).json({
      success: true,
      count: 0,
      customers: [],
    });
  }

  // 2. Get all subscriptions and populate products with name & productType
  const subscriptions = await Subscription.find({
    customer: { $in: customers.map((c) => c._id) },
    status: { $in: ["Active", "Blocked"] },
  })
    .select(
      "customer status subscriptionPlan startDate endDate isActive deliveryDays frequency price totalPrice deliveryTime discount products"
    )
    .populate("products", "name productType"); // ✅ populate products

  // 3. Build a map: customerId => latest subscription
  const subscriptionMap = {};
  subscriptions.forEach((sub) => {
    const customerId = sub.customer?.toString();
    if (!customerId) return;

    const existing = subscriptionMap[customerId];
    if (!existing || new Date(sub.startDate) > new Date(existing.startDate)) {
      subscriptionMap[customerId] = sub;
    }
  });

  // 4. Merge subscription data into each customer
  let enrichedCustomers = customers.map((customer) => {
    const sub = subscriptionMap[customer._id.toString()] || null;

    // Extract product types
    const productTypes = sub?.products?.length
      ? sub.products.map((p) => p.productType)
      : [];

    return {
      ...customer.toObject(),
      subscriptionStatus: sub?.status || "No Plan",
      subscriptionPlan:
        sub?.subscriptionPlan || customer.subscriptionPlan || "No Plan",
      subscriptionStartDate: sub?.startDate || null,
      subscriptionEndDate: sub?.endDate || null,
      isActive: sub?.isActive ?? false,
      deliveryDays: sub?.deliveryDays || customer.deliveryDays || null,
      frequency: sub?.frequency || null,
      price: sub?.price || null,
      totalPrice: sub?.totalPrice || null,
      deliveryTime: sub?.deliveryTime || null,
      discount: sub?.discount || null,
      products: sub?.products || [], // full product data (with name & productType)
      productTypes: productTypes, // productType array
    };
  });

  // 5. Apply productType filter if query param exists
  if (productType) {
    enrichedCustomers = enrichedCustomers.filter((customer) =>
      customer.productTypes.includes(productType)
    );
  }

  // 6. Return final response
  res.status(200).json({
    success: true,
    count: enrichedCustomers.length,
    customers: enrichedCustomers,
  });
});

// 🔍 Get single customer by ID
exports.getCustomerById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const customer = await Customer.findById(id)
    .populate("deliveryBoy", "name email phoneNumber area")
    .populate("createdBy", "name email");

  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  res.status(200).json({
    success: true,
    customer,
  });
});

// ✏️ Update customer
// exports.updateCustomer = catchAsyncErrors(async (req, res, next) => {
//   const { id } = req.params;

//   let customer = await Customer.findById(id);
//   if (!customer) {
//     return next(new ErrorHandler("Customer not found", 404));
//   }

//   customer = await Customer.findByIdAndUpdate(id, req.body, {
//     new: true,
//     runValidators: true,
//   });
//    if (req.file) {
//        customer.userProfile = req.file.path; // S3 puts the file URL in .location
//    }

//   res.status(200).json({
//     success: true,
//     message: "Customer updated successfully",
//     customer,
//   });
// });
// controllers/customer.controller.js

exports.updateCustomer = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    phoneNumber,
    productType,
    deliveryDays,
    deliveryBoy, // delivery boy ID
    subscriptionPlan,
    quantity,
    address,
    frequency,
  } = req.body;

  // 🔍 1. Fetch customer
  let customer = await Customer.findById(id);
  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  // 🔍 2. Validate delivery boy if provided
  if (deliveryBoy) {
    const deliveryBoyExists = await DeliveryBoy.findById(deliveryBoy);
    if (!deliveryBoyExists) {
      return next(new ErrorHandler("Assigned delivery boy not found", 404));
    }
  }

  // 📌 3. Update only provided customer fields
  if (name) customer.name = name;
  if (phoneNumber) customer.phoneNumber = phoneNumber;
  if (productType) customer.productType = productType;
  if (deliveryDays) customer.deliveryDays = deliveryDays;
  if (deliveryBoy) customer.deliveryBoy = deliveryBoy;
  if (subscriptionPlan) customer.subscriptionPlan = subscriptionPlan;
  if (quantity) customer.quantity = quantity;
  if (address) customer.address = address;
  if (req.file) customer.userProfile = req.file.path;

  await customer.save();

  // 🔍 4. Find or create/update subscription
  let subscription = await Subscription.findOne({ customer: customer._id });

  let plan = null;
  if (subscriptionPlan) {
    plan = await SubscriptionPlan.findOne({ subscriptionPlan });
    if (!plan)
      return next(new ErrorHandler("Subscription plan not found", 404));
  }

  if (!subscription) {
    // 🆕 Create new subscription if not found
    if (!plan) {
      plan = await SubscriptionPlan.findOne({
        subscriptionPlan: customer.subscriptionPlan,
      });
      if (!plan)
        return next(new ErrorHandler("Subscription plan not found", 404));
    }

    subscription = await Subscription.create({
      customer: customer._id,
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      productType: customer.productType,
      deliveryDays: customer.deliveryDays,
      assignedDeliveryBoy: deliveryBoy || customer.deliveryBoy,
      address: customer.address,
      subscriptionPlan: plan.subscriptionPlan,
      frequency: frequency || "Every Day",
      price: plan.totalPrice,
      startDate: new Date(),
      status: "Active",
      deliveryTime: plan.deliveryTime,
      products: plan.products,
      discount: plan.discount,
      totalPrice: plan.totalPrice,
      isActive: true,
    });
  } else {
    // 🔄 Update existing subscription fields
    if (name) subscription.name = name;
    if (phoneNumber) subscription.phoneNumber = phoneNumber;
    if (productType) subscription.productType = productType;
    if (deliveryDays) subscription.deliveryDays = deliveryDays;
    if (deliveryBoy) subscription.assignedDeliveryBoy = deliveryBoy;
    if (address) subscription.address = address;
    if (subscriptionPlan && plan) {
      subscription.subscriptionPlan = plan.subscriptionPlan;
      subscription.price = plan.totalPrice;
      subscription.deliveryTime = plan.deliveryTime;
      subscription.products = plan.products;
      subscription.discount = plan.discount;
      subscription.totalPrice = plan.totalPrice;
    }
    if (frequency) subscription.frequency = frequency;

    await subscription.save();
  }

  // ✅ Final response
  res.status(200).json({
    success: true,
    message:
      "Customer and subscription updated successfully with delivery boy assigned",
    customer,
    subscription,
  });
});

// ❌ Delete customer
exports.deleteCustomer = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const customer = await Customer.findById(id);
  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  await customer.deleteOne();

  res.status(200).json({
    success: true,
    message: "Customer deleted successfully",
  });
});
