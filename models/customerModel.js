const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
    },
    phoneNumber: {
      type: Number,
      required: [true, "Phone number is required"],
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v); // Ensure exactly 10 digits
        },
        message: "Phone number must be exactly 10 digits",
      },
      unique: true,
    },
    image: {
      type: String,
      default:
        "https://static.vecteezy.com/system/resources/previews/020/911/740/non_2x/user-profile-icon-profile-avatar-user-icon-male-icon-face-icon-profile-icon-free-png.png",
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },

    subscriptionPlan: {
      type: String,
      enum: ["Monthly", "Custom Date", "Alternate Days"],
      required: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive"],
      required: true,
    },

    customDeliveryDates: {
      type: [String],
      default: [],
    },

    startDate: {
      type: String,
      default: () => new Date().toISOString().split("T")[0], // YYYY-MM-DD format
    },

    endDate: {
      type: String,
      default: () => new Date().toISOString().split("T")[0], // YYYY-MM-DD format
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
          required: true,
        },
        productSize: {
          type: String,
          required: true,
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
      },
    ],

    absentDays: {
      type: [String],
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
    customerStatus: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "Online"],
      default: "COD",
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Partially Paid", "Unpaid"],
      default: "Unpaid",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
