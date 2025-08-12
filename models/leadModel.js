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
  leadName: {
    type: String,
    required: [true, "Lead name is required"],
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: [true, "Phone number is required"],
    trim: true,
    unique: true,
  },
  address: {
    type: String,
    required: [true, "Address is required"],
    trim: true,
  },
  productType: {
    type: String,
    required: [true, "Product type is required"],
  },
  productSize: {
    type: String,
    required: [true, "Product size is required"],
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: 1,
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: 0,
  },
  deliveryDays: {
    type: String,
    enum: ["daily", "alternate", "monthly", "custom"],
    default: "daily"
  },
  customDates: [
    { type: Date }
  ],
  subscriptionPlan: { 
    type: String, 
    enum: ["monthly", "weekly", null] 
  },
  assignDeliveryBoy: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryBoy",
    default: null, 
  },
  paymentMode: { 
    type: String, 
    enum: ["cash", "upi", "cod"] 
  },
  paymentStatus: { 
    type: String, 
    enum: ["unpaid", "paid"], 
    default: "unpaid"
  },
}, { timestamps: true });

module.exports  = mongoose.model("Lead", leadSchema);
