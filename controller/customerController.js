const Customer = require("../models/customerModel");
const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

// ➕ Add a new customer
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
  } = req.body;

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

  const customer = await Customer.create({
    name,
    phoneNumber,
    productType,
    deliveryDays,
    deliveryBoy,
    subscriptionPlan,
    quantity,
    address,
    createdBy: req.user?._id || null, // attach user if available
  });

  res.status(201).json({
    success: true,
    message: "Customer created successfully",
    customer,
  });
});

// 📋 Get all customers
exports.getAllCustomers = catchAsyncErrors(async (req, res, next) => {
  const customers = await Customer.find()
    .populate("deliveryBoy", "name email phoneNumber area")
    .populate("createdBy", "name email");

  res.status(200).json({
    success: true,
    count: customers.length,
    customers,
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
