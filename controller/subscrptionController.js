const Subscription = require("../models/subscrptionModel");
const Customer = require("../models/customerModel");
const Product = require("../models/productModel");
const DeliveryBoy = require("../models/deliveryBoyModel");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");
const SubscriptionPlan = require("../models/subscrptionplanModel");
// exports.createSubscription = catchAsyncErrors(async (req, res, next) => {
//   const {
//     customer,
//     name,
//     phoneNumber,
//     productType,
//     deliveryDays,
//     assignedDeliveryBoy,
//     subscriptionPlan,
//     address,
//   } = req.body;

//   // Validate required fields
//   if (
//     !customer ||
//     !name ||
//     !phoneNumber ||
//     !productType ||
//     !deliveryDays ||
//     !assignedDeliveryBoy ||
//     !subscriptionPlan ||
//     !address
//   ) {
//     return next(new ErrorHandler("All fields are required", 400));
//   }

//   // Frequency and price based on plan
//   let frequency, price, endDate;
//   const startDate = new Date();

//   if (subscriptionPlan === "Daily") {
//     frequency = "Every Day";
//     price = 70;
//     endDate = new Date(startDate);
//     endDate.setDate(startDate.getDate() + 1);
//   } else if (subscriptionPlan === "Weekly") {
//     frequency = "Every Day In Week";
//     price = 490;
//     endDate = new Date(startDate);
//     endDate.setDate(startDate.getDate() + 7);
//   } else if (subscriptionPlan === "Monthly") {
//     frequency = "Every Day In Month";
//     price = 2100;
//     endDate = new Date(startDate);
//     endDate.setMonth(startDate.getMonth() + 1);
//   } else {
//     return next(new ErrorHandler("Invalid subscription plan", 400));
//   }

//   // Determine status
//   const now = new Date();
//   const status = endDate < now ? "Blocked" : "Active";

//   // Create subscription
//   const subscription = await Subscription.create({
//     customer,
//     name,
//     phoneNumber,
//     productType,
//     deliveryDays,
//     assignedDeliveryBoy,
//     subscriptionPlan,
//     address,
//     frequency,
//     price,
//     startDate,
//     endDate,
//     status,
//   });

//   // Populate referenced fields
//   const populatedSubscription = await Subscription.findById(subscription._id)
//     .populate({
//       path: "customer",
//       select: "name phoneNumber address"
//     })
//     .populate({
//       path: "assignedDeliveryBoy",
//       select: "name phoneNumber area"
//     });

//   res.status(201).json({
//     success: true,
//     message: "Subscription created successfully",
//     subscription: {
//       _id: populatedSubscription._id,
//       productType: populatedSubscription.productType,
//       frequency: populatedSubscription.frequency,
//       price: populatedSubscription.price,
//       subscriptionPlan: populatedSubscription.subscriptionPlan,
//       deliveryDays: populatedSubscription.deliveryDays,
//       startDate: populatedSubscription.startDate,
//       endDate: populatedSubscription.endDate,
//       status: populatedSubscription.status,
//       address: populatedSubscription.address,
//       customer: populatedSubscription.customer,
//       deliveryBoy: populatedSubscription.assignedDeliveryBoy,
//     },
//   });
// });

