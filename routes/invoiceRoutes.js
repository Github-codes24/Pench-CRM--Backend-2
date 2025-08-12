const express = require("express");
const router = express.Router();
const {
  createInvoice,
  sendInvoiceOnWhatsApp,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  sendMultipleInvoicesOnWhatsApp
} = require("../controllers/invoiceController");

const { isAuthenticatedUser } = require("../middlewares/auth");

// 📦 Create a new invoice
// router.post("/invoice", isAuthenticatedUser, createInvoice);
router.post("/invoice", createInvoice);

// 📋 Get all invoices
router.get("/invoices", isAuthenticatedUser, getAllInvoices);
router.get("/invoice/:id/send-whatsapp", sendInvoiceOnWhatsApp);
router.post("/invoice/send-multiple-whatsapp", sendMultipleInvoicesOnWhatsApp);

// 🔍 Get single invoice
router.get("/invoice/:id", isAuthenticatedUser, getInvoiceById);

// ✏️ Update invoice
router.put("/invoice/:id", isAuthenticatedUser, updateInvoice);

// ❌ Delete invoice
router.delete("/invoice/:id", isAuthenticatedUser, deleteInvoice);

module.exports = router;
