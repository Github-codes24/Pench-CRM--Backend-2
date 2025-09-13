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
    size:{
        type: String,
        required: true,
      },
    price: {
      type: Number
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
    totalSold: {
      type: Number,
      default: 0,
    },
    productImage: {
      type: String,
      default:
        "https://static.vecteezy.com/system/resources/previews/020/911/740/non_2x/user-profile-icon-profile-avatar-user-icon-male-icon-face-icon-profile-icon-free-png.png",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
