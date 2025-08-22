const express = require("express");
const {
  registerDeliveryBoy,
  loginDeliveryBoy,
  getAllDeliveryBoys,
  getDeliveryBoyById,
  updateDeliveryBoy,
  deleteDeliveryBoy,
  getTodayOrders,
  getOrdersByDateRange,
  getOrderStatistics
} = require("../controllers/delhiveryBoyController");

const router = express.Router();

// Auth routes
router.post("/register", registerDeliveryBoy);
router.post("/login", loginDeliveryBoy);
router.get("/getAll", getAllDeliveryBoys);
router.get("/getById/:id", getDeliveryBoyById);
router.put("/update/:id", updateDeliveryBoy);
router.delete("/delete/:id", deleteDeliveryBoy);

// Order routes
router.get('/todayOrder/:deliveryBoyId', getTodayOrders);
router.get('/range/:deliveryBoyId', getOrdersByDateRange);
// router.get('/stats/:deliveryBoyId', getOrderStatistics);

module.exports = router;