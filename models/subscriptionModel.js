// const mongoose = require("mongoose");

// const subscriptionSchema = new mongoose.Schema(
//   {
//     customer: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Customer",
//       required: false,
//     },
//     name: {
//       type: String,
//       required: false,
//     },
//     phoneNumber: {
//       type: String,
//       required: false,
//       match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
//     },
//     productType: {
//        type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: false,
//     },
//     deliveryDays: {
//       type: String,
//       enum: [
//         "Daily",
//         "Alternate Days",
//         "Monday to Friday",
//         "Weekends Only",
//         "Custom Days"
//       ],
//       required: false,
//     },
//     assignedDeliveryBoy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "DeliveryBoy",
//       required: false,
//     },
//     address: {
//       type: String,
//       required: false,
//     },
//     subscriptionPlan: {
//       type: String,
//       enum: ["Daily", "Weekly", "Monthly"],
//       required: false,
//     },
//     frequency: {
//       type: String, // e.g., "Every Day", "Every Day in Week"
//     },
//     price: {
//       type: Number,
//     },
//     startDate: {
//       type: Date,
//       default: Date.now,
//     },
//     endDate: {
//       type: Date,
//     },
//     status: {
//       type: String,
//       enum: ["Active", "Blocked"],
//       default: "Active",
//     },
//     deliveryTime: {
//       type: String,
//       required: false
//     },
//     products: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Product",
//         required: false,
//       }
//     ],
//     discount: {
//       type: Number,
//       default: 0
//     },
//     totalPrice: {
//       type: Number,
//       default: 0
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     }
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = mongoose.model("Subscription", subscriptionSchema);



const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    // Link to the customer who is subscribing
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assumes you have a User model
        required: true
    },
    // Link to the plan they chose
    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
        required: true
    },
    // Link to the assigned delivery boy
    deliveryBoy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Can be assigned later
    },
    // As requested: The start and end dates
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    // Status to manage the subscription lifecycle
    status: {
        type: String,
        enum: ['active', 'paused', 'cancelled', 'completed'],
        default: 'active'
    },
    deliveryAddress: {
        type: String,
        required: [true, 'Delivery address is required.'],
        trim: true
    }
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;