const DeliveryBoy = require("../models/deliveryBoyModel");
const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const Customer = require("../models/customerModel");
const Notification = require("../models/notificationModel");
const sendEmail = require("../utils/sendEmail");
const sendToken = require("../utils/jwtToken"); // ⬅ You can reuse your token util
const mongoose = require("mongoose");

// ─────────────────────────────────────────────
// Create Delivery Boy
// ─────────────────────────────────────────────
exports.createDeliveryBoy = catchAsyncErrors(async (req, res, next) => {
  const {
    name,
    email,
    password,
    phoneNumber,
    area,
    productType,
    // customerIds = [],
  } = req.body;

  // ── Validation ─────────────────────────────
  if (
    !name ||
    !email ||
    !password ||
    !phoneNumber ||
    !area ||
    !productType
    // productType.length === 0
  ) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  // ── Check duplicate email ──────────────────
  const existing = await DeliveryBoy.findOne({ email });
  if (existing) {
    return next(
      new ErrorHandler("Delivery boy with this email already exists", 409)
    );
  }

  // ── Hash password ──────────────────────────
  const hashedPassword = await bcrypt.hash(password, 10);

  // ── Create Delivery Boy ────────────────────
  const deliveryBoy = await DeliveryBoy.create({
    name,
    email,
    password: hashedPassword,
    phoneNumber,
    area,
    productType,
  });

  // ── Assign Customers (if provided) ─────────
  // if (customerIds.length > 0) {
  //   await Customer.updateMany(
  //     { _id: { $in: customerIds } },
  //     { deliveryBoy: deliveryBoy._id }
  //   );
  // }

  // ── Response ───────────────────────────────
  res.status(201).json({
    success: true,
    message:
      // customerIds.length > 0
      //   ? "Delivery boy created and customers assigned successfully"
      //   : "Delivery boy created successfully",
      deliveryBoy,
  });
});

exports.updateshiftBoyDetails = catchAsyncErrors(async (req, res, next) => {
  const { deliveryBoyId, area, productType, customerIds = [] } = req.body;

  if (!deliveryBoyId || !area || !productType || productType.length === 0) {
    return next(
      new ErrorHandler(
        "Delivery boy ID, area, and productType are required",
        400
      )
    );
  }

  const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
  if (!deliveryBoy) {
    return next(new ErrorHandler("Delivery boy not found", 404));
  }

  // Update area and product type
  deliveryBoy.area = area;
  deliveryBoy.productType = productType;

  // Update customer assignments if provided
  if (customerIds.length > 0) {
    deliveryBoy.assignedCustomers = customerIds;

    // Update each customer with this delivery boy ID
    await Customer.updateMany(
      { _id: { $in: customerIds } },
      { deliveryBoy: deliveryBoy._id }
    );
  }

  await deliveryBoy.save();

  res.status(200).json({
    success: true,
    message: "Delivery boy updated and customers reassigned successfully",
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

  sendToken(deliveryBoy, 200, res); // ⬅ You can reuse your token util
});

// 📋 Get all delivery boys
exports.getAllDeliveryBoys = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoys = await DeliveryBoy.find().populate(
    "assignedCustomers",
    "name phoneNumber address"
  );

  res.status(200).json({
    success: true,
    message: "Delivery boys fetched successfully",
    meta: {
      total: deliveryBoys.length,
      timestamp: new Date(),
    },
    data: deliveryBoys.map((boy) => ({
      id: boy._id,
      name: boy.name,
      email: boy.email,
      phoneNumber: boy.phoneNumber,
      area: boy.area,
      productType: boy.productType,
      assignedCustomers: boy.assignedCustomers.map((cust) => ({
        id: cust._id,
        name: cust.name,
        phoneNumber: cust.phoneNumber,
        address: cust.address,
      })),
    })),
  });
});

// 🔍 Get delivery boy by ID
exports.getDeliveryBoyById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const deliveryBoy = await DeliveryBoy.findById(id).populate(
    "assignedCustomers",
    "name phoneNumber address"
  );

  if (!deliveryBoy) {
    return next(new ErrorHandler("Delivery boy not found", 404));
  }

  res.status(200).json({
    success: true,
    deliveryBoy,
  });
});

// ✏ Update delivery boy
const bcrypt = require("bcryptjs");

