const mongoose = require("mongoose");
const customerCustomSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    quantity: {
      type: Number,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    price:{
      type:String
    },
    totalPrice: {
      type: Number,
    },
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomerCustomOrder", customerCustomSchema);
