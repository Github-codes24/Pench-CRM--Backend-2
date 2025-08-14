const ErrorHander = require("../utils/errorhandler");
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

exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new ErrorHander("Please login to access this resource", 401));
  }

  const decodedData = jwt.verify(
    token,
    process.env.JWT_SECRET || "HFFNSJGKFDAUGJDGDNBJ444GDGGhbhFGDU"
  );
  req.user = await User.findById(decodedData.id);

  next();
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
