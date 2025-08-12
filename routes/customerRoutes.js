const express = require("express");
const router = express.Router();
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");

const { isAuthenticatedUser } = require("../middlewares/auth");
const upload = require("../utils/multer");

router.post("/addcustomer", isAuthenticatedUser, createCustomer);
router.get("/getallcustomers", getAllCustomers);
router.get("/getcustomer/:id", getCustomerById);
router.put("/updatecustomer/:id", isAuthenticatedUser, upload.single("userProfile"),updateCustomer);
router.delete("/deletecustomer/:id", isAuthenticatedUser, deleteCustomer);

module.exports = router;
