const express = require("express");
const router = express.Router();
const {
  registerAccount,
  loginUser,
  logout,
  getUserDetails,
  getAllSellers,
  updateUserProfile,
  deleteUser,
  registerUser,
  changePassword,
  forgotPassword,
  verifyOtpAndResetPassword
} = require("../controllers/userController"); // adjust the path if needed

const { isAuthenticatedUser } = require("../middlewares/auth"); // Middleware to protect routes
const upload = require("../utils/multer"); // Middleware for file upload, e.g., Multer with S3

// @route   POST /api/v1/register

router.post("/signup", registerUser);

// @route   POST /api/v1/login
router.post("/login", loginUser);

// @route   GET /api/v1/logout
router.get("/logout", logout);

// @route   GET /api/v1/users/:id
router.get("/get/userprofile", isAuthenticatedUser, getUserDetails);

// @route   GET /api/v1/sellers
router.get("/users", isAuthenticatedUser, getAllSellers);

// @route   PUT /api/v1/users/:id
router.put("/users/:id", isAuthenticatedUser, upload.single("userProfile"), updateUserProfile);

// @route   DELETE /api/v1/users/:id
router.delete("/users/:id", isAuthenticatedUser, deleteUser);

router.route("/password/forgot").post(forgotPassword);
router.route("/password/reset").put(verifyOtpAndResetPassword);

//change password

module.exports = router;
