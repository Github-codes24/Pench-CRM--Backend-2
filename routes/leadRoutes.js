const express = require("express");
const router = express.Router();
const {
  createLead,
  getAllLeads,
  getLeadById,
  addFollowUp,
  updateLead,
  markNotInterested,
  convertLeadToCustomer,
  markLeadNotInterested,getConvertedLeads,getLeadSummary,
  getScheduleForDate
} = require("../controllers/leadController");

// Create a new lead
router.post("/leads", createLead);

// Get all leads (with pagination & filters)
router.get("/leads", getAllLeads);

// Get lead by ID
router.get("/leads/:id", getLeadById);

// Add follow-up to a lead
router.post("/leads/:id/followup", addFollowUp);

// Update lead
router.put("/leads/:id", updateLead);

// Mark lead as not interested
router.patch("/leads/:id/not-interested", markNotInterested);

// Convert lead to customer
router.post("/leads/:id/convert", convertLeadToCustomer);

// Get all converted leads
router.get("/leads-converted", getConvertedLeads);

// router to show order details to admin
// router.get("/schedule/:date", getScheduleForDate);

module.exports = router;
