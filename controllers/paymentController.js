const Customer = require("../models/customerModel");
const CustomerOverAllOrder = require("../models/customerOverAllOrderModel");
const CustomerOrders = require("../models/customerOrderModel"); // daily orders
const Payment = require("../models/paymentModel");
const Razorpay = require("razorpay");
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


//✅ Create Payment for Customer
const createPaymentForCustomer = async (req, res) => {
    try {
      const { customerId } = req.params;
      const { wantToPay, paymentMethod, paidAmount} = req.body;
  
      // 🔍 Find customer
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }
  
      if (!wantToPay) {
        return res.status(400).json({
          success: false,
          message: "wantToPay must be true to create a payment",
        });
      }
  
      if (!paymentMethod || !["Online", "COD"].includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: "Invalid or missing paymentMethod (Online or COD required)",
        });
      }
  
      if (!paidAmount || paidAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid paidAmount greater than 0",
        });
      }
  
      // ✅ Calculate total payable from all CustomerOrders
      const allOrders = await CustomerOrders.find({ customer: customerId, status:"Delivered" });
      const totalAmount = allOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  
      if (paidAmount > totalAmount) {
        return res.status(400).json({
          success: false,
          message: `Paid amount cannot exceed total amount (${totalAmount})`,
        });
      }
  
      let paymentLink = null;
  
      // ✅ Online Payment (generate Razorpay link)
      if (paymentMethod === "Online") {
        try {
          paymentLink = await razorpay.paymentLink.create({
            amount: Math.round(paidAmount * 100), // in paise
            currency: "INR",
            description: `Payment of ₹${paidAmount} for ${customer.name}`,
            customer: {
              name: customer.name,
              email: customer.email || "test@example.com",
              contact: String(customer.phoneNumber),
            },
            callback_url: `${process.env.BASE_URL}/api/payment/verifyPayment?customerId=${customerId}`,
            callback_method: "get",
          });
        } catch (error) {
          console.error("❌ Razorpay error:", error.response?.body || error);
          return res.status(500).json({
            success: false,
            message: "Failed to create Razorpay link",
            error: error.message,
          });
        }
      }
  
      // ✅ Save payment in Payment model
      const paymentDoc = new Payment({
        customer: customerId,
        totalAmount,
        paidAmount,
        balanceAmount: totalAmount - paidAmount,
        paidDate: new Date(),
        paymentMethod,
        paymentStatus:
          paidAmount < totalAmount ? "Partially Paid" : "Paid",
      });
  
      await paymentDoc.save();
  
      // ✅ Update Customer model (for quick access)
      customer.amountPaidTillDate += paidAmount;
      customer.amountDue = totalAmount - customer.amountPaidTillDate;
      customer.paymentStatus =
        customer.amountPaidTillDate < totalAmount
          ? "Partially Paid"
          : "Paid";
  
      await customer.save();
  
      res.status(200).json({
        success: true,
        message: "Payment initiated successfully",
        payment: paymentDoc,
        ...(paymentLink && { paymentUrl: paymentLink.short_url }),
      });
    } catch (error) {
      console.error("createPaymentForCustomer Error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating payment",
        error: error.message,
      });
    }
  };

//✅ Verify Payment
const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_payment_link_id,
            razorpay_payment_link_status,
            customerId, // 🆕 coming from query string
        } = req.query;

        if (!razorpay_payment_id || !razorpay_payment_link_id || !customerId) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment verification request",
            });
        }

        // 🔍 Find overall order record
        const overallOrder = await CustomerOverAllOrder.findOne({
            customerId,
            razorpayLinkId: razorpay_payment_link_id,
        });

        if (!overallOrder) {
            return res.status(404).json({
                success: false,
                message: "CustomerOverAllOrder not found for this payment",
            });
        }

        // ✅ Fetch payment details from Razorpay
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        const paidAmount = payment.amount / 100; // paise → INR

        if (!paidAmount || paidAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment amount",
            });
        }

        // ✅ Save Razorpay details
        overallOrder.razorpayPaymentId = razorpay_payment_id;
        overallOrder.razorpayLinkStatus =
            razorpay_payment_link_status || payment.status;

        // ✅ Update amounts
        overallOrder.paidAmount += paidAmount;
        overallOrder.balanceAmount =
            overallOrder.totalAmount - overallOrder.paidAmount;

        // ✅ Update payment status
        if (overallOrder.paidAmount < overallOrder.totalAmount) {
            overallOrder.paymentStatus = "Partially Paid";
        } else {
            overallOrder.paymentStatus = "Paid";
            overallOrder.balanceAmount = 0; // safety
        }

        await overallOrder.save();

        // 🔄 Sync with Customer
        const customer = await Customer.findById(customerId);
        if (customer) {
            customer.amountPaidTillDate = overallOrder.paidAmount;
            customer.amountDue = overallOrder.balanceAmount;
            customer.paymentStatus = overallOrder.paymentStatus;
            await customer.save();
        }

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            paymentDetails: {
                paidAmount,
                totalPaid: overallOrder.paidAmount,
                balance: overallOrder.balanceAmount,
                status: overallOrder.paymentStatus,
            },
            overallOrder,
        });
    } catch (error) {
        console.error("verifyPayment Error:", error);
        return res.status(500).json({
            success: false,
            message: "Error verifying payment",
            error: error.message,
        });
    }
};

module.exports = {
    createPaymentForCustomer,
    verifyPayment,
};