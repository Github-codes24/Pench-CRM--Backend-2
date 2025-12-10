const Customer = require("../models/customerModel");
const CustomerOrders = require("../models/customerOrderModel");
const {
  formatDateToDDMMYYYY,
  parseUniversalDate,
} = require("../utils/parsedDateAndDay");

const getBottleCountForDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required in DD/MM/YYYY format",
      });
    }

    const targetDate = date;

    const result = await CustomerOrders.aggregate([
      {
        $match: {
          deliveryDate: targetDate,
          status: { $in: ["Pending", "Delivered", "Returned"] },
        },
      },

      { $unwind: "$products" },
      {
        $match: {
          "products.productName": { $regex: /milk/i },
        },
      },
      {
        $addFields: {
          normalizedSize: {
            $toLower: {
              $trim: {
                input: "$products.productSize",
              },
            },
          },
        },
      },
      {
        $addFields: {
          physical1Ltr: {
            $cond: [
              {
                $in: [
                  "$normalizedSize",
                  ["1ltr", "1 ltr", "1-ltr", "1 liter", "1 l"],
                ],
              },
              "$products.quantity",
              0,
            ],
          },
          physicalHalfLtr: {
            $cond: [
              {
                $in: [
                  "$normalizedSize",
                  ["1/2ltr", "1/2 ltr", "0.5ltr", "0.5 ltr"],
                ],
              },
              "$products.quantity",
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total1LtrIssue: { $sum: "$physical1Ltr" },
          totalHalfLtrIssue: { $sum: "$physicalHalfLtr" },
        },
      },
      {
        $lookup: {
          from: "customerorders",
          pipeline: [
            { $match: { deliveryDate: targetDate } },
            { $unwind: "$bottleReturns" },
            {
              $group: {
                _id: "$bottleReturns.size",
                total: { $sum: "$bottleReturns.quantity" },
              },
            },
          ],
          as: "returns",
        },
      },
      {
        $project: {
          _id: 0,

          "1ltr": "$total1LtrIssue",
          "1/2ltr": "$totalHalfLtrIssue",

          totalBottles: {
            issue: { $add: ["$total1LtrIssue", "$totalHalfLtrIssue"] },
            return: {
              $sum: {
                $map: {
                  input: "$returns",
                  as: "r",
                  in: "$$r.total",
                },
              },
            },
          },

          returns: {
            $arrayToObject: {
              $map: {
                input: "$returns",
                as: "r",
                in: {
                  k: "$$r._id",
                  v: "$$r.total",
                },
              },
            },
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: `Bottle count for ${targetDate}`,
      data: result[0] || {
        "1ltr": 0,
        "1/2ltr": 0,
        totalBottles: { issue: 0, return: 0 },
        returns: {},
      },
    });
  } catch (err) {
    console.error("Bottle aggregation error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to calculate bottle count",
      error: err.message,
    });
  }
};

//✅ Get All Bottle Tracking Orders (Milk products only)
const getAllBottleTrackingOrders = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      size = "",
      startDate = "",
      endDate = "",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const regexSize = size ? new RegExp(size, "i") : null;

    let pipeline = [
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
      {
        $lookup: {
          from: "deliveryboys",
          localField: "deliveryBoy",
          foreignField: "_id",
          as: "deliveryBoy",
        },
      },
      { $unwind: "$deliveryBoy" },
      {
        $match: {
          "products.productName": { $regex: /milk/i },
        },
      },
      {
        $match: {
          "products.productSize": {
            $regex:
              /^(1\s*L|1\s*ltr|1\s*liter|1\s*l|0\.5\s*L|0\.5\s*ltr|1\/2\s*L|1\/2\s*ltr|1\/2\s*liter|1\/2\s*l|500\s*ml)$/i,
          },
        },
      },
    ];

    let dateMatch = {};

    if (startDate || endDate) {
      if (startDate && endDate) {
        const start = parseUniversalDate(startDate) || new Date(startDate);
        const end = parseUniversalDate(endDate) || new Date(endDate);

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const startDateStr = formatDateToDDMMYYYY(start);
          const endDateStr = formatDateToDDMMYYYY(end);
          dateMatch.deliveryDate = { $gte: startDateStr, $lte: endDateStr };
        }
      } else if (startDate) {
        const start = parseUniversalDate(startDate) || new Date(startDate);
        if (!isNaN(start.getTime())) {
          const startDateStr = formatDateToDDMMYYYY(start);
          dateMatch.deliveryDate = { $gte: startDateStr };
        }
      } else if (endDate) {
        const end = parseUniversalDate(endDate) || new Date(endDate);
        if (!isNaN(end.getTime())) {
          const endDateStr = formatDateToDDMMYYYY(end);
          dateMatch.deliveryDate = { $lte: endDateStr };
        }
      }
    } else {
      const today = new Date();
      const todayDateStr = formatDateToDDMMYYYY(today);
      dateMatch.deliveryDate = todayDateStr;
    }

    if (Object.keys(dateMatch).length > 0) {
      pipeline.push({ $match: dateMatch });
    }

    if (regexSize) {
      let productMatch = {};
      // Create a more precise regex that matches exact bottle sizes
      const exactSizeRegex = new RegExp(
        `^${size.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );
      productMatch["products.productSize"] = exactSizeRegex;

      pipeline.push({ $match: productMatch });
    }

    const totalOrdersResult = await CustomerOrders.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);

    const totalOrders = totalOrdersResult[0] ? totalOrdersResult[0].total : 0;

    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const orders = await CustomerOrders.aggregate(pipeline);

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bottle tracking orders found",
      });
    }

    const response = orders.map((order) => ({
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customer?.name || "N/A",
      phoneNumber: order.customer?.phoneNumber || "N/A",
      deliveryBoyName: order.deliveryBoy?.name || "N/A",
      deliveryDate: order.deliveryDate,
      bottlesReturned: order.bottlesReturned,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      products: order.products
        .filter(
          (p) =>
            p.productName.toLowerCase().includes("milk") &&
            /^(1\s*L|1\s*ltr|1\s*liter|1\s*l|0\.5\s*L|0\.5\s*ltr|1\/2\s*L|1\/2\s*ltr|1\/2\s*liter|1\/2\s*l|500\s*ml)$/i.test(
              p.productSize
            )
        )
        .map((p) => ({
          productName: p.productName,
          size: p.productSize,
          quantity: p.quantity,
          price: p.price,
          totalPrice: p.totalPrice,
        })),
    }));

    const totalPages = Math.ceil(totalOrders / limit);

    return res.status(200).json({
      success: true,
      message: "All bottle tracking orders fetched successfully",
      totalOrders,
      totalPages,
      currentPage: page,
      previous: page > 1,
      next: page < totalPages,
      orders: response,
    });
  } catch (error) {
    console.error("getAllBottleTrackingOrders Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching bottle tracking orders",
      error: error.message,
    });
  }
};

module.exports = {
  getBottleCountForDate,
  getAllBottleTrackingOrders,
};
