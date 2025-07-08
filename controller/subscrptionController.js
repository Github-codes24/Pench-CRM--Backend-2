const Subscription = require("../models/subscriptionModel");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");

exports.createSubscription = catchAsyncErrors(async (req, res, next) => {
  const {
    customer,
    name,
    phoneNumber,
    productType,
    deliveryDays,
    assignedDeliveryBoy,
    subscriptionPlan,
    address,
  } = req.body;

  if (
    !customer ||
    !name ||
    !phoneNumber ||
    !productType ||
    !deliveryDays ||
    !assignedDeliveryBoy ||
    !subscriptionPlan ||
    !address
  ) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  // Auto-map frequency and price
  let frequency, price;
  if (subscriptionPlan === "Daily") {
    frequency = "Every Day";
    price = 70;
  } else if (subscriptionPlan === "Weekly") {
    frequency = "Every Day In Week";
    price = 490;
  } else if (subscriptionPlan === "Monthly") {
    frequency = "Every Day In Month";
    price = 2100;
  } else {
    return next(new ErrorHandler("Invalid subscription plan", 400));
  }

  const subscription = await Subscription.create({
    customer,
    name,
    phoneNumber,
    productType,
    deliveryDays,
    assignedDeliveryBoy,
    subscriptionPlan,
    address,
    frequency,
    price,
  });

  res.status(201).json({
    success: true,
    message: "Subscription created successfully",
    subscription,
  });
});