exports.updateDeliveryBoy = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // ✅ Validate MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid ID format", 400));
  }

  const { customerIds, password, ...rest } = req.body;

  // ✅ Check if delivery boy exists
  let deliveryBoy = await DeliveryBoy.findById(id);
  if (!deliveryBoy) {
    return next(new ErrorHandler("Delivery boy not found", 404));
  }

  // ✅ Handle assignedCustomers if customerIds are passed
  if (customerIds && Array.isArray(customerIds)) {
    rest.assignedCustomers = customerIds;

    // Update each customer with deliveryBoy ID
    await Customer.updateMany(
      { _id: { $in: customerIds } },
      { deliveryBoy: deliveryBoy._id }
    );
  }

  // ✅ If password is updated, hash it
  if (password && password.length >= 6) {
    const hashedPassword = await bcrypt.hash(password, 10);
    rest.password = hashedPassword;
  }

  // ✅ Perform update
  deliveryBoy = await DeliveryBoy.findByIdAndUpdate(id, rest, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Delivery boy updated successfully",
    deliveryBoy,
  });
});

// Forgot Password for DeliveryBoy
exports.deliveryBoyForgotPassword = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoy = await DeliveryBoy.findOne({ email: req.body.email });

  if (!deliveryBoy) {
    return next(new ErrorHandler("Delivery boy not found", 404));
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  deliveryBoy.otp = otp;
  deliveryBoy.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  await deliveryBoy.save({ validateBeforeSave: false });

  const message = ` Your password reset OTP is: ${otp}. It is valid for 10 minutes.`;

  try {
    await sendEmail({
      email: deliveryBoy.email,
      subject: "Delivery Boy Password Reset OTP",
      message,
    });

    res.status(200).json({
      success: true,
      message: `OTP sent to ${deliveryBoy.email} successfully`,
      otp: otp,
    });
  } catch (error) {
    console.error("Email send error:", error);
    deliveryBoy.otp = undefined;
    deliveryBoy.otpExpire = undefined;
    await deliveryBoy.save({ validateBeforeSave: false });

    return next(new ErrorHandler("Failed to send OTP email", 500));
  }
});

// controllers/deliveryBoyController.js

exports.verifyOtpAndResetDeliveryBoyPassword = catchAsyncErrors(
  async (req, res, next) => {
    const { otp, password, confirmPassword } = req.body;

    if (!otp || !password || !confirmPassword) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    const deliveryBoy = await DeliveryBoy.findOne({
      otp,
      otpExpire: { $gt: Date.now() },
    });

    if (!deliveryBoy) {
      return next(new ErrorHandler("Invalid or expired OTP", 400));
    }

    if (password !== confirmPassword) {
      return next(new ErrorHandler("Passwords do not match", 400));
    }

    deliveryBoy.password = password;
    deliveryBoy.otp = undefined;
    deliveryBoy.otpExpire = undefined;

    await deliveryBoy.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  }
);

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

// controllers/notificationController.js
// controllers/notificationController.js
exports.getDeliveryBoyNotifications = catchAsyncErrors(
  async (req, res, next) => {
    const deliveryBoyId = req.deliveryBoy?._id;

    if (!deliveryBoyId) {
      return next(
        new ErrorHandler("Not authorized. Delivery boy not found", 401)
      );
    }

    const notifications = await Notification.find({
      deliveryBoy: deliveryBoyId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      notifications,
    });
  }
);

// controllers/notificationController.js
exports.markNotificationAsRead = catchAsyncErrors(async (req, res, next) => {
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    return next(new ErrorHandler("Notification not found", 404));
  }

  notification.read = true;
  await notification.save();

  res.status(200).json({
    success: true,
    message: "Notification marked as read",
    notification,
  });
});

exports.getUnreadNotifications = catchAsyncErrors(async (req, res, next) => {
  const deliveryBoyId = req.deliveryBoy?._id;

  if (!deliveryBoyId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  const notifications = await Notification.find({
    deliveryBoy: deliveryBoyId,
    read: false,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: notifications.length,
    notifications,
  });
});

// exports.getDeliveryBoyLocation = async (req, res) => {
//   try {
//     const { deliveryBoyId } = req.body;

//     if (!deliveryBoyId) {
//       return res.status(400).json({ success: false, message: "Delivery boy ID is required in the request body" });
//     }

//     const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId).select("area name email phoneNumber");

//     if (!deliveryBoy) {
//       return res.status(404).json({ success: false, message: "Delivery boy not found" });
//     }

//     res.status(200).json({
//       success: true,
//       area: deliveryBoy.area,
//       name: deliveryBoy.name,
//       email: deliveryBoy.email,
//       phoneNumber:deliveryBoy.phoneNumber
//     });
//   } catch (error) {
//     console.error("Error fetching location:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

exports.getDeliveryBoyLocation = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params; // ✅ Use params instead of body

    if (!deliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "Delivery boy ID is required in the request parameters",
      });
    }

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId).select(
      "area name email phoneNumber"
    );

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    res.status(200).json({
      success: true,
      area: deliveryBoy.area,
      name: deliveryBoy.name,
      email: deliveryBoy.email,
      phoneNumber: deliveryBoy.phoneNumber,
    });
  } catch (error) {
    console.error("Error fetching location:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
