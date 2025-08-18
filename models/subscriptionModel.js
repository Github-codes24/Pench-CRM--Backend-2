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
