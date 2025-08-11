const express = require("express");
const router = express.Router();
const {
  createLead,
  getAllLeads,
  updateLead,
  deleteLead,
  addFollowUp,
  convertLeadToCustomer,
  markLeadNotInterested,getLeadById,getConvertedLeads,getLeadSummary,
  getScheduleForDate
} = require("../controller/leadController");

router.get("/leads", getAllLeads);
router.get("/leadbyid/:id",getLeadById)
router.post("/addleads", createLead);
router.get("/leadsummary",getLeadSummary)

router.post("/addfollowup/:id", addFollowUp);
router.post("/convertedlead/:id/", convertLeadToCustomer);
router.get("/seeconverted",getConvertedLeads)
router.patch("/not-interested/:id/", markLeadNotInterested);

router.put("/updatelead/:id", updateLead);
router.delete("/deletelead/:id", deleteLead);

// router to show order details to admin
router.get("/schedule/:date", getScheduleForDate);

module.exports = router;
