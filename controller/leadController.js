const Lead = require("../models/leadModel");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");
const Customer = require("../models/customerModel");

// Create Lead
exports.createLead = catchAsyncErrors(async (req, res, next) => {
  const { date, customerName, source, product, status } = req.body;

  if (!date || !customerName || !source || !product || !status) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  const lead = await Lead.create({ date, customerName, source, product, status });

  res.status(201).json({
    success: true,
    message: "Lead created successfully",
    lead,
  });
});


// controller/lead.controller.js
exports.getLeadSummary = catchAsyncErrors(async (req, res, next) => {
  const totalLeads = await Lead.countDocuments();
  const convertedLeads = await Lead.countDocuments({ leadOutcome: "Converted" });

  const conversionRate = totalLeads === 0 ? 0 : Math.round((convertedLeads / totalLeads) * 100);

  // Aggregate to find top selling product (most interested product in leads)
  const topSellingProductAgg = await Lead.aggregate([
    { $group: { _id: "$product", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);

  const topSellingProduct = topSellingProductAgg[0]?._id || "N/A";
  const topSellingProductCount = topSellingProductAgg[0]?.count || 0;

  res.status(200).json({
    success: true,
    analytics: {
      totalLeads,
      convertedLeads,
      conversionRate: `${conversionRate}%`,
      topSellingProduct,
      topSellingSubscription: topSellingProductCount,
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
    name,
    phoneNumber,
    productType,
    deliveryDays,
    deliveryBoyId,
    subscriptionPlan,
    quantity,
    address
  } = req.body;

  // ✅ Validate required fields
  if (!name || !phoneNumber || !productType || !deliveryDays || !subscriptionPlan || !quantity || !address) {
    return next(new ErrorHandler("All fields are required to convert lead", 400));
  }

  // ✅ Find the lead
  const lead = await Lead.findById(id);
  if (!lead) return next(new ErrorHandler("Lead not found", 404));

  if (lead.leadOutcome === "Converted") {
    return next(new ErrorHandler("Lead already converted to customer", 400));
  }

  // ✅ Create the customer using provided data
  const customer = await Customer.create({
    name,
    phoneNumber,
    productType,
    deliveryDays,
    deliveryBoy: deliveryBoyId || null,
    subscriptionPlan,
    quantity,
    address
  });

  // ✅ Update the lead outcome
  lead.leadOutcome = "Converted";
  await lead.save();

  res.status(201).json({
    success: true,
    message: "Lead successfully converted to customer",
    customer
  });
});


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
exports.updateLead = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const lead = await Lead.findByIdAndUpdate(id, req.body, { new: true });

  if (!lead) {
    return next(new ErrorHandler("Lead not found", 404));
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
