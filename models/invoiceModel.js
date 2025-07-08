const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"]
    },
    invoiceDate: {
      type: Date,
      default: Date.now
    },
    productType: {
      type: String,
      enum: ["A2 Milk", "A2 Cow Ghee", "Paneer", "Buttermilk", "Curd"],
      required: [true, "Product type is required"]
    },
    productQuantity: {
      type: String, // e.g., "1L", "500ml"
      required: [true, "Product quantity is required"]
    },
    price: {
      type: Number,
      required: [true, "Price is required"]
    },
    subscriptionPlan: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
      required: [true, "Subscription plan is required"]
    },
    paymentMode: {
      type: String,
      enum: ["GooglePay", "BHIM", "UPI", "Cash"],
      required: [true, "Payment mode is required"]
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Unpaid"],
      default: "Unpaid"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
