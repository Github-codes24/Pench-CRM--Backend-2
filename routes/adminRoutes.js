const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// CRUD
router.post("/", adminController.createAdmin);
router.get("/", adminController.getAdmins);
router.get("/:id", adminController.getAdminById);
router.put("/:id", adminController.updateAdmin);
router.delete("/:id", adminController.deleteAdmin);

// Forgot / Reset Password
router.post("/forgot-password", adminController.forgotPassword);
router.post("/reset-password", adminController.resetPassword);

module.exports = router;