exports.createSubscription = catchAsyncErrors(async (req, res, next) => {
  const {
    name, // customer name (input)
    phoneNumber,
    deliveryDays,
    assignedDeliveryBoy,
    subscriptionPlan,
    address,
    selectedProductTypes // Array of selected product types
  } = req.body;

  if (
    !name || !phoneNumber || !deliveryDays ||
    !assignedDeliveryBoy || !subscriptionPlan || !address ||
    !selectedProductTypes || !Array.isArray(selectedProductTypes) || selectedProductTypes.length === 0
  ) {
    return next(new ErrorHandler("All fields are required including selected products", 400));
  }

  // Step 1: Find customer by name
  const customerDoc = await Customer.findOne({ name });
  if (!customerDoc) {
    return next(new ErrorHandler("Customer not found with this name", 404));
  }

  // Step 2: Fetch the plan and its products
  const plan = await SubscriptionPlan.findOne({ subscriptionPlan }).populate("products");
  if (!plan) {
    return next(new ErrorHandler("Subscription plan not found", 404));
  }

  const { products, totalPrice, deliveryTime, discount } = plan;

  // Step 3: Filter selected product types
  const selectedProducts = products.filter(prod =>
    selectedProductTypes.includes(prod.productType)
  );

  if (selectedProducts.length === 0) {
    return next(new ErrorHandler("Selected product types do not match available plan products", 400));
  }

  // Step 4: Frequency & End Date logic
  let frequency, endDate;
  const startDate = new Date();

  if (subscriptionPlan === "Daily") {
    frequency = "Every Day";
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
  } else if (subscriptionPlan === "Weekly") {
    frequency = "Every Day In Week";
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
  } else if (subscriptionPlan === "Monthly") {
    frequency = "Every Day In Month";
    endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
  } else {
    return next(new ErrorHandler("Invalid subscription plan type", 400));
  }

  const status = endDate < new Date() ? "Blocked" : "Active";

  // Step 5: Create Subscription
  const subscription = await Subscription.create({
    customer: customerDoc._id,
    name,
    phoneNumber,
    deliveryDays,
    assignedDeliveryBoy,
    subscriptionPlan,
    address,
    frequency,
    price: totalPrice,
    startDate,
    endDate,
    status,
    products: selectedProducts.map(p => p._id)
  });

  // Step 6: Populate for response
  const populated = await Subscription.findById(subscription._id)
    .populate("products", "productType price quantity size")
    .populate("customer", "name phoneNumber address gender")
    .populate("assignedDeliveryBoy", "name phoneNumber area");

  res.status(201).json({
    success: true,
    message: "Subscription created successfully",
    subscription: {
      _id: populated._id,
      plan: populated.subscriptionPlan,
      frequency: populated.frequency,
      price: populated.price,
      status: populated.status,
      deliveryDays: populated.deliveryDays,
      startDate: populated.startDate,
      endDate: populated.endDate,
      deliveryTime,
      discount,
      address: populated.address,
      customer: populated.customer,
      deliveryBoy: populated.assignedDeliveryBoy,
      products: populated.products.map(p => ({
        id: p._id,
        productType: p.productType,
        price: p.price,
        quantity: p.quantity,
        size: p.size
      }))
    }
  });
});

exports.editSubscription = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const {
    name, // updated customer name
    phoneNumber,
    deliveryDays,
    assignedDeliveryBoy,
    subscriptionPlan,
    address,
    selectedProductTypes // updated product types
  } = req.body;

  // if (
  //   !name || !phoneNumber || !deliveryDays ||
  //   !assignedDeliveryBoy || !subscriptionPlan || !address ||
  //   !selectedProductTypes || !Array.isArray(selectedProductTypes) || selectedProductTypes.length === 0
  // ) {
  //   return next(new ErrorHandler("All fields are required including selected products", 400));
  // }

  // Step 1: Get the customer document from name
  const customerDoc = await Customer.findOne({ name });
  if (!customerDoc) {
    return next(new ErrorHandler("Customer not found with this name", 404));
  }

  // Step 2: Get subscription plan with populated products
  const plan = await SubscriptionPlan.findOne({ subscriptionPlan }).populate("products");
  if (!plan) {
    return next(new ErrorHandler("Subscription plan not found", 404));
  }

  const { products, totalPrice, deliveryTime, discount } = plan;

  // Step 3: Filter only selected product types
  const selectedProducts = products.filter(prod =>
    selectedProductTypes.includes(prod.productType)
  );

  if (selectedProducts.length === 0) {
    return next(new ErrorHandler("Selected product types do not match plan products", 400));
  }

  // Step 4: Calculate frequency and end date
  let frequency, endDate;
  const startDate = new Date();

  if (subscriptionPlan === "Daily") {
    frequency = "Every Day";
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
  } else if (subscriptionPlan === "Weekly") {
    frequency = "Every Day In Week";
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
  } else if (subscriptionPlan === "Monthly") {
    frequency = "Every Day In Month";
    endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
  } else {
    return next(new ErrorHandler("Invalid subscription plan type", 400));
  }

  const status = endDate < new Date() ? "Blocked" : "Active";

  // Step 5: Update the existing subscription
  const updated = await Subscription.findByIdAndUpdate(
    id,
    {
      customer: customerDoc._id,
      name,
      phoneNumber,
      deliveryDays,
      assignedDeliveryBoy,
      subscriptionPlan,
      address,
      frequency,
      price: totalPrice,
      startDate,
      endDate,
      status,
      products: selectedProducts.map(p => p._id),
    },
    { new: true, runValidators: true }
  )
    .populate("products", "productType price quantity size")
    .populate("customer", "name phoneNumber address gender")
    .populate("assignedDeliveryBoy", "name phoneNumber area");

  if (!updated) {
    return next(new ErrorHandler("Subscription not found", 404));
  }

  // Step 6: Return updated response
  res.status(200).json({
    success: true,
    message: "Subscription updated successfully",
    subscription: {
      _id: updated._id,
      plan: updated.subscriptionPlan,
      frequency: updated.frequency,
      price: updated.price,
      status: updated.status,
      deliveryDays: updated.deliveryDays,
      startDate: updated.startDate,
      endDate: updated.endDate,
      deliveryTime,
      discount,
      address: updated.address,
      customer: updated.customer,
      deliveryBoy: updated.assignedDeliveryBoy,
      products: updated.products.map(p => ({
        id: p._id,
        productType: p.productType,
        price: p.price,
        quantity: p.quantity,
        size: p.size
      }))
    }
  });
});





