const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const User = require("../models/userModel");
const sendToken = require("../utils/jwtToken");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
// Register

exports.registerUser = catchAsyncErrors(async (req, res, next) => {
  const {
    name,
    email,
    phoneNumber,
    companyName,
    gstNumber,
    password,
    address,
    role,
  } = req.body;

  if (!phoneNumber || !password) {
    return next(new ErrorHander("Phone number and password are required", 400));
  }

  const existing = await User.findOne({ phoneNumber });
  if (existing) {
    return next(new ErrorHander("Account already exists", 400));
  }

  const account = await User.create({
    name,
    email,
    phoneNumber,
    password,
    address,
    companyName,
    gstNumber,
    role,
  });

  sendToken(account, 201, res);
});

// Login API for both User and Admin
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return next(new ErrorHander("Please enter email and password", 400));
  }

  // Find user by email
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorHander("Invalid email or password", 401));
  }

  // Check password
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHander("Invalid email or password", 401));
  }

  // Check role if specified
  if (role) {
    if (role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
      return next(new ErrorHander("Not authorized as admin", 403));
    }
    if (role === "user" && user.role !== "user") {
      return next(new ErrorHander("Not authorized as user", 403));
    }
  }

  // You can customize token payload or response for admin vs user
  if (user.role === "SUPER_ADMIN") {
    sendToken(user, 200, res, { message: "Admin logged in successfully" });
  } else {
    sendToken(user, 200, res, { message: "User logged in successfully" });
  }
});

// Logout user
exports.logout = catchAsyncErrors(async (req, res, next) => {
  res.header("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});
// Get Single User Details
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    user,
  });
});

exports.getAllSellers = catchAsyncErrors(async (req, res, next) => {
  // Adjust the field name 'role' and value 'seller' based on your schema
  const sellers = await User.find();

  res.status(200).json({
    success: true,
    sellers,
    count: sellers.length,
  });
});

//Update UserProfile
exports.updateUserProfile = catchAsyncErrors(async (req, res, next) => {
  const { name, address, email, phoneNumber, companyName, gstNumber } =
    req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new ErrorHander("User not found", 404));
  }
  if (name) user.name = name;
  if (address) user.address = address;
  if (companyName) user.companyName = companyName;
  if (gstNumber) user.gstNumber = gstNumber;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (email) user.email = email;
  if (req.file) {
    user.userProfile = req.file.location; // S3 puts the file URL in .location
  }
  // Save the updated user
  await user.save();

  res.status(200).json({
    success: true,
    message: "User details updated successfully!",
    user,
  });
});

// -------------------------- Delete User --------------------------
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHander("User not found", 404));
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: "User deleted successfully!",
  });
});

// // Forgot Password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new ErrorHander("User not found", 404));
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000; // valid for 10 minutes
    await user.save({ validateBeforeSave: false });

    const message = `Your password reset OTP is: ${otp}. It is valid for 10 minutes.`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset OTP",
        message,
      });

      res.status(200).json({
        success: true,
        message: `OTP sent to ${user.email} successfully`,
      });
    } catch (error) {
      console.error("Email send error:", error);
      user.otp = undefined;
      user.otpExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new ErrorHander("Failed to send OTP email", 500));
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return next(new ErrorHander(error.message || "Internal Server Error", 500));
  }
});

// Reset Password
exports.verifyOtpAndResetPassword = catchAsyncErrors(async (req, res, next) => {
  const { otp, password, confirmPassword } = req.body;

  if (!otp || !password || !confirmPassword) {
    return next(new ErrorHander("All fields are required", 400));
  }

  // Find user by OTP and check if OTP is not expired
  const user = await User.findOne({
    otp,
    otpExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorHander("Invalid or expired OTP", 400));
  }

  if (password !== confirmPassword) {
    return next(new ErrorHander("Passwords do not match", 400));
  }

  user.password = password;
  user.otp = undefined;
  user.otpExpire = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successful",
  });
});
