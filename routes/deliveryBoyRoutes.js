const express = require("express");
const router = express.Router();

const {
  getDashboardStats,
  getSalesReport,
  getWeeklyEarningsByDay,
  getDeliverySummary,
  getProductInsightThisWeek,
  getBottleTracking,
} = require("../controller/deliveryBoyController");

// Dashboard summary stats
router.get("/stats", getDashboardStats);

// Sales report
router.get("/sales-report", getSalesReport);

// Weekly / Monthly / Yearly earnings
// Example: /api/dashboard/earnings?type=weekly
router.get("/earnings", getWeeklyEarningsByDay);

// Delivery summary
// Example: /api/dashboard/delivery-summary?filter=daily
router.get("/delivery-summary", getDeliverySummary);

// Product insight (day/week/month)
// Example: /api/dashboard/product-insight?range=week
router.get("/product-insight", getProductInsightThisWeek);

// Bottle tracking
// Example: /api/dashboard/bottle-tracking?from=2025-08-01&to=2025-08-14
router.get("/bottle-tracking", getBottleTracking);

module.exports = router;
