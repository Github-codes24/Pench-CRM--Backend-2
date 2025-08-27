const express = require("express");
const router = express.Router();
const {
  createDeliveryHistory,
  getAllDeliveries,
  getDeliveriesByCustomer,
  getDeliveriesByDeliveryBoy,
  updateDeliveryHistory,
  deleteDeliveryHistory,
  updateDeliveryStatus,
  getTodayOrdersSummary
} = require("../controllers/delhiveryHistoryController");

// Create new delivery history
router.post("/createdeliveryhistory", createDeliveryHistory);

// Get all deliveries (with filters)
router.get("/getalldelivery", getAllDeliveries);

// Get deliveries by customer
router.get("/customer/:customerId", getDeliveriesByCustomer);

// Get deliveries by delivery boy
router.get("/deliveryBoy/:deliveryBoyId", getDeliveriesByDeliveryBoy);

// Update delivery history
router.put("/update/:id", updateDeliveryHistory);

// Delete delivery history
router.delete("/delete/:id", deleteDeliveryHistory);

// update delhivery status payment all

router.put("/updateDeliveryStatus", updateDeliveryStatus);


// POST /api/delivery-history/update-status
// {
//   "customerId": "customer_id_here",
//   "deliveryBoyId": "delivery_boy_id_here",
//   "date": "2024-01-15",
//   "status": "Delivered",
//   "amountPaid": 150,
//   "paymentMethod": "cash",
//   "remarks": "Customer paid in full",
//   "products": [
//     {
//       "product": "product_id_1",
//       "quantity": 2,
//       "totalPrice": 100,
//       "isDelivered": true,
//       "status": "delivered"
//     },
//     {
//       "product": "product_id_2",
//       "quantity": 1,
//       "totalPrice": 50,
//       "isDelivered": true,
//       "status": "delivered"
//     }
//   ],
//   "bottleIssued": [
//     { "size": "500ml", "count": 2 }
//   ],
//   "bottleReturn": [
//     { "size": "1L", "count": 1 }
//   ]
// }


router.put("/today-summary", getTodayOrdersSummary);
// today-summary?date=2023-12-25
module.exports = router;
