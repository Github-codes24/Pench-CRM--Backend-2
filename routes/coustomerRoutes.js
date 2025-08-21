const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");

// CRUD routes
router.post("/", customerController.createCustomer);
router.get("/", customerController.getCustomers);
router.get("/:id", customerController.getCustomerById);
router.put("/:id", customerController.updateCustomer);
router.delete("/:id", customerController.deleteCustomer);

// Delivery history
router.post("/:customerId/delivery-history", customerController.addDeliveryHistory);

module.exports = router;
