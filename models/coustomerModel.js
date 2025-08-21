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
      unique: true,
    },
    userProfile: {
      type: String,
      default:
        "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },

    // ✅ Subscription products (array of objects)
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        subscriptionPlan: {
          type: String,
          enum: ["Daily", "Weekly", "Monthly"],
          required: true,
        },
        deliveryDays: {
          type: String,
          enum: ["Daily", "Alternate Days", "Monday to Friday", "Weekends ", "Custom"],
          default: "Daily",
        },
        customDeliveryDates: {
          type: [Date], // Only if "Custom" is selected
          default: [],
        },
        startDate: {
          type: Date,
          default: Date.now,
        },
        endDate: {
          type: Date, // Useful for fixed subscriptions
        },

        totalPrice: {
          type: Number,
          required: true,
        },
      },
    ],

    // ✅ Assigned delivery boy
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
    },

    // // ✅ Payment details
    // paymentMode: {
    //   type: String,
    //   enum: ["Cash", "UPI", "COD"],
    //   required: [true, "Payment mode is required"],
    // },

    amountPaidTillDate: {
      type: Number,
      default: 0,
    },
    amountDue: {
      type: Number,
      default: 0,
    },

    // ✅ Delivery history
    deliveryHistory: [
      {
        date: { type: Date},
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantityDelivered: { type: Number, default: 0 },
          totalPrice: {
          type: Number,
          required: true,
        },
        status: { type: String, enum: ["Delivered", "Missed", "Pending"], default: "Pending" },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Customer", customerSchema);
