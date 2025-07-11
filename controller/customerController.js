const Customer = require("../models/customerModel");
const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const SubscriptionPlan = require("../models/subscrptionplanModel");
const Subscription = require("../models/subscrptionModel");
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
//     address,
//   } = req.body;

//   if (
//     !name ||
//     !phoneNumber ||
//     !productType ||
//     !deliveryDays ||
//     !deliveryBoy ||
//     !subscriptionPlan ||
//     !quantity ||
//     !address
//   ) {
//     return next(new ErrorHandler("All fields are required", 400));
//   }

//   const customer = await Customer.create({
//     name,
//     phoneNumber,
//     productType,
//     deliveryDays,
//     deliveryBoy,
//     subscriptionPlan,
//     quantity,
//     address,
//     createdBy: req.user?._id || null, // attach user if available
//   });

//   res.status(201).json({
//     success: true,
//     message: "Customer created successfully",
//     customer,
//   });
// });
exports.createCustomer = catchAsyncErrors(async (req, res, next) => {
  const {
    name,
    phoneNumber,
    productType,
    deliveryDays,
    deliveryBoy,
    subscriptionPlan,
    quantity,
    address,
    frequency, // optional
  } = req.body;

  // ✅ 1. Validate required fields
  if (
    !name ||
    !phoneNumber ||
    !productType ||
    !deliveryDays ||
    !deliveryBoy ||
    !subscriptionPlan ||
    !quantity ||
    !address
  ) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  // ✅ 2. Validate quantity
  const quantityNumber = Number(quantity);
  if (isNaN(quantityNumber) || quantityNumber <= 0) {
    return next(new ErrorHandler("Quantity must be a valid number", 400));
  }

  // ✅ 3. Validate subscription plan
  const plan = await SubscriptionPlan.findOne({ subscriptionPlan });
  if (!plan) {
    return next(new ErrorHandler("Subscription plan not found", 404));
  }

  // ✅ 4. Create Customer
  const customer = await Customer.create({
    name,
    phoneNumber,
    productType,
    deliveryDays,
    deliveryBoy,
    subscriptionPlan,
    quantity: quantityNumber,
    address,
    createdBy: req.user?._id || null, // Optional
  });

  // ✅ 5. Create Subscription linked to this customer
  const subscription = await Subscription.create({
    customer: customer._id,
    name: customer.name,
    phoneNumber: customer.phoneNumber,
    productType: customer.productType,
    deliveryDays: customer.deliveryDays,
    assignedDeliveryBoy: customer.deliveryBoy,
    address: customer.address,
    subscriptionPlan: plan.subscriptionPlan,
    frequency: frequency || "Every Day",
    price: plan.totalPrice,
    startDate: new Date(),
    endDate: null, // Optional: can be calculated later
    status: "Active",
    deliveryTime: plan.deliveryTime,
    products: plan.products,
    discount: plan.discount,
    totalPrice: plan.totalPrice,
    isActive: true,
  });

  // ✅ 6. Response
  res.status(201).json({
    success: true,
    message: "Customer and subscription created successfully",
    customer,
    subscription,
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
exports.getAllCustomers = catchAsyncErrors(async (req, res, next) => {
  // Fetch all customers with delivery boy and creator info
  const customers = await Customer.find()
    .populate("deliveryBoy", "name email phoneNumber area")
    .populate("createdBy", "name email");

  // Fetch all subscriptions (only active or blocked)
  const subscriptions = await Subscription.find({
    status: { $in: ["Active", "Blocked"] }
  }).select("customer status subscriptionPlan startDate endDate isActive");

  // Create a map of customerId => subscription details
  const subscriptionMap = {};
  subscriptions.forEach(sub => {
    if (sub.customer) {
      subscriptionMap[sub.customer.toString()] = {
        status: sub.status,
        subscriptionPlan: sub.subscriptionPlan,
        startDate: sub.startDate,
        endDate: sub.endDate,
        isActive: sub.isActive
      };
    }
  });

  // Attach subscription info to each customer
  const enrichedCustomers = customers.map(customer => {
    const subInfo = subscriptionMap[customer._id.toString()] || null;
    return {
      ...customer.toObject(),
      subscriptionStatus: subInfo?.status || "No Plan",
      subscriptionPlan: subInfo?.subscriptionPlan || null,
      subscriptionStartDate: subInfo?.startDate || null,
      subscriptionEndDate: subInfo?.endDate || null,
      isActive: subInfo?.isActive ?? false
    };
  });

  res.status(200).json({
    success: true,
    count: enrichedCustomers.length,
    customers: enrichedCustomers
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
exports.updateCustomer = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  let customer = await Customer.findById(id);
  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  customer = await Customer.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });
   if (req.file) {
       customer.userProfile = req.file.path; // S3 puts the file URL in .location
   }

  res.status(200).json({
    success: true,
    message: "Customer updated successfully",
    customer,
  });
});

// ❌ Delete customer
exports.deleteCustomer = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const customer = await Customer.findById(id);
  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  await customer.remove();

  res.status(200).json({
    success: true,
    message: "Customer deleted successfully",
  });
});
