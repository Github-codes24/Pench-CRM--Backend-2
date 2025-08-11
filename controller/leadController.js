const Lead = require("../models/leadModel");
const Order = require("../models/orderModel");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");
const isScheduledOn = require("../utils/scheduleHelper");
const Customer = require("../models/customerModel");
const Product = require("../models/productModel");
const Subscription = require("../models/subscrptionplanModel")
// Create Lead
exports.createLead = catchAsyncErrors(async (req, res, next) => {
  const { date, customerName, source, product, status } = req.body;

  if (!date || !customerName || !source || !product || !status) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  // 🟡 Fetch the product from database by name
  const foundProduct = await Product.findOne({ productType: product });

  if (!foundProduct) {
    return res.status(404).json({
      success: false,
      message: `Product '${product}' not found`,
    });
  }

  // 🔵 Create lead with product reference (you can use ID or name as per your schema)
  const lead = await Lead.create({
    date,
    customerName,
    source,
    product: foundProduct._id, // or foundProduct.name if storing name directly
    status,
  });

  res.status(201).json({
    success: true,
    message: "Lead created successfully",
    lead,
  });
});
// controller/lead.controller.js
// controller/lead.controller.js
const moment = require("moment");

exports.getLeadSummary = catchAsyncErrors(async (req, res, next) => {
  const { filter } = req.query;

  // Determine the starting date based on the filter
  let startDate;
  if (filter === "daily") {
    startDate = moment().startOf("day").toDate();
  } else if (filter === "weekly") {
    startDate = moment().startOf("week").toDate();
  } else if (filter === "monthly"){
    startDate = moment().startOf("month").toDate();
  }

  // Build filter conditions
  const leadFilter = startDate ? { createdAt: { $gte: startDate } } : {};
  const subscriptionFilter = startDate ? { subscriptionPlan: { $exists: true, $ne: null }, createdAt: { $gte: startDate } } : { subscriptionPlan: { $exists: true, $ne: null } };

  // 1. Count leads and conversions
  const totalLeads = await Lead.countDocuments(leadFilter);
  const convertedLeads = await Lead.countDocuments({
    ...leadFilter,
    leadOutcome: "Converted"
  });

  const conversionRate = totalLeads === 0 ? 0 : Math.round((convertedLeads / totalLeads) * 100);

  // 2. Top selling product from leads
  const topSellingProductAgg = await Lead.aggregate([
    { $match: leadFilter },
    { $group: { _id: "$product", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);
  const topSellingProduct = topSellingProductAgg[0]?._id || "N/A";

  // 3. Top subscription plan used from subscriptions
  const topSubscriptionPlanAgg = await Subscription.aggregate([
    { $match: subscriptionFilter },
    { $group: { _id: "$subscriptionPlan", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);
  const topSellingSubscription = topSubscriptionPlanAgg[0]?._id || "N/A";

  res.status(200).json({
    success: true,
    filter: filter || "all",
    analytics: {
      totalLeads,
      convertedLeads,
      conversionRate: `${conversionRate}%`,
      topSellingProduct,
      topSellingSubscription
    }
  });
});



// Add Follow-Up to Lead with auto-generated date
exports.addFollowUp = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { description } = req.body;

  if (!description) {
    return next(new ErrorHandler("Follow-up description is required", 400));
  }

  const lead = await Lead.findById(id);
  if (!lead) {
    return next(new ErrorHandler("Lead not found", 404));
  }

  const currentDate = new Date();

  lead.followUps.push({
    date: currentDate,
    description,
  });

  await lead.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: "Follow-up added successfully",
    followUps: lead.followUps,
  });
});



// Convert Lead to Customer (Auto)
exports.convertLeadToCustomerfri = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // 1. Find the lead
  const lead = await Lead.findById(id);
  if (!lead) return next(new ErrorHandler("Lead not found", 404));

  // 2. Check if already converted
  if (lead.leadOutcome === "Converted") {
    return next(new ErrorHandler("Lead already converted to customer", 400));
  }

    const defaultPlan = "Daily";

  // ✅ Use a default valid phone number (or add phone to Lead model and use that)
  const defaultPhone = "9999999999";
  // 3. Create Customer from lead data
  const customer = await Customer.create({
    name: lead.customerName,
    productType: lead.product,
    subscriptionPlan: lead.defaultPlan, // You can map status to subscriptionPlan
    deliveryDays: "Daily",
    deliveryBoy: null, // Optional: Set later if needed
    quantity: 1,
    phoneNumber: defaultPhone,
    address: "N/A",
  });

  // 4. Update the lead outcome
  lead.leadOutcome = "Converted";
  await lead.save();

  res.status(201).json({
    success: true,
    message: "Lead successfully converted to customer",
    customer,
  });
});


