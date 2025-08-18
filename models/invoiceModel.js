const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"]
    },
    customerName: {
      type: String,
      required: true
    },
    invoiceId: {
      type: String,
      required: true,
      unique: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    invoiceDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Delivered"],
      default: "Pending",
    },
    productType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product type is required"]
    },
    productQuantity: {
      type: String, // e.g., "1L", "500ml"
      required: [true, "Product quantity is required"]
    },
    bottleReturned: {
      type: Number,
      default: 0
    },
    size: {
            type: String,
            required: true,
            enum: ["1kg", "1/2kg", "1ltr", "1/2ltr"],
        },
    price: {
      type: Number,
      required: [true, "Price is required"]
    },
    subscriptionPlan: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
      required: [true, "Subscription plan is required"]
    },
    bottleIssued: {
      type: Boolean,
      default: false
    },
    bottleReturnedYesNo: {
      type: Boolean,
      default: false
    },
    isDelivered: {
      type: Boolean,
      default: false
    },
    payment: {
      type: String,
      enum: ["UPI", "COD"],
      required: false
    },
    paymentLink: {
      type: String,
    },
    paymentLinkId: {
      type: String,
    },
    razorpayPaymentLinkId: {
      type: String,  // Ensure the type matches the one sent by Razorpay
      required: false,
      unique: true,  // You can make this field unique to prevent duplicates
    },
    razorpayOrderId: {
      type: String,
      required: false,
    },
    razorpayPaymentId: {
      type: String,
      required: false,
    },
    razorpayLinkId: {
      type: String
    },
    razorpayLinkStatus: {
      type: String,
      enum: ["created", "paid", "expired", "cancelled", "upi_qr_generated"],
      default: "created"
    },
    paymentMode: {
      type: String,
      enum: ["UPI", "Cash"],
      required: [true, "Payment mode is required"]
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Unpaid", "Partial"],
      default: "Unpaid"
    },
    partialPayment: {
      type: Boolean,
      default: false,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    amountDue: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
