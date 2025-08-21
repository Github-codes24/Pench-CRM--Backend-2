const DeliveryBoy = require("../models/delhiveryBoyModel");
const jwt = require("jsonwebtoken");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "7d",
  });
};

// 📌 Register Delivery Boy
exports.registerDeliveryBoy = async (req, res) => {
  try {
    const { name, email, phoneNumber, area, password } = req.body;

    const existing = await DeliveryBoy.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const deliveryBoy = await DeliveryBoy.create({
      name,
      email,
      phoneNumber,
      area,
      password,
    });

    res.status(201).json({
      success: true,
      message: "Delivery boy registered successfully",
      deliveryBoy,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📌 Login Delivery Boy
exports.loginDeliveryBoy = async (req, res) => {
  try {
    const { email, password } = req.body;

    const deliveryBoy = await DeliveryBoy.findOne({ email }).select("+password");
    if (!deliveryBoy) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await deliveryBoy.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(deliveryBoy._id);

    res.status(200).json({
      success: true,
      token,
      deliveryBoy,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📌 Get All Delivery Boys
// ✅ Get all delivery boys with optional filters
exports.getAllDeliveryBoys = async (req, res) => {
  try {
    const { name, area, phoneNumber } = req.query;

    // Build filter object
    const filter = {};
    if (name) filter.name = { $regex: name, $options: "i" }; // case-insensitive search
    if (area) filter.area = { $regex: area, $options: "i" };
    if (phoneNumber) filter.phoneNumber = { $regex: phoneNumber, $options: "i" };

    const deliveryBoys = await DeliveryBoy.find(filter);

    res.status(200).json({
      success: true,
      count: deliveryBoys.length,
      deliveryBoys,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📌 Get Single Delivery Boy
exports.getDeliveryBoyById = async (req, res) => {
  try {
    const deliveryBoy = await DeliveryBoy.findById(req.params.id);
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: "Delivery boy not found" });
    }
    res.status(200).json({ success: true, deliveryBoy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📌 Update Delivery Boy
exports.updateDeliveryBoy = async (req, res) => {
  try {
    const deliveryBoy = await DeliveryBoy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: "Delivery boy not found" });
    }
    res.status(200).json({ success: true, message: "Updated successfully", deliveryBoy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📌 Delete Delivery Boy
exports.deleteDeliveryBoy = async (req, res) => {
  try {
    const deliveryBoy = await DeliveryBoy.findByIdAndDelete(req.params.id);
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: "Delivery boy not found" });
    }
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
