<<<<<<< HEAD
=======
// routes/deliveryRoutes.js

// routes/dashboardRoutes.js
>>>>>>> f7f73c3f61cfbe4aeccc8cbcf6790ef8b13e454c
const express = require("express");
const router = express.Router();

const {
<<<<<<< HEAD
  createDeliveryBoy,
  loginDeliveryBoy,
  getAllDeliveryBoys,
  getDeliveryBoyById,
  updateDeliveryBoy,
  deleteDeliveryBoy,
  deliveryBoyForgotPassword,
  verifyOtpAndResetDeliveryBoyPassword,
  getDeliveryBoyNotifications,
  getUnreadNotifications,
  getDeliveryBoyLocation,
  markNotificationAsRead,
  updateshiftBoyDetails
} = require("../controllers/deliveryBoyController");

const { isAuthenticatedUser, isAuthenticatedDeliveryBoy } = require("../middlewares/auth");

router.post("/adddeliveryboy", isAuthenticatedUser, createDeliveryBoy);

router.put("/delivery-boy/shift", updateshiftBoyDetails);
router.post("/deliveryboy/login", loginDeliveryBoy);
router.get("/getalldeliveryboys", getAllDeliveryBoys);
router.get("/getdeliveryboy/:id", getDeliveryBoyById);
router.put("/updatedeliveryboy/deliveryboys/:id", updateDeliveryBoy);
router.post("/forgot-password", deliveryBoyForgotPassword);
router.post("/reset-password", verifyOtpAndResetDeliveryBoyPassword);
router.delete("/deletedeliveryboy/:id", isAuthenticatedUser, deleteDeliveryBoy);
router.get("/deliveryboy/notifications", isAuthenticatedDeliveryBoy, getDeliveryBoyNotifications);
router.get("/deliveryboy/notifications/unread", isAuthenticatedDeliveryBoy, getUnreadNotifications);
router.put("/deliveryboy/notifications/read/:notificationId", isAuthenticatedDeliveryBoy, markNotificationAsRead);
router.get("/deliveryboy/location/:deliveryBoyId", getDeliveryBoyLocation); // Changed from GET to POST
=======
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
>>>>>>> f7f73c3f61cfbe4aeccc8cbcf6790ef8b13e454c

module.exports = router;
