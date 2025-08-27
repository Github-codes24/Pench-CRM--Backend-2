const DeliveryBoy = require("../models/delhiveryBoyModel");
const jwt = require("jsonwebtoken");

const mongoose = require("mongoose");
const Customer = require("../models/coustomerModel");
const CustomerCustomOrder = require("../models/customerCustomOrder");
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

exports.getOrders = async (req, res) => {
  try {
    const {
      customerId,
      deliveryBoyId,
      date,
      fromDate,
      toDate,
      productId,
      status,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {};
    const customerFilter = {};
    const customOrderFilter = {};

    // Customer filter
    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID format",
        });
      }
      filter.customer = new mongoose.Types.ObjectId(customerId);
      customerFilter._id = new mongoose.Types.ObjectId(customerId);
    }

    // Delivery boy filter
    if (deliveryBoyId) {
      if (!mongoose.Types.ObjectId.isValid(deliveryBoyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid delivery boy ID format",
        });
      }
      filter.deliveryBoy = new mongoose.Types.ObjectId(deliveryBoyId);
      customerFilter.deliveryBoy = new mongoose.Types.ObjectId(deliveryBoyId);
      customOrderFilter.deliveryBoy = new mongoose.Types.ObjectId(deliveryBoyId);
    }

    // Date filtering
    let dateFilter = {};
    if (date) {
      // Single date filter
      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use ISO format (YYYY-MM-DD)",
        });
      }
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      dateFilter = {
        $gte: startOfDay,
        $lt: endOfDay
      };
    } else if (fromDate || toDate) {
      // Date range filter
      dateFilter = {};
      if (fromDate) {
        const from = new Date(fromDate);
        if (isNaN(from.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate format. Use ISO format (YYYY-MM-DD)",
          });
        }
        from.setHours(0, 0, 0, 0);
        dateFilter.$gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        if (isNaN(to.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate format. Use ISO format (YYYY-MM-DD)",
          });
        }
        to.setHours(23, 59, 59, 999);
        dateFilter.$lte = to;
      }
    }

    // Product filter
    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID format",
        });
      }
      filter['products.product'] = new mongoose.Types.ObjectId(productId);
      customOrderFilter.product = new mongoose.Types.ObjectId(productId);
    }

    // Status filter (for custom orders)
    if (status) {
      customOrderFilter.status = status;
    }

    // Pagination
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    // Set target date for delivery calculation (use today if no date specified)
    let targetDateForDelivery = new Date();
    if (date) {
      targetDateForDelivery = new Date(date);
    }
    targetDateForDelivery.setHours(0, 0, 0, 0);

    // Find customers with filters
    const customers = await Customer.find(customerFilter)
      .populate("products.product")
      .populate({
        path: "deliveryBoy",
        select: "name phoneNumber email",
      })
      .skip(skip)
      .limit(pageSize);

    // Find custom orders with filters
    const customOrders = await CustomerCustomOrder.find({
      ...customOrderFilter,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
    })
      .populate("customer", "name phoneNumber address userProfile gender")
      .populate("product")
      .populate({
        path: "deliveryBoy",
        select: "name phoneNumber email",
      })
      .skip(skip)
      .limit(pageSize);

    // Get total counts for pagination
    const totalCustomers = await Customer.countDocuments(customerFilter);
    const totalCustomOrders = await CustomerCustomOrder.countDocuments({
      ...customOrderFilter,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
    });

    // Format orders
    const formattedOrders = await formatOrderResponse(
      customers,
      customOrders,
      targetDateForDelivery,
      deliveryBoyId
    );

    // Prepare response
    const response = {
      success: true,
      message: `Orders${date ? ` for ${targetDateForDelivery.toDateString()}` : ''}`,
      data: {
        date: targetDateForDelivery,
        filters: {
          customerId,
          deliveryBoyId,
          date,
          fromDate,
          toDate,
          productId,
          status
        },
        pagination: {
          currentPage: pageNumber,
          totalPages: Math.ceil((totalCustomers + totalCustomOrders) / pageSize),
          totalItems: totalCustomers + totalCustomOrders,
          pageSize,
          hasNext: pageNumber < Math.ceil((totalCustomers + totalCustomOrders) / pageSize),
          hasPrev: pageNumber > 1
        },
        summary: {
          totalOrders: formattedOrders.customers.reduce((total, customer) => total + customer.orders.length, 0),
          totalCustomers: formattedOrders.customers.length,
          totalBottles: formattedOrders.totalBottlesRequired,
          subscriptionOrders: formattedOrders.customers.reduce((total, customer) =>
            total + customer.orders.filter(order => order.orderType === 'subscription').length, 0),
          customOrders: formattedOrders.customers.reduce((total, customer) =>
            total + customer.orders.filter(order => order.orderType === 'custom').length, 0)
        },
        customers: formattedOrders.customers,
        bottleSummary: formattedOrders.bottleSummary
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching orders:", error);
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
