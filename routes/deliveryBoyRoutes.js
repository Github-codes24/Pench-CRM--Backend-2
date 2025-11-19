const express = require("express");
const {
  registerDeliveryBoy,
  loginDeliveryBoy,
  logoutDeliveryBoy,
  getAllDeliveryBoys,
  updateDeliveryBoy,
  deleteDeliveryBoy,
  getDeliveryBoyProfile,
  getDeliveryBoyById,
  getOrdersByDeliveryBoy,
  shareConsumeToken,
  getDeliveryBoyOwnBootleTrackingRecord,
  getOrderHistory,
  getPendingBottles,
  getAllMilkBottleSizes,
} = require("../controllers/deliveryBoyController");

const { upload } = require("../config/cloudinary");
const {
  verifyDeliveryBoyToken,
} = require("../middlewares/deliveryBoy.middleware");

const router = express.Router();

// Auth routes
router.post("/register", upload.single("profileImage"), registerDeliveryBoy);
router.post("/login", loginDeliveryBoy);
router.get("/getAllDeliveryBoy", getAllDeliveryBoys);
router.get(
  "/deliveryBoyProfile",
  verifyDeliveryBoyToken,
  getDeliveryBoyProfile
);
router.get("/getDeliveryBoyById/:id", getDeliveryBoyById);
router.put(
  "/updateDeliveryBoyProfile/:id",
  upload.single("profileImage"),
  updateDeliveryBoy
);
router.delete("/delete/:id", deleteDeliveryBoy);
router.get(
  "/getOrdersByDeliveryBoy",
  verifyDeliveryBoyToken,
  getOrdersByDeliveryBoy
);
router.get("/shareToken", shareConsumeToken);
router.get(
  "/getDeliveryBoyBootleTracking",
  verifyDeliveryBoyToken,
  getDeliveryBoyOwnBootleTrackingRecord
);
router.get("/getOrderHistory", verifyDeliveryBoyToken, getOrderHistory);
router.get("/getPendingBottles", verifyDeliveryBoyToken, getPendingBottles);
router.post("/logout", verifyDeliveryBoyToken, logoutDeliveryBoy);
router.get("/getAllMilkBottleSizes", getAllMilkBottleSizes);
module.exports = router;
