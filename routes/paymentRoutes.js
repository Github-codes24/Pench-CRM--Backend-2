const express = require("express");
const router = express.Router();

const {
  getPaymentSummary,
viewPaymentByCustomer,
getPaymentDetailsById,
getAllReceivedPayments,
viewPaymentDetails,
getAllPendingPayments,
getAllPartialPayments,
submitRemainingPayment
<<<<<<< HEAD
} = require("../controllers/paymentController");
=======
} = require("../controller/paymentController");
>>>>>>> f7f73c3f61cfbe4aeccc8cbcf6790ef8b13e454c

const { isAuthenticatedDeliveryBoy } = require("../middlewares/auth");

// 📋 Payment summary route (list + counts)
router.get("/payments/summary", isAuthenticatedDeliveryBoy, getPaymentSummary);

router.get("/view-payment/:id", viewPaymentByCustomer);
router.get("/payment/:id", getPaymentDetailsById);
router.get("/payments/received", getAllReceivedPayments);
router.get("/payment/view/:id", viewPaymentDetails);
router.get("/payments/pending", getAllPendingPayments);
router.get("/partial-payments", getAllPartialPayments);
router.post("/invoice/submit-remaining", submitRemainingPayment);

module.exports = router;
