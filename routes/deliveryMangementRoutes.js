// routes/deliveryRoutes.js

const express = require("express");
const router = express.Router();
const { getDeliveryManagement,getDeliveryDetails,updateInvoiceDetails } = require("../controller/deliveryManagemtnController");

router.get("/delivery/management", getDeliveryManagement);
router.get("/delivery/details/:id", getDeliveryDetails);
router.put("/invoice/:id/update", updateInvoiceDetails);

module.exports = router;
