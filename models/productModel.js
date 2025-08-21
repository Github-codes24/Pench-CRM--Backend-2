const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, "Product name is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    size: {
      type: String,
      required: true,
      enum: ["250gm", "500gm", "1kg", "1/2ltr", "1ltr", "1/4ltr"], // allowed sizes
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
    },
    stock: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