exports.convertLeadToCustomer = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const {
    customerName,
    phoneNumber,
    address,
    productType,
    productSize,
    quantity,
    price,
    deliveryDays,
    customDates,
    subscriptionPlan,
    deliveryBoyId,
    paymentMode,
    paymentStatus,
  } = req.body;


  // ✅ Validate required fields
  if (
    !customerName ||
    !phoneNumber ||
    !productType ||
    !size ||
    !deliveryDays ||
    !subscriptionPlan ||
    !quantity ||
    !address || 
    !paymentMode
  ) {
    return next(new ErrorHandler("All required fields must be provided", 400));
  }

  // ✅ Fetch the product from DB using name + size
  const product = await Product.findOne({ productType});
  if (!product) {
    return next(new ErrorHandler(`Product '${productType}' not found`, 404));
  }

  // ✅ Find lead
  const lead = await Lead.findById(id);
  if (!lead) {
    return next(new ErrorHandler("Lead not found", 404));
  }

  if (lead.leadOutcome === "Converted") {
    return next(new ErrorHandler("Lead already converted", 400));
  }

  // ✅ Create new customer
  const customer = await Customer.create({
    name,
    phoneNumber,
    address,
    productType: product._id, // ObjectId reference to Product
    size,
    quantity,
    price: price || product.price, // pulled from product
    deliveryDays,
    subscriptionPlan: subscriptionPlan || null,
    deliveryBoy: deliveryBoyId || null,
    customDates: deliveryDays === "Custom Days" ? customDates : [],
  });

  // Create order linked to customer
  const order = await Order.create({
    customer: customer._id,
    product: product._id,
    quantity,
    price: price || product.price,
    deliveryDays,
    customDates: deliveryDays === "Custom Days" ? customDates : [],
    deliveryBoy: deliveryBoyId || null,
    paymentMode,
    paymentStatus,
  });

  // ✅ Update lead outcome
  lead.leadOutcome = "Converted";
  await lead.save();

  res.status(201).json({
    success: true,
    message: "Lead converted to customer successfully",
    customer,
    order,
  });
});

// showing list of orders with details to Admin
exports.getScheduleForDate = async (req, res) => {
  try {
    const dateStr = req.query.date;
    const target = dateStr ? new Date(dateStr) : new Date();
    target.setHours(0, 0, 0, 0);

    const orders = await Order.find({})
      .populate("customer", "name phoneNumber address")
      .populate("product", "productType size price")
      .populate("deliveryBoy", "name phoneNumber")
      .lean();

    const scheduled = orders
      .filter(order => isScheduledOn(order, target))
      .map(order => ({
        orderId: order._id,
        customer: order.customer && {
          id: order.customer._id,
          name: order.customer.name || order.customer.customerName || null,
          phoneNumber: order.customer.phoneNumber || null,
          address: order.customer.address || null
        },
        product: order.product
          ? {
              id: order.product._id,
              productType: order.product.productType || order.product.name || null,
              size: order.product.size || null,
              price: order.price ?? order.product.price ?? null
            }
          : {
              productType: order.productType || null,
              size: order.size || null,
              price: order.price || null
            },
        quantity: order.quantity,
        deliveryDays: order.deliveryDays,
        customMatch: Array.isArray(order.customDates)
          ? order.customDates.find(cd => {
              const d = new Date(cd.date);
              d.setHours(0, 0, 0, 0);
              return d.getTime() === target.getTime();
            })
          : null,
        deliveryBoy: order.deliveryBoy && {
          id: order.deliveryBoy._id,
          name: order.deliveryBoy.name,
          phoneNumber: order.deliveryBoy.phoneNumber
        },
        paymentMode: order.paymentMode || null,
        paymentStatus: order.paymentStatus || null,
        orderStatus: order.orderStatus || null,
        createdAt: order.createdAt
      }));

    res.status(200).json({
      success: true,
      date: target.toISOString().slice(0, 10),
      count: scheduled.length,
      scheduled
    });
  } catch (err) {
    console.error("getScheduleForDate error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};



// Mark Lead as Not Interested
exports.markLeadNotInterested = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const lead = await Lead.findById(id);
  if (!lead) {
    return next(new ErrorHandler("Lead not found", 404));
  }

  if (lead.leadOutcome === "Not Interested") {
    return next(new ErrorHandler("Lead is already marked as Not Interested", 400));
  }

  lead.leadOutcome = "Not Interested";
  await lead.save();

  res.status(200).json({
    success: true,
    message: "Lead marked as Not Interested",
    lead,
  });
});

// Get all converted leads
exports.getConvertedLeads = catchAsyncErrors(async (req, res, next) => {
  const convertedLeads = await Lead.find({ leadOutcome: "Converted" });

  res.status(200).json({
    success: true,
    count: convertedLeads.length,
    leads: convertedLeads,
  });
});




// Get All Leads
exports.getAllLeads = catchAsyncErrors(async (req, res, next) => {
  const leads = await Lead.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: leads.length,
    leads,
  });
});

exports.getLeadById = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;
    
    const lead = await Lead.findById(id);
    
    if (!lead) {
        return next(new ErrorHandler("Lead not found", 404));
    }
    
    res.status(200).json({
        success: true,
        lead,
    });
});

// Update Lead
// exports.updateLead = catchAsyncErrors(async (req, res, next) => {
//   const { id } = req.params;

//   const lead = await Lead.findByIdAndUpdate(id, req.body, { new: true });

//   if (!lead) {
//     return next(new ErrorHandler("Lead not found", 404));
//   }

//   res.status(200).json({
//     success: true,
//     message: "Lead updated successfully",
//     lead,
//   });
// });


// Update Lead
exports.updateLead = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { date, customerName, source, product, status } = req.body;

  const updateData = { date, customerName, source, product, status };

  if (product) {
    const foundProduct = await Product.findOne({ productType: product });
    if (!foundProduct) {
      return res.status(404).json({
        success: false,
        message: `Product '${product}' not found`,
      });
    }
    updateData.product = foundProduct._id; // or .productType depending on schema
  }

  const lead = await Lead.findByIdAndUpdate(id, updateData, { new: true });

  if (!lead) {
    return res.status(404).json({
      success: false,
      message: "Lead not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Lead updated successfully",
    lead,
  });
});

// Delete Lead
exports.deleteLead = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const lead = await Lead.findByIdAndDelete(id);

  if (!lead) {
    return next(new ErrorHandler("Lead not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Lead deleted successfully",
  });
});
