const Razorpay = require("razorpay");

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_D3D9CzhhPmwAZe",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "gTPUidHTVpnljtGjLZHUcFV4",
});

module.exports = instance;
