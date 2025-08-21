const express = require("express");
const router = express.Router();
const {
  createTransaction,
  getAllTransactions,
  getTransactionsByDeliveryBoy,
  updateTransaction,
  deleteTransaction,
  getPendingBalance,
  updateReturnedBottles
} = require("../controllers/bottleTransactionController");

// POST - create transaction
router.post("/", createTransaction);

// GET - all transactions
router.get("/", getAllTransactions);

// GET - transactions by delivery boy
router.get("/deliveryBoy/:id", getTransactionsByDeliveryBoy);

// GET - current pending balance
router.get("/pending/:id", getPendingBalance);

// PUT - update transaction
router.put("/:id", updateTransaction);

// DELETE - delete transaction
router.delete("/:id", deleteTransaction);
router.put("/:id/return", updateReturnedBottles);

module.exports = router;
