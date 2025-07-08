const DeliveryBoy = require("../models/deliveryBoyModel");
const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const Customer = require("../models/customerModel");
const sendToken = require("../utils/jwtToken"); // ⬅️ You can reuse your token util
// ➕ Create a new delivery boy
exports.createDeliveryBoy = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password, phoneNumber, area, productType, customerIds = [] } = req.body;

  if (!name || !email || !password|| !phoneNumber || !area || !productType || productType.length === 0) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  const existing = await DeliveryBoy.findOne({ email });
  if (existing) {
    return next(new ErrorHandler("Delivery boy with this email already exists", 409));
  }

  // Create delivery boy
  const deliveryBoy = await DeliveryBoy.create({
    name,
    email,
    password,
    phoneNumber,
    area,
    productType,
    assignedCustomers: customerIds,
  });

  // Update each customer with this delivery boy
  await Customer.updateMany(
    { _id: { $in: customerIds } },
    { deliveryBoy: deliveryBoy._id }
  );

  res.status(201).json({
    success: true,
    message: "Delivery boy created and customers assigned successfully",
    deliveryBoy,
  });
});

// 🔐 Login Delivery Boy
exports.loginDeliveryBoy = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Please enter email and password", 400));
  }

  const deliveryBoy = await DeliveryBoy.findOne({ email }).select("+password");

  if (!deliveryBoy) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  const isPasswordMatched = await deliveryBoy.comparePassword(password);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  sendToken(deliveryBoy, 200, res); // ⬅️ You can reuse your token util
});



// 📋 Get all delivery boys
exports.getAllDeliveryBoys = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoys = await DeliveryBoy.find().populate("assignedCustomers", "name phoneNumber address");

  res.status(200).json({
    success: true,
    count: deliveryBoys.length,
    deliveryBoys,
  });
});

// 🔍 Get delivery boy by ID
exports.getDeliveryBoyById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const deliveryBoy = await DeliveryBoy.findById(id).populate("assignedCustomers", "name phoneNumber address");

  if (!deliveryBoy) {
    return next(new ErrorHandler("Delivery boy not found", 404));
  }

  res.status(200).json({
    success: true,
    deliveryBoy,
  });
});

// ✏️ Update delivery boy
exports.updateDeliveryBoy = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  let deliveryBoy = await DeliveryBoy.findById(id);
  if (!deliveryBoy) {
    return next(new ErrorHandler("Delivery boy not found", 404));
  }

  deliveryBoy = await DeliveryBoy.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Delivery boy updated successfully",
    deliveryBoy,
  });
});

// ❌ Delete delivery boy
exports.deleteDeliveryBoy = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoy = await DeliveryBoy.findById(req.params.id);
  if (!deliveryBoy) {
    return next(new ErrorHandler("Delivery boy not found", 404));
  }

  await deliveryBoy.remove();

  res.status(200).json({
    success: true,
    message: "Delivery boy deleted successfully",
  });
});
