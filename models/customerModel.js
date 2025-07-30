const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [false, "Customer name is required"],
        },
        phoneNumber: {
            type: String,
            required: [false, "Phone number is required"],
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
            required: [false, "Gender is required"],
        },
        productType: {
            type: String,
            enum: ["A2 Milk", "A2 Cow Ghee", "Paneer", "Buttermilk", "Curd"],
            required: [false, "Product type is required"],
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
            required: [false, "Delivery days are required"],
        },
        deliveryBoy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DeliveryBoy",
            required: [false, "Delivery boy assignment is required"],
        },
        subscriptionPlan: {
            type: String,
            enum: ["Daily", "Weekly", "Monthly", "Custom Days"],
            required: [false, "Subscription plan is required"],
        },
        quantity: {
            type: String, // e.g., "1L", "500ml"
            required: [false, "Product quantity is required"],
        },
        price: {                     // ✅ NEW FIELD
            type: Number,
            required: true,
        },
        address: {
            type: String,
            required: [false, "Address is required"],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UsersAuth",
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Customer", customerSchema);
