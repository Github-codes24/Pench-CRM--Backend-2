const express = require("express");
const router = express.Router();
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  makeAbsentDays,
  getDeliveryDays,
  getSubscriptionPlan,
  getPaymentMethods,
  getPaymentStatus,
  addProductToCustomer,
  removeProductFromCustomer,
  updateCustomerProduct,
  getSubscriptionStatus,
  getCustomerOrdersByMonth,
} = require("../controllers/customerController");
const { upload } = require("../config/cloudinary");

// CRUD routes
router.post("/createCustomer", createCustomer);
router.get("/getAllCustomers", getAllCustomers);
router.get("/getCustomerById/:id", getCustomerById);
router.put("/update/:id", upload.single("image"), updateCustomer);
router.delete("/delete/:id", deleteCustomer);
router.post("/makeAbsentDays/:customerId", makeAbsentDays);
router.get("/getDeliveryDays", getDeliveryDays);
router.get("/getSubscriptionPlan", getSubscriptionPlan);
router.get("/payment-methods", getPaymentMethods);
router.get("/payment-status", getPaymentStatus);
router.get("/subscription-status", getSubscriptionStatus);
router.post("/addProduct/:customerId", addProductToCustomer);
router.post("/removeProduct/:customerId", removeProductFromCustomer);
router.put("/updateCustomerProduct/:customerId", updateCustomerProduct);
router.get("/ordersByMonth/:customerId", getCustomerOrdersByMonth);


module.exports = router;
