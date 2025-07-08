const Invoice = require("../models/invoiceModel");
const Customer = require("../models/customerModel");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");

// ➕ Create a new invoice
exports.createInvoice = catchAsyncErrors(async (req, res, next) => {
  const {
    customer,
    productType,
    productQuantity,
    price,
    subscriptionPlan,
    paymentMode,
    paymentStatus
  } = req.body;

  if (!customer || !productType || !productQuantity || !price || !subscriptionPlan || !paymentMode) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  // Optionally check if the customer exists
  const customerExists = await Customer.findById(customer);
  if (!customerExists) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  const invoice = await Invoice.create({
    customer,
    productType,
    productQuantity,
    price,
    subscriptionPlan,
    paymentMode,
    paymentStatus
  });

  res.status(201).json({
    success: true,
    message: "Invoice created successfully",
    invoice
  });
});

// 📋 Get all invoices
exports.getAllInvoices = catchAsyncErrors(async (req, res, next) => {
  const invoices = await Invoice.find()
    .populate("customer", "name phoneNumber address");

  res.status(200).json({
    success: true,
    count: invoices.length,
    invoices
  });
});

// 🔍 Get single invoice by ID
exports.getInvoiceById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const invoice = await Invoice.findById(id).populate("customer", "name phoneNumber address");

  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  res.status(200).json({
    success: true,
    invoice
  });
});

// ✏️ Update invoice
exports.updateInvoice = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  let invoice = await Invoice.findById(id);
  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  invoice = await Invoice.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: "Invoice updated successfully",
    invoice
  });
});

// ❌ Delete invoice
exports.deleteInvoice = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const invoice = await Invoice.findById(id);
  if (!invoice) {
    return next(new ErrorHandler("Invoice not found", 404));
  }

  await invoice.remove();

  res.status(200).json({
    success: true,
    message: "Invoice deleted successfully"
  });
});
