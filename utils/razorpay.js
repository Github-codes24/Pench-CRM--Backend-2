const Razorpay = require("razorpay");

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_qdIou8vehX7Xmn",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "r19BSEtKPTGxb3mQsfatNA2S",
});

module.exports = instance;
