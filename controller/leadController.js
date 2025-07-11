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

  // Auto-generate current date
  const currentDate = new Date();

  lead.followUps.push({
    date: currentDate,
    description,
  });

  await lead.save();

  res.status(200).json({
    success: true,
    message: "Follow-up added successfully",
    followUps: lead.followUps,
  });
});


// Convert Lead to Customer (Auto)
exports.convertLeadToCustomer = catchAsyncErrors(async (req, res, next) => {
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
