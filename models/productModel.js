const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        productName: {
            type: String,
            // enum: ["A2 Milk", "A2 Cow Ghee", "Paneer", "Buttermilk", "Curd"],
            required: [true, "Product type is required"],
        },
        description: {
            type: String,
        },
        productSize:{
            type: String,
            required: true,
            enum: ["1kg", "1/2kg", "1ltr", "1/2ltr"],
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
        },
        quantity: {
            type: Number, // e.g., "1 Ltr", "500 ml"
            required: true,
        },
        stock: {
            type: Number,
            default: 0, // Default stock quantity
        },
        image: {
            type: [String], // URL or file path
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Product", productSchema);
