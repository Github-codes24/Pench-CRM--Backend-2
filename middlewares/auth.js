const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const DeliveryBoy = require("../models/deliveryBoyModel");



exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return next(new ErrorHander("Please login to access this resource", 401));
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decodedData.id);

  next();
});

exports.isAuthenticatedDeliveryBoy = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return next(new ErrorHander("Please login to access this resource", 401));
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  req.deliveryBoy = await DeliveryBoy.findById(decodedData.id);

  next();
});
exports.isAuthenticatedVendor = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return next(new ErrorHander("Please login to access this resource", 401));
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  req.vendor = await Vendor.findById(decodedData.id);

  next();
});

exports.isAuthenticatedDistributor = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return next(new ErrorHander("Please login to access this resource", 401));
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  req.distributor = await Distributor.findById(decodedData.id);

  next();
});


//header

// exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return next(new ErrorHander("Please login to access this resource", 401));
//   }

//   const token = authHeader.split(" ")[1];

//   const decodedData = jwt.verify(token, process.env.JWT_SECRET);
//   req.user = await User.findById(decodedData.id);

//   next();
// });


// exports.isAuthenticatedVendor = catchAsyncErrors(async (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return next(new ErrorHander("Please login to access this resource", 401));
//   }

//   const token = authHeader.split(" ")[1];

//   const decodedData = jwt.verify(token, process.env.JWT_SECRET);
//   req.vendor = await Vendor.findById(decodedData.id);

//   next();
// });

// exports.isAuthenticatedDistributor = catchAsyncErrors(async (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return next(new ErrorHander("Please login to access this resource", 401));
//   }

//   const token = authHeader.split(" ")[1];

//   const decodedData = jwt.verify(token, process.env.JWT_SECRET);
//   req.distributor = await Distributor.findById(decodedData.id);

//   next();
// });

exports.authorizeRoles = (...roles) =>{

    return(req,res,next)=>{
       if(!roles.includes(req.user.role)){
       return next(new ErrorHander(
            `Role: ${req.user.role} is not allowed to access this resource`,
            403
          )
         )
       }
       
      next();
    }
}

