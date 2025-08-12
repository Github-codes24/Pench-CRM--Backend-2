const Lead = require("../models/leadModel");
const Customer = require("../models/customerModel"); // assuming you have this
const mongoose = require("mongoose");

// Create Lead
exports.createLead = async (req, res) => {
  try {
    const lead = await Lead.create(req.body);
    res.status(201).json({ success: true, lead });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get All Leads (Generated Leads with pagination & filters)
exports.getAllLeads = async (req, res) => {
  try {
    let { page = 1, limit = 10, status, productType, search, startDate, endDate } = req.query;
    page = Number(page);
    limit = Number(limit);

    const filter = {};
    // Only show non-converted & non-not-interested leads (Generated leads)
    filter.leadOutcome = null;

    if (status) filter.status = status;
    if (productType) filter.productType = productType;

    if (search) {
      filter.$or = [
        { leadName: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } }
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    const total = await Lead.countDocuments(filter);

    const leads = await Lead.find(filter)
      .select("leadName phoneNumber productType productSize assignedDeliveryBoy leadOutcome createdAt source")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    // Map to friendly fields for frontend
    const formattedLeads = leads.map(l => ({
      _id: l._id,
      leadName: l.leadName,
      phoneNumber: l.phoneNumber,
      date: l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN") : null,
      dateISO: l.createdAt ? new Date(l.createdAt).toISOString() : null,
      source: l.source || null,
      productInterest: `${l.productType || ""} ${l.productSize || ""}`.trim(),
      converted: l.leadOutcome === "Converted" ? "Yes" : "No",
      assignedDeliveryBoy: l.assignedDeliveryBoy || null
    }));

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      leads: formattedLeads
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



// Get Lead by ID
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const leadObj = lead.toObject();
    leadObj.leadName = leadObj.leadName; // keep same
    leadObj.followUps = leadObj.followUps.map(fu => ({ date: fu.date })); // only date

    res.json({ success: true, lead: leadObj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Add Follow-Up
exports.addFollowUp = async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ success: false, message: "Description is required" });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    lead.followUps.push({ description });
    await lead.save();

    res.json({ success: true, message: "Follow-up added" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update Lead
exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Mark Not Interested
exports.markNotInterested = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    lead.leadOutcome = "Not Interested";
    await lead.save();

    res.json({ success: true, message: "Lead marked as Not Interested" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Convert Lead to Customer
exports.convertLeadToCustomer = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    // Ensure phone is unique in Customer
    const existingCustomer = await Customer.findOne({ phoneNumber: lead.phoneNumber });
    if (existingCustomer) {
      return res.status(400).json({ success: false, message: "Phone number already exists in customers" });
    }

    const customer = await Customer.create({
      name: lead.leadName,
      phoneNumber: lead.phoneNumber,
      address: lead.address,
      productType: lead.productType,
      productSize: lead.productSize,
      quantity: lead.quantity,
      price: lead.price,
      deliveryDays: lead.deliveryDays,
      subscriptionPlan: lead.subscriptionPlan,
      assignedDeliveryBoy: lead.assignedDeliveryBoy,
    });

    lead.leadOutcome = "Converted";
    await lead.save();

    res.json({ success: true, message: "Lead converted to customer", customer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Converted Leads
exports.getConvertedLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ leadOutcome: "Converted" });
    res.json({ success: true, leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
