// subscriptionRoutes.js

const express = require("express");
const router = express.Router();
const {
  createSubscription,
  editSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  getAllSubscriptionPlans,
  updateSubscription,
  createSubscriptionPlan,
  deleteSubscription,
  deleteSubscriptionPlan,
} = require("../controller/subscriptionController");

// // ➕ Create a new subscription
// router.post("/subscription", createSubscription);
// router.put("/plans/:id", editSubscription);

// router.get("/subscriptions/active", getAllSubscriptions);

router.post("/subscription-plans", createSubscriptionPlan);
router.get("/get-all-subscription-plans", getAllSubscriptionPlans);
router.delete("/delete-subscription-plan/:id", deleteSubscriptionPlan);

// router.put("/subscriptions/:id", updateSubscription);

// router.get("/subscriptions/details/:id", getSubscriptionById);

// 📋 Get all subscriptions
// router.get("/subscription", getAllSubscriptions);

// // 🔍 Get a subscription by ID
// router.get("/subscription/:id", getSubscriptionById);

// // ✏ Update a subscription
// router.put("/subscription/:id", updateSubscription);

// // ❌ Delete a subscription
// router.delete("/subscription/:id", deleteSubscription);

module.exports = router;
