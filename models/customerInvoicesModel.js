const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    phoneNumber: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    subscriptionPlan: {
      type: String,
      enum: ["Monthly", "Alternate Days", "Custom Date"],
    },
    Deliveries: {
      type: Number,
      default: 0,
    },
    absentDays: [
      {
        type: Date,
      },
    ],
    actualOrders: {
      type: Number,
      default: 0,
    },
    pdfUrl: {
      type: String,
    },
    period: {
      startDate: { type: Date },
      endDate: { type: Date },
    },
    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        productName: { type: String },
        productSize: { type: String },
        quantity: { type: Number },
        price: { type: Number },
        totalPrice: { type: Number },        
      },
    ],
    payment: {
      status: {
        type: String,
        enum: ["Paid", "Partially Paid", "Unpaid"],
        default: "Unpaid",
      },
      method: {
        type: String,
        enum: ["COD", "Online"],
        default: "COD",
      },
      amount: { type: Number, default: 0 },
      paidDate: { type: Date },
      partialPayments: [
        {
          amount: { type: Number },
          date: { type: Date },
          method: { type: String },
          notes: { type: String },
        },
      ],
    },
    totals: {
      subtotal: { type: Number, default: 0 },
      paidAmount: { type: Number, default: 0 },
      balanceAmount: { type: Number, default: 0 },
      carryForwardAmount: { type: Number, default: 0 },
    },
    state: {
      type: String,
      enum: ["Draft", "Sent", "Paid"],
      default: "Draft",
    },    
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
