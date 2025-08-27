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
      type:String, // 🔹 multiple sizes allowed
      required: true,
    },
    price:{
      type:Number
    },
    stock: {
      type: Number,
      default: 0,
    },
    productCode: {
      type: String,
      required: [true, "Product code is required"],
      unique: true, // 🔹 always unique
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
