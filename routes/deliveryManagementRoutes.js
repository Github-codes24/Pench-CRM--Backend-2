// routes/deliveryRoutes.js
const express = require("express");
const router = express.Router();

const {
  createDeliveryBoy,
  updateshiftBoyDetails,
  loginDeliveryBoy,
  getAllDeliveryBoys,
  getDeliveryBoyById,
  updateDeliveryBoy,
  deliveryBoyForgotPassword,
  verifyOtpAndResetDeliveryBoyPassword,
  deleteDeliveryBoy,
  getDeliveryBoyNotifications,
  markNotificationAsRead,
  getUnreadNotifications,
  getDeliveryBoyLocation,
} = require("../controller/deliveryManagementController");

// Create new delivery boy
router.post("/createdeliveryboy", createDeliveryBoy);

// Update delivery boy shift details
router.put("/deliveryboy/shift/update", updateshiftBoyDetails);

// Delivery boy login
router.post("/deliveryboy/login", loginDeliveryBoy);

// Get all delivery boys
router.get("/alldeliveryboy", getAllDeliveryBoys);

// Get delivery boy by ID
router.get("/deliveryboy/:id", getDeliveryBoyById);

// Update delivery boy info
router.put("/deliveryboy/:id", updateDeliveryBoy);

// Forgot password
router.post("/deliveryboy/forgot-password", deliveryBoyForgotPassword);

// Verify OTP and reset password
router.post(
  "/deliveryboy/reset-password",
  verifyOtpAndResetDeliveryBoyPassword
);

// Delete delivery boy
router.delete("/deliveryboy/:id", deleteDeliveryBoy);

// Get notifications for delivery boy
router.get("/deliveryboy/:id/notifications", getDeliveryBoyNotifications);

// Mark notification as read
router.put(
  "/deliveryboy/notification/:notificationId/read",
  markNotificationAsRead
);

// Get unread notifications
router.get("/deliveryboy/:id/unread-notifications", getUnreadNotifications);

// Get delivery boy location
router.get("/deliveryboy/:id/location", getDeliveryBoyLocation);

module.exports = router;

// Delivery Boy:
// Main page:
// Field: sr no, delivery boy name,area assigned,mob no,Action(view,edit,delete)
// Filter:area ,search bar
// View  delivery boy:
// Field : delivery boy name , email,phone no,address,passwords,delivery boy assigned area(will be multiple),issues bottle, size,quantity . make the table show the assigned customer at the bottom(add area and date filter).
// Edit  delivery boy:
//  delivery boy name , email,phone no,address,passwords,delivery boy assigned area(will be multiple),issues bottle, size,quantity

// Add  delivery boy:
// Field :  delivery boy name , email,phone no,address,passwords,delivery boy assigned area(will be multiple),issues bottle, size,quantity.
