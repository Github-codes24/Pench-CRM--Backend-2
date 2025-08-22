const DeliveryBoy = require("../models/delhiveryBoyModel");
const jwt = require("jsonwebtoken");

const mongoose = require("mongoose");
const Customer = require("../models/coustomerModel");
const {
  formatOrderResponse,
  shouldDeliverOnDate,
} = require("../utils/dateUtils");

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
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
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

    const deliveryBoy = await DeliveryBoy.findOne({ email }).select(
      "+password"
    );
    if (!deliveryBoy) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await deliveryBoy.comparePassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
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
    const { name, area, phoneNumber, page = 1, limit = 10 } = req.query;

    // Build filter object
    const filter = {};
    if (name) filter.name = { $regex: name, $options: "i" }; // case-insensitive search
    if (area) filter.area = { $regex: area, $options: "i" };
    if (phoneNumber)
      filter.phoneNumber = { $regex: phoneNumber, $options: "i" };

    // Convert page & limit to numbers
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch data with pagination
    const [deliveryBoys, total] = await Promise.all([
      DeliveryBoy.find(filter).skip(skip).limit(limitNumber),
      DeliveryBoy.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: deliveryBoys.length,
      total,
      currentPage: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
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
      return res
        .status(404)
        .json({ success: false, message: "Delivery boy not found" });
    }
    res.status(200).json({ success: true, deliveryBoy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📌 Update Delivery Boy
exports.updateDeliveryBoy = async (req, res) => {
  try {
    const deliveryBoy = await DeliveryBoy.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!deliveryBoy) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery boy not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Updated successfully", deliveryBoy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📌 Delete Delivery Boy
exports.deleteDeliveryBoy = async (req, res) => {
  try {
    const deliveryBoy = await DeliveryBoy.findByIdAndDelete(req.params.id);
    if (!deliveryBoy) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery boy not found" });
    }
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTodayOrders = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    const { date } = req.query;

    // Validate delivery boy ID
    if (!mongoose.Types.ObjectId.isValid(deliveryBoyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery boy ID format",
      });
    }

    // Set target date (today or specified date)
    let targetDate = new Date();
    if (date) {
      targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use ISO format (YYYY-MM-DD)",
        });
      }
    }
    targetDate.setHours(0, 0, 0, 0);

    // Find customers with products assigned to this delivery boy
    const customers = await Customer.find({
      deliveryBoy: new mongoose.Types.ObjectId(deliveryBoyId),
    })
      .populate("products.product")
      .populate({
        path: "deliveryBoy",
        select: "name phoneNumber email", // only fetch these fields
      });

    if (!customers || customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No customers found for this delivery boy",
        data: [],
      });
    }

    // Format orders
    const todayOrders = formatOrderResponse(
      customers,
      targetDate,
      deliveryBoyId
    );

    res.status(200).json({
      success: true,
      message: `Orders for ${targetDate.toDateString()}`,
      data: {
        date: targetDate,
        totalOrders: todayOrders.length,
        orders: todayOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching today orders:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get orders for a date range
exports.getOrdersByDateRange = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(deliveryBoyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery boy ID format",
      });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range format. Use ISO format (YYYY-MM-DD)",
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date",
      });
    }

    // Find customers with products assigned to this delivery boy
    const customers = await Customer.find({
      deliveryBoy: new mongoose.Types.ObjectId(deliveryBoyId),
    })
      .populate("products.product")
      .populate({
        path: "deliveryBoy",
        select: "name phoneNumber email", // only fetch these fields
      });

    const allOrders = [];
    const currentDate = new Date(start);

    // Check each day in the date range
    while (currentDate <= end) {
      const dateOrders = formatOrderResponse(
        customers,
        new Date(currentDate),
        deliveryBoyId
      );

      if (dateOrders.length > 0) {
        allOrders.push({
          date: new Date(currentDate),
          orders: dateOrders,
          totalOrders: dateOrders.length,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.status(200).json({
      success: true,
      message: `Orders from ${start.toDateString()} to ${end.toDateString()}`,
      data: {
        startDate: start,
        endDate: end,
        totalDays: allOrders.length,
        ordersByDate: allOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching orders by date range:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get order statistics for delivery boy
// exports.getOrderStatistics = async (req, res) => {
//   try {
//     const { deliveryBoyId } = req.params;
//     const { month, year } = req.query;

//     if (!mongoose.Types.ObjectId.isValid(deliveryBoyId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid delivery boy ID format",
//       });
//     }

//     // Implementation for order statistics
//     // This would include total orders, completed orders, pending orders, etc.

//     res.status(200).json({
//       success: true,
//       message: "Order statistics endpoint - to be implemented",
//       data: {
//         deliveryBoyId,
//         month,
//         year,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching order statistics:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };
