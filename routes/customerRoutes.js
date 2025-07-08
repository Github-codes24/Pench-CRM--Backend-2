const express = require("express");
const router = express.Router();
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("../controller/customerController");

const { isAuthenticatedUser } = require("../middlewares/auth");

router.post("/addcustomer", isAuthenticatedUser, createCustomer);
router.get("/getallcustomers", getAllCustomers);
router.get("/getcustomer/:id", getCustomerById);
router.put("/updatecustomer/:id", isAuthenticatedUser, updateCustomer);
router.delete("/deletecustomer/:id", isAuthenticatedUser, deleteCustomer);

module.exports = router;
