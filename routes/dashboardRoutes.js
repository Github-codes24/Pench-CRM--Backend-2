const express = require("express");
const router = express.Router();
const { getDashboardStats,getSalesReport,getWeeklyEarningsByDay,getDeliverySummary,getProductInsightThisWeek,getBottleTracking } = require("../controller/dashboardController");
const { isAuthenticatedUser } = require("../middlewares/auth");

router.get("/dashboard", isAuthenticatedUser, getDashboardStats);
router.get("/sales-report", getSalesReport);
router.get("/weekly-earnings-per-day", getWeeklyEarningsByDay);
router.get("/delivery-summary", getDeliverySummary);
router.get("/product-insight/", getProductInsightThisWeek);

router.get("/bottle-tracking", getBottleTracking);

module.exports = router;
