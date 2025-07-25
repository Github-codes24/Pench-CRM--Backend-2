const express = require("express");
const router = express.Router();

const {
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
} = require("../controller/deliveryBoyController");

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
router.get("/deliveryboy/location", getDeliveryBoyLocation); // Changed from GET to POST

module.exports = router;
