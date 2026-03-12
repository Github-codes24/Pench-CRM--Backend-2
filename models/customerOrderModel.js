const mongoose = require("mongoose");

// Subdocument for each product inside an order - matches customer.products structure
const productOrderSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    productSize: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    totalPrice: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const customerOrdersSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
      required: true,
    },
    deliveryDate: {
      type: String, // Store as dd/mm/yyyy format
      default: () => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();
        return `${day}/${month}/${year}`;
      },
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "Online"],
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partially Paid", "Paid"],
      default: "Unpaid",
    },

    products: [productOrderSchema],

    // Financial
    totalAmount: {
      type: Number,
      default: 0,
    },

    // Status
    status: {
      type: String,
      enum: ["Pending", "Delivered", "Returned"],
      default: "Pending",
    },

    bottleReturns: [
      {
        size: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        previousOrderId: {
          type: mongoose.Schema.Types.ObjectId, // ✅ which order bottle were return 
          ref: "CustomerOrders",
          required: false,
        },
     
        previousDeliveryDate: { //✅ To Track which order Date the order belong to
          type: String,
          required: false,
        },
      },
    ],

    pendingBottleReturnQuantity: {
      type: Number,
      default: 0,
    },

    // wantToPay: {
    //   type: Boolean,
    //   default: false,
    // },
    // cashCollected:{
    //   type: Number,
    //   default: 0,
    // },
    // razorpayLinkId: { type: String },
    // razorpayLinkStatus: { type: String },
    // razorpayPaymentId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomerOrders", customerOrdersSchema);
