const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: String, required: true },
    price: { type: Number, required: true },
    deliveryDays: {
      type: String,
      enum: [
        "Daily",
        "Alternate Days",
        "Monday to Friday",
        "Weekends Only",
        "Custom Days",
      ],
      required: true,
    },
    customDates: [
      {
        date: { type: Date, required: true },
        quantity: { type: String, required: false }, // Optional override
      },
    ],
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
      required: false,
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "COD"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Unpaid"],
      default: "Unpaid",
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Delivered", "Cancelled"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
