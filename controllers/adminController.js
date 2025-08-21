const Admin = require("../models/adminModel");
const bcrypt = require("bcrypt");
const sendOtpEmail = require("../utils/sendMail");
const adminModel = require("../models/adminModel");
const jwt = require("jsonwebtoken")
// ✅ Create Admin
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, phoneNumber, gstNumber, password, address, role } =
      req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name,
      email,
      phoneNumber,
      gstNumber,
      password: hashedPassword,
      address,
      role,
    });

    res.status(201).json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "7d",
  });
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin and select password explicitly
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    // Call instance method, not Admin.comparePassword
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = generateToken(admin._id);

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ✅ Get All Admins
exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password");
    res.json({ success: true, count: admins.length, admins });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get Single Admin
exports.getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Update Admin
exports.updateAdmin = async (req, res) => {
  try {
    const { name, phoneNumber, gstNumber, address, role, status } = req.body;

    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { name, phoneNumber, gstNumber, address, role, status },
      { new: true, runValidators: true }
    ).select("-password");

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Delete Admin
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.json({ success: true, message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = Date.now() + 10 * 60 * 1000; // 10 min expiry

    admin.otp = otp;
    admin.otpExpire = otpExpire;
    await admin.save();

    // Send OTP via email (basic transporter)
   await sendOtpEmail(email, otp);

    res.json({ success: true, message: "OTP sent to email" ,otp:otp });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check OTP
    if (admin.otp !== otp || Date.now() > admin.otpExpire) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Update Password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    admin.otp = undefined;
    admin.otpExpire = undefined;
    await admin.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};