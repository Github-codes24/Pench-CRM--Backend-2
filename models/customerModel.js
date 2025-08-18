// const mongoose = require("mongoose");

// const customerSchema = new mongoose.Schema(
//     {
//         name: {
//             type: String,
//             required: [false, "Customer name is required"],
//         },
//         phoneNumber: {
//             type: String,
//             required: [false, "Phone number is required"],
//             match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
//             unique: true,
//         },
//         userProfile: {
//             type: String,
//             default:
//                 "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
//         },
//         gender: {
//             type: String,
//             enum: ["Male", "Female", "Other"],
//             required: [false, "Gender is required"],
//         },
//         productType: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Product",
//             // enum: ["A2 Milk", "A2 Cow Ghee", "Paneer", "Buttermilk", "Curd"],
//             required: [false, "Product type is required"],
//         },
//          size: {
//             type: String,
//             required: true,
//             enum: ["1kg", "1/2kg", "1ltr", "1/2ltr"],
//         },
//         deliveryDays: {
//             type: String,
//             enum: [
//                 "Daily",
//                 "Alternate Days",
//                 "Monday to Friday",
//                 "Weekends Only",
//                 "Custom Days"
//             ],
//             required: [false, "Delivery days are required"],
//         },
//         deliveryBoy: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "DeliveryBoy",
//             required: [false, "Delivery boy assignment is required"],
//         },
//         subscriptionPlan: {
//             type: String,
//             enum: ["Daily", "Weekly", "Monthly", "Custom Days"],
//             required: [false, "Subscription plan is required"],
//         },
//         quantity: {
//             type: String, // e.g., "1L", "500ml"
//             required: [false, "Product quantity is required"],
//         },
//         price: {                     // ✅ NEW FIELD
//             type: Number,
//             required: false,
//         },
//         address: {
//             type: String,
//             required: [false, "Address is required"],
//         },
//         createdBy: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "UsersAuth",
//             required: false,
//         },
//     },
//     {
//         timestamps: true,
//     }
// );

// module.exports = mongoose.model("Customer", customerSchema);

const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
      unique: true,
    },
    userProfile: {
      type: String,
      default:
        "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    productType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product type is required"],
    },
    size: {
      type: String,
      required: [true, "Product size is required"],
      enum: ["1kg", "1/2kg", "1ltr", "1/2ltr"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    // ✅ Delivery setup
    deliveryDays: {
      type: String,
      enum: [
        "Daily",
        "Alternate Days",
        "Monday to Friday",
        "Weekends Only",
        "Custom Days",
      ],
      required: [true, "Delivery days are required"],
    },
    customDeliveryDates: {
      type: [Date], // Only if "Custom Days" is selected
      default: [],
    },

    // ✅ Subscription plan
    subscriptionPlan: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly", "Custom Days"],
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },

    // ✅ Assigned delivery boy
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
    },

    // ✅ Payment details
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "COD"],
      required: [true, "Payment mode is required"],
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Unpaid", "Partial"],
      default: "Unpaid",
    },
    isPartialPayment: {
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
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UsersAuth",
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Auto-calculate endDate if Monthly plan is selected
customerSchema.pre("save", function (next) {
  if (this.subscriptionPlan === "Monthly" && this.startDate && !this.endDate) {
    const end = new Date(this.startDate);
    end.setMonth(end.getMonth() + 1);
    this.endDate = end;
  }
  next();
});

module.exports = mongoose.model("Customer", customerSchema);
