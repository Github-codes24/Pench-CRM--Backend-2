const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    subscriptionPlan: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
      required: [true, "Subscription plan type is required"]
    },
    discount: {
      type: Number,
      default: 0
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"]
    },
    deliveryTime: {
      type: String,
      required: [true, "Delivery time is required"]
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "At least one product is required"]
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
