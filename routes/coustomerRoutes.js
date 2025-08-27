const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");

// CRUD routes
router.post("/createCustomer", customerController.createCustomer);
router.get("/getAllCustomers", customerController.getAllCustomers);
router.get("/getCustomerById/:id", customerController.getCustomerById);
router.put("/update/:id", customerController.updateCustomer);
router.delete("/delete/:id", customerController.deleteCustomer);
router.post("/makeAbsentDays/:id", customerController.makeAbsentDays);
router.post("/makeCustomOrders", customerController.createCustomOrder);


// Delivery history
// router.post("/:customerId/delivery-history", customerController.addDeliveryHistory);

module.exports = router;
