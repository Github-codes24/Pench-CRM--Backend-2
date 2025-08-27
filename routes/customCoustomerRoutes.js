const express = require("express");
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrdersByCustomer,

} = require("../controllers/customerCustomOrderController");

// Basic CRUD routes
// router.post("/", createOrder);
router.get("/", getAllOrders);
// router.get("/stats", getOrderStats);
router.get("/:id", getOrderById);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);

// Specific functionality routes
router.get("/customer/:customerId", getOrdersByCustomer);
// router.patch("/:id/status", updateOrderStatus);
// router.patch("/:id/assign-delivery-boy", assignDeliveryBoy);

module.exports = router;