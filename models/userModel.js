const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Define the User schema
const userSchema = new mongoose.Schema({
   name: {
    type: String,
    required: [false,"Please enter your firstname"],
    trim: true
  },
  email: {
    type: String,
    required: [false, "Please enter your email"],
    unique: false,
    validate: [validator.isEmail, "Please enter a valid email address"],
    lowercase: true,
    index: true,
  },
  phoneNumber: {
    type: String,
    required: false,
    unique: true,
    match: [/^\+?[1-9]\d{1,14}$/, "Please provide a valid phone number with a country code (e.g., +1234567890)"],
    maxlength: [15, "Phone number cannot be longer than 15 characters"],
  },
   companyName: {
    type: String,
    required: true,
  },
  gstNumber: {
    type: String,
    required: true,
    match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  },
  password: {
    type: String,
    required: [false, "Please enter your password"],
    minLength: [8, "Password should be greater than 8 characters"],
    select: false,
  },
  address: {
    type: String,
    required: false
  },

  role: {
    type: String,
    enum: ["SUPER_ADMIN", "USER"],
    default: "USER",
  },
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active",
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  userProfile: {
    type: String,
    default:
      "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
  },
   
  otp: {
    type: String,
  },
  otpExpire: {
    type: Date,
  },
  
  isVerified: {
    type: Boolean,
    default: false,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpire: {
    type: Date,
  },
  verificationCode: {
    type: Number,
  },
  verificationCodeExpire: {
    type: Date,
  },

}, { timestamps: true });

// Remove duplicate pre-save hook
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {

    // Hash the password
    this.password = await bcrypt.hash(this.password, 10);
  }

  next();
});
// Compare password method for login
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT Token
userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Generate Reset Password Token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes expiration
  return resetToken;
};

userSchema.methods.generateVerificationCode = function () {
  const generateRandomFiveDigitNumber = () => {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigits = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return parseInt(firstDigit + remainingDigits);
  };

  const verificationCode = generateRandomFiveDigitNumber();
  this.verificationCode = verificationCode;
  this.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes expiration

  return verificationCode;
};

module.exports = mongoose.model("UsersAuth", userSchema);