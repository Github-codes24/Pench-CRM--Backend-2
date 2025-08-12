// routes/deliveryRoutes.js

const express = require("express");
const router = express.Router();
const { getDeliveryManagement,gepaymentStatusDropdown,getDeliveryDetails,getpaymentModeDropdown,getDeliveryStatusDropdown,getAllProductsDropdown,getCustomerDropdown,getDeliveryBoyDropdown,updateInvoiceDetails } = require("../controllers/deliveryManagemtnController");

router.get("/delivery/management", getDeliveryManagement);
router.get("/delivery/details/:id", getDeliveryDetails);
router.put("/delivery/:id/update", updateInvoiceDetails);


router.get("/deliveryboy/dropdown", getDeliveryBoyDropdown);
router.get("/customer/dropdown", getCustomerDropdown);
router.get("/product/dropdown", getAllProductsDropdown);
router.get("/deliverystatus/dropdown", getDeliveryStatusDropdown);
router.get("/getpaymentMode/dropdown", getpaymentModeDropdown);
router.get("/payment/status/dropdown", gepaymentStatusDropdown);

module.exports = router;