const mongoose = require("mongoose");

const bottleTransactionSchema = new mongoose.Schema(
  {
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
      required: true,
    },

    // ✅ Assigned bottles by size
    assigned: [
      {
        size: { type: String, enum: ["0.5L", "1L"], required: true },
        count: { type: Number, default: 0 },
      },
    ],

    // ✅ Returned bottles by size
    returned: [
      {
        size: { type: String, enum: ["0.5L", "1L"], required: true },
        count: { type: Number, default: 0 },
      },
    ],

    // ✅ Pending = assigned - returned for each size
    pending: [
      {
        size: { type: String, enum: ["0.5L", "1L"], required: true },
        count: { type: Number, default: 0 },
      },
    ],

    remarks: { type: String },

    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BottleTransaction", bottleTransactionSchema);
