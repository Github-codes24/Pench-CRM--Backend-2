// const mongoose = require("mongoose");

// const subscriptionPlanSchema = new mongoose.Schema(
//   {
//     subscriptionPlan: {
//       type: String,
//       enum: ["Daily", "Weekly", "Monthly"],
//       required: [true, "Subscription plan type is required"]
//     },
//     discount: {
//       type: Number,
//       default: 0
//     },
//     totalPrice: {
//       type: Number,
//       required: [true, "Total price is required"]
//     },
//     deliveryTime: {
//       type: String,
//       required: [true, "Delivery time is required"]
//     },
//     products: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Product",
//         required: [true, "At least one product is required"]
//       }
//     ]
//   },
//   {
//     timestamps: true
//   }
// );

// module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);

const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
    // The type of plan 
    subscriptionPlan: {
        type: String,
        enum: ['Daily Plan', 'Alternate Plan', 'Monthly Plan'],
        required: [true, 'Plan name is required.']
    },
    // The duration in days, e.g., 30 for a monthly plan
    durationInDays: {
        type: Number,
        required: [true, 'Duration is required.'],
        min: 1
    },
    // price: {
    //     type: Number,
    //     required: [true, 'Price is required.']
    // },
    // As requested: List of what's included
    featuresIncluded: {
        type: [String],
        default: []
    },
    // As requested: Any special notes from the customer
    notes: {
        type: String,
        trim: true
    },
    // Is this plan available for new subscriptions?
    isActive: {
      type: Boolean,
      default: true
    },
}, { timestamps: true });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
module.exports = SubscriptionPlan;