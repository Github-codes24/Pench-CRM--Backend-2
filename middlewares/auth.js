const ErrorHander = require("../utils/errorhandler");
const Blacklist = require("../models/blacklistModel");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const DeliveryBoy = require("../models/deliveryBoyModel");

// exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
//   const token = req.cookies.token;

//   if (!token) {
//     return next(new ErrorHander("Please login to access this resource", 401));
//   }

//   const decodedData = jwt.verify(token, process.env.JWT_SECRET);
//   req.user = await User.findById(decodedData.id);

//   next();
// });

// exports.isAuthenticatedDeliveryBoy = catchAsyncErrors(async (req, res, next) => {
//   const token = req.cookies.token;

//   if (!token) {
//     return next(new ErrorHander("Please login to access this resource", 401));
//   }

//   const decodedData = jwt.verify(token, process.env.JWT_SECRET);
//   req.deliveryBoy = await DeliveryBoy.findById(decodedData.id);

//   next();
// });

//header

// Middleware to check if user is logged in

exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new ErrorHander("Please login to access this resource", 401));
  }

  // Check if token is blacklisted
  const blacklisted = await Blacklist.findOne({ token });
  if (blacklisted) {
    return next(new ErrorHander("Session expired, please log in again", 401));
  }

  try {
    const decodedData = jwt.verify(
      token,
      process.env.JWT_SECRET || "HFFNSJGKFDAUGJDGDNBJ444GDGGhbhFGDU"
    );
    req.user = await User.findById(decodedData.id);
    if (!req.user) {
      return next(new ErrorHander("User not found", 404));
    }
    next();
  } catch (err) {
    return next(new ErrorHander("Invalid or expired token", 401));
  }
});

exports.isAuthenticatedDeliveryBoy = catchAsyncErrors(
  async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new ErrorHander("Please login to access this resource", 401));
    }

    const token = authHeader.split(" ")[1];

    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    req.deliveryBoy = await DeliveryBoy.findById(decodedData.id);

    next();
  }
);

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHander(
          `Role: ${req.user.role} is not allowed to access this resource`,
          403
        )
      );
    }

    next();
  };
};
