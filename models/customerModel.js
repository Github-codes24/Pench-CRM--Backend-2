const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
    },
    productType: {
      type: String,
      enum: ["A2 Milk", "A2 Cow Ghee", "Paneer", "Buttermilk", "Curd"],
      required: [true, "Product type is required"],
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
      required: [true, "Delivery days are required"],
    },
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
      required: [true, "Delivery boy assignment is required"],
    },
    subscriptionPlan: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly", "Custom Days"],
      required: [true, "Subscription plan is required"],
    },
    quantity: {
      type: String, // e.g., "1L", "500ml"
      required: [true, "Product quantity is required"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UsersAuths",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Customer", customerSchema);
