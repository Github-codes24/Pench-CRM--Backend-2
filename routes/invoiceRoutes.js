const express = require("express");
const router = express.Router();
const {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice
} = require("../controller/invoiceController");

const { isAuthenticatedUser } = require("../middlewares/auth");

// 📦 Create a new invoice
router.post("/invoice", isAuthenticatedUser, createInvoice);

// 📋 Get all invoices
router.get("/invoices", isAuthenticatedUser, getAllInvoices);

// 🔍 Get single invoice
router.get("/invoice/:id", isAuthenticatedUser, getInvoiceById);

// ✏️ Update invoice
router.put("/invoice/:id", isAuthenticatedUser, updateInvoice);

// ❌ Delete invoice
router.delete("/invoice/:id", isAuthenticatedUser, deleteInvoice);

module.exports = router;
