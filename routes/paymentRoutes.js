const express = require("express");
const router = express.Router();

const {
  getPaymentSummary,
viewPaymentByCustomer,
getPaymentDetailsById,
getAllReceivedPayments,
viewPaymentDetails,
getAllPendingPayments
} = require("../controller/paymentController");

const { isAuthenticatedDeliveryBoy } = require("../middlewares/auth");

// 📋 Payment summary route (list + counts)
router.get("/payments/summary", isAuthenticatedDeliveryBoy, getPaymentSummary);

router.get("/view-payment/:id", viewPaymentByCustomer);
router.get("/payment/:id", getPaymentDetailsById);
router.get("/payments/received", getAllReceivedPayments);
router.get("/payment/view/:id", viewPaymentDetails);
router.get("/payments/pending", getAllPendingPayments);

module.exports = router;
