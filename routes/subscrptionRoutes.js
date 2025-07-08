const express = require("express");
const router = express.Router();
const {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription
} = require("../controllers/subscriptionController");

// ➕ Create a new subscription
router.post("/subscription", createSubscription);

// 📋 Get all subscriptions
router.get("/subscription", getAllSubscriptions);

// 🔍 Get a subscription by ID
router.get("/subscription/:id", getSubscriptionById);

// ✏️ Update a subscription
router.put("/subscription/:id", updateSubscription);

// ❌ Delete a subscription
router.delete("/subscription/:id", deleteSubscription);

module.exports = router;
