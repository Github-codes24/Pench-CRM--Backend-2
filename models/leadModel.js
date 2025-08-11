// const mongoose = require("mongoose");

// const leadSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     source: {
//       type: String,
//       enum:["Instagram","Whatsapp"],
//       required: true,
//     },
//     productType: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: true,
//     },
//     status: {
//       type: String,
//       enum: ["Cold", "Moderate", "Hot"],
//       default: 'Cold', // set a valid default
//       required: true,
//     },
//     followUps: [
//       {
//         date: {
//           type: Date,
//           required: true,
//         },
//         description: {
//           type: String,
//           required: true,
//         },
//       },
//     ],
//     leadOutcome: {
//       type: String,
//       enum: ["Converted", "Not Interested", null],
//       default: null,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = mongoose.model("Lead", leadSchema);



const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  phoneNumber: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String 
  },
  productType: { 
    type: String 
  },
  productSize: { 
    type: String 
  },
  quantity: { 
    type: Number 
  },
  price: { 
    type: Number 
  },
  deliveryDays: {
    type: String,
    enum: ["daily", "alternate", "monthly", "custom"],
    default: "daily"
  },
  customDates: [{ type: Date }],
  subscriptionPlan: { type: String, enum: ["monthly", "weekly", null] },
  assignDeliveryBoy: { type: String },
  paymentMode: { type: String, enum: ["cash", "upi", "cod"] },
  paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
}, { timestamps: true });

export const Lead = mongoose.model("Lead", leadSchema);