exports.getAllSubscriptions = catchAsyncErrors(async (req, res, next) => {
  const subscriptions = await Subscription.find()
    .populate({
      path: "customer",
      select: "name phoneNumber"
    })
    .populate({
      path: "assignedDeliveryBoy",
      select: "name phoneNumber area"
    })
    .sort({ createdAt: -1 });

  const subscriptionList = subscriptions.map(sub => ({
    _id: sub._id,
    customerName: sub.customer?.name || "N/A",
    phoneNumber: sub.customer?.phoneNumber || "N/A",
    deliveryDays: sub.deliveryDays,
    status: sub.status,
    plan: sub.subscriptionPlan
  }));

  res.status(200).json({
    success: true,
    total: subscriptionList.length,
    subscriptions: subscriptionList
  });
});

exports.getSubscriptionById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const subscription = await Subscription.findById(id)
    .populate({
      path: "customer",
      select: "name gender phoneNumber address"
    });

  if (!subscription) {
    return next(new ErrorHandler("Subscription not found", 404));
  }

  const response = {
    customerName: subscription.customer?.name || "N/A",
    gender: subscription.customer?.gender || "N/A",
    phoneNumber: subscription.customer?.phoneNumber || "N/A",
    address: subscription.customer?.address || "N/A",
    subscriptionPlan: subscription.subscriptionPlan,
    deliveryDays: subscription.deliveryDays,
    status: subscription.status
  };

  res.status(200).json({
    success: true,
    subscription: response
  });
});



exports.createSubscriptionPlan = catchAsyncErrors(async (req, res, next) => {
  const { subscriptionPlan, discount, totalPrice, deliveryTime, products } = req.body;

  if (!subscriptionPlan || !totalPrice || !deliveryTime || !products || products.length === 0) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  // Validate and fetch products
  const fetchedProducts = await Product.find({ _id: { $in: products } });

  if (fetchedProducts.length !== products.length) {
    return next(new ErrorHandler("Some products are invalid", 400));
  }

  const newPlan = await SubscriptionPlan.create({
    subscriptionPlan,
    discount,
    totalPrice,
    deliveryTime,
    products: fetchedProducts.map(p => p._id),
  });

  // Populate productType
  const populatedPlan = await SubscriptionPlan.findById(newPlan._id).populate({
    path: "products",
    select: "productType price quantity size stock"
  });

  res.status(201).json({
    success: true,
    message: "Subscription Plan created successfully",
    subscriptionPlan: {
      _id: populatedPlan._id,
      subscriptionPlan: populatedPlan.subscriptionPlan,
      discount: populatedPlan.discount,
      totalPrice: populatedPlan.totalPrice,
      deliveryTime: populatedPlan.deliveryTime,
      products: populatedPlan.products.map(prod => ({
        _id: prod._id,
        productType: prod.productType,
        price: prod.price,
        quantity: prod.quantity,
        size: prod.size,
        stock: prod.stock
      }))
    }
  });
});

// controllers/subscriptionController.js
exports.updateSubscription = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const {
    subscriptionPlan,
    discount,
    totalPrice,
    deliveryTime,
    products
  } = req.body;

  const subscription = await SubscriptionPlan.findById(id);
  if (!subscription) {
    return next(new ErrorHandler("Subscription not found", 404));
  }

  // Update only the fields provided
  if (subscriptionPlan) subscription.subscriptionPlan = subscriptionPlan;
  if (typeof discount === "number") subscription.discount = discount;
  if (typeof totalPrice === "number") subscription.totalPrice = totalPrice;
  if (deliveryTime) subscription.deliveryTime = deliveryTime;
  if (Array.isArray(products)) subscription.products = products;

  await subscription.save();

  res.status(200).json({
    success: true,
    message: "Subscription updated successfully",
    subscription,
  });
});
