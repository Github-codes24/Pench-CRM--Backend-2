const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
    },
    productType: {
      type: String,
      enum: ["A2 Milk", "A2 Cow Ghee", "Paneer", "Buttermilk", "Curd"],
      required: true,
    },
    deliveryDays: {
      type: String,
      enum: ["Daily", "Alternate Days", "Monday to Friday", "Weekends Only", "Custom Days"],
      required: true,
    },
    assignedDeliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    subscriptionPlan: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
      required: true,
    },
    frequency: {
      type: String, // Set dynamically
    },
    price: {
      type: Number, // Set dynamically
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
