const express = require("express");
const router = express.Router();
const { getLowStockProducts, getActiveSubscriptions } = require("../controllers/dashBoard");

router.get("/low-stock", getLowStockProducts);
router.get("/active-subscription", getActiveSubscriptions)

module.exports = router;
