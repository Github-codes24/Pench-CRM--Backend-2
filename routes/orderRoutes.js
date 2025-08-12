const express = require("express");
const router = express.Router();
const { getCustomerOrders,getTotalSales,getOrderDetails,getCustomerSalesById,getMyAcceptedOrders,updateBottleReturnOrDelivery,getDeliveredOrders,getPendingOrders,getBottleReturnSummary,getAdminNotifications,getAllDeliveredInvoices,getAllPendingInvoices,getAllInvoicesWithSummary,getMyUnpaidOrders,acceptInvoiceAndPay,verifyInvoicePayment,getPendingPayments,acceptOrder,getAllOrderHistory } = require("../controllers/orderController");
const { isAuthenticatedDeliveryBoy } = require("../middlewares/auth");

router.get("/orders/:customerId", getCustomerOrders);
router.get("/totalsales", getTotalSales);
router.get("/sales/customer/:customerId", getCustomerSalesById);
router.get("/invoices/pending-payments", getPendingPayments);
router.get(
  "/deliveryboy/unpaid-orders",
  isAuthenticatedDeliveryBoy,
  getMyUnpaidOrders
);
router.get("/orderdetails/:id", isAuthenticatedDeliveryBoy, getOrderDetails);

router.get("/accepted-orders", isAuthenticatedDeliveryBoy, getMyAcceptedOrders);

router.put("/invoice/accept/:id", isAuthenticatedDeliveryBoy, acceptOrder);
router.put("/invoice/accept-pay/:id", isAuthenticatedDeliveryBoy, acceptInvoiceAndPay);
router.get("/verify-payment",verifyInvoicePayment);
router.get("/summary/bottle-return",isAuthenticatedDeliveryBoy, getBottleReturnSummary);
router.get("/all-invoices", isAuthenticatedDeliveryBoy, getAllInvoicesWithSummary);
router.get("/pending-invoices", isAuthenticatedDeliveryBoy, getAllPendingInvoices);
router.get("/delivered-invoices", isAuthenticatedDeliveryBoy, getAllDeliveredInvoices);
router.put("/invoice/:id/update-status", updateBottleReturnOrDelivery);
router.get("/order-history", isAuthenticatedDeliveryBoy,getAllOrderHistory);
router.get("/delivery/pending-orders", isAuthenticatedDeliveryBoy, getPendingOrders);
router.get("/delivery/delivered-orders", isAuthenticatedDeliveryBoy, getDeliveredOrders);


//notification
router.get("/getnotifications",getAdminNotifications)
module.exports = router;
