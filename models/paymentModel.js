
const mongoose = require("mongoose");
const paymentSchema = new mongoose.Schema(
  {

    invoiceNumber: {
      type: String,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    totalAmount: {
      type: Number,
    },
    paidAmount: {
      type: Number,
    },

    productId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    paidDate: {
      type: Date,
    },
    note: {
      type: String,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "Online", "Other"],
      default: "Cash",
    },
    status: {
      type: String,
      enum: ["Paid", "Unpaid", "Partially Paid"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
