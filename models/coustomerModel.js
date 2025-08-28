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

    // ✅ Subscription products
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        price: {
          type: String,
          required: true
        },

        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },

        subscriptionPlan: {
          type: String,
          enum: ["Monthly", "Daily", "Alternate Days"],
          required: true,
        },

        deliveryDays: {
          type: String,
          enum: [
            "Daily",
            "Alternate Days",
            "Monday to Friday",
            "Weekends",
            "Custom",
          ],
          default: "Daily",
        },
        customDeliveryDates: {
          type: [Date],
          default: [],
        },
        startDate: {
          type: Date,
          default: Date.now,
        },

        endDate: {
          type: Date,
        },
        totalPrice: {
          type: Number,
          required: true,
        },
      },
    ],

    absentDays: {
      type: [Date],
      default: [],
    },

    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
    },

    amountPaidTillDate: {
      type: Number,
      default: 0,
    },
    amountDue: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ✅ Virtual populate for delivery history
// customerSchema.virtual("deliveryHistory", {
//   ref: "DeliveryHistory",
//   localField: "_id",
//   foreignField: "customer",
// });

// customerSchema.set("toJSON", { virtuals: true });
// customerSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Customer", customerSchema);
