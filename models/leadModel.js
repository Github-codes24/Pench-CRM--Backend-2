const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum:["Instagram","Whatsapp"],
      required: true,
    },
    product: {
      type: String,
      enum: ["A2 Milk", "A2 Cow Ghee", "Paneer", "Buttermilk", "Curd"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Cold", "Moderate", "Hot"],
      default: 'Cold', // set a valid default
      required: false,
    },
      followUps: [
      {
        date: {
          type: Date,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
      },
    ],
     leadOutcome: {
      type: String,
      enum: ["Converted", "Not Interested", null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Lead", leadSchema);
