const express = require("express");
const router = express.Router();
const {
  createDeliveryHistory,
  getAllDeliveries,
  getDeliveriesByCustomer,
  getDeliveriesByDeliveryBoy,
  updateDeliveryHistory,
  deleteDeliveryHistory,
} = require("../controllers/delhiveryHistoryController");

// Create new delivery history
router.post("/", createDeliveryHistory);

// Get all deliveries (with filters)
router.get("/", getAllDeliveries);

// Get deliveries by customer
router.get("/customer/:customerId", getDeliveriesByCustomer);

// Get deliveries by delivery boy
router.get("/deliveryBoy/:deliveryBoyId", getDeliveriesByDeliveryBoy);

// Update delivery history
router.put("/:id", updateDeliveryHistory);

// Delete delivery history
router.delete("/:id", deleteDeliveryHistory);

module.exports = router;
