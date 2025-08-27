const mongoose = require("mongoose");

const deliveryHistorySchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        price: {
          type: String,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },

        totalPrice: {
          type: Number,
          required: true,
        },
        isDelivered: {
          type: Boolean,
          default: false,
        },
        status: {
          type: String,
          enum: ["absent", "delivered"],
        },
      },
    ],

    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Delivered", "Missed", "Pending"],
      default: "Pending",
    },
    amountPaid: {
      type: Number,
    },
    paymentMethod: {
      type: String,
       enum: ["Cash", "Card", "Online", "Other"],
        default: "Other",
    },

    bottleIssued: [
      {
        size: { type: String, required: true }, // e.g. "500ml", "1L"
        count: { type: Number, default: 0 }, // how many issued
      },
    ],

    bottleReturn: [
      {
        size: { type: String, required: true }, // e.g. "500ml", "1L"
        count: { type: Number, default: 0 }, // how many issued
      },
    ],

    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryHistory", deliveryHistorySchema);
