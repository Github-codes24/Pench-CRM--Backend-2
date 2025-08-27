const express = require("express");
const router = express.Router();
const {
  TotalSales,
  getLowStockProducts,
  getActiveSubscriptions,
  getTopAndLowestProducts,
} = require("../controllers/dashboardController");

// Sales Routes
router.get("/total-sales", TotalSales);

router.get("/top-lowest/product", getTopAndLowestProducts);

// Inventory Routes
router.get("/inventory/low-stock", getLowStockProducts);

// Customer Routes
router.get("/customers/active-subscriptions", getActiveSubscriptions);

module.exports = router;