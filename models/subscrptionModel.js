const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    name: {
      type: String,
      required: false,
    },
    phoneNumber: {
      type: String,
      required: false,
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
    },
    productType: {
      type: String,
      enum: ["A2 Milk", "A2 Cow Ghee", "Paneer", "Buttermilk", "Curd"],
      required: false,
    },
    deliveryDays: {
      type: String,
      enum: [
        "Daily",
        "Alternate Days",
        "Monday to Friday",
        "Weekends Only",
        "Custom Days"
      ],
      required: false,
    },
    assignedDeliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    subscriptionPlan: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
      required: false,
    },
    frequency: {
      type: String, // e.g., "Every Day", "Every Day in Week"
    },
    price: {
      type: Number,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Active", "Blocked"],
      default: "Active",
    },
    deliveryTime: {
      type: String,
      required: false
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: false,
      }
    ],
    discount: {
      type: Number,
      default: 0
    },
    totalPrice: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
