const Customer = require("../models/customerModel");
const CustomerOrders = require("../models/customerOrderModel");
const {
  formatDateToDDMMYYYY,
  parseUniversalDate,
} = require("../utils/parsedDateAndDay");

//✅ Get bottle count for a specific date
// const getBottleCountForDate = async (req, res) => {
//   try {
//     const { date } = req.query;
//     if (!date) {
//       return res.status(400).json({
//         success: false,
//         message: "Date is required in DD/MM/YYYY format",
//       });
//     }

//     const targetDate = date.replace(/-/g, "/");
//     console.log("🗓️ Target Date:", targetDate);

//     const oneLtrRegex = /^(1\s*L|1\s*ltr|1\s*liter|1\s*l)$/i;
//     const halfLtrRegex = /^(0\.5\s*L|0\.5\s*ltr|1\/2\s*L|1\/2\s*ltr|1\/2\s*liter|1\/2\s*l|500\s*ml)$/i;

//     const orders = await CustomerOrders.find({
//       deliveryDate: targetDate,
//       status: { $in: ["Pending", "Delivered", "Returned"] },
//     }).populate("products");

//     console.log("📦 Total Orders Found:", orders.length);

//     const pendingOrders = orders.filter((o) => o.status === "Pending");
//     const deliveredOrders = orders.filter((o) => o.status === "Delivered");
//     const returnedOrders = orders.filter((o) => o.status === "Returned");

//     console.log("⏳ Pending Orders:", pendingOrders.length);
//     console.log("✅ Delivered Orders:", deliveredOrders.length);
//     console.log("🔁 Returned Orders:", returnedOrders.length);

//     let total1LtrIssue = 0;
//     let totalHalfLtrIssue = 0;
//     let total1LtrReturn = 0;
//     let totalHalfLtrReturn = 0;

//     for (const order of orders) {
//       console.log(`\n🧾 Order: ${order.orderNumber} | Status: ${order.status}`);

//       for (const product of order.products) {
//         console.log(
//           `   🥛 Product: "${product.productName}" | Size: "${product.productSize}" | Qty: ${product.quantity}`
//         );

//         if (!product.productName?.toLowerCase().includes("milk")) {
//           console.log(`   ⛔ Skipped — Not a Milk product`);
//           continue;
//         }

//         if (oneLtrRegex.test(product.productSize)) {
//           total1LtrIssue += product.quantity || 0;
//           console.log(`   ✅ Matched 1Ltr — Running Total: ${total1LtrIssue}`);
//         } else if (halfLtrRegex.test(product.productSize)) {
//           totalHalfLtrIssue += product.quantity || 0;
//           console.log(`   ✅ Matched 1/2Ltr — Running Total: ${totalHalfLtrIssue}`);
//         } else {
//           console.log(`   ⚠️ Size "${product.productSize}" did not match any regex — check DB value`);
//         }
//       }

//       if (order.bottleReturns && order.bottleReturns.length > 0) {
//         console.log(`   🔄 Bottle Returns found:`, order.bottleReturns);
//         for (const ret of order.bottleReturns) {
//           console.log(`   ↩️ Return Size: "${ret.size}" | Qty: ${ret.quantity}`);

//           if (oneLtrRegex.test(ret.size)) {
//             total1LtrReturn += ret.quantity || 0;
//             console.log(`   ✅ Return matched 1Ltr — Running Total: ${total1LtrReturn}`);
//           } else if (halfLtrRegex.test(ret.size)) {
//             totalHalfLtrReturn += ret.quantity || 0;
//             console.log(`   ✅ Return matched 1/2Ltr — Running Total: ${totalHalfLtrReturn}`);
//           } else {
//             console.log(`   ⚠️ Return size "${ret.size}" did not match any regex — check DB value`);
//           }
//         }
//       } else {
//         console.log(`   📭 No bottle returns for this order`);
//       }
//     }

//     console.log("\n📊 Final Bottle Count:");
//     console.log(`   1Ltr   → Issue: ${total1LtrIssue}  | Return: ${total1LtrReturn}`);
//     console.log(`   1/2Ltr → Issue: ${totalHalfLtrIssue} | Return: ${totalHalfLtrReturn}`);
//     console.log(`   Total  → Issue: ${total1LtrIssue + totalHalfLtrIssue} | Return: ${total1LtrReturn + totalHalfLtrReturn}`);

//     return res.status(200).json({
//       success: true,
//       message: `Bottle count for ${targetDate}`,
//       data: {
//         // statusSummary: {
//         //   pending: pendingOrders.length,
//         //   delivered: deliveredOrders.length,
//         //   returned: returnedOrders.length,
//         // },
//         "1ltr": {
//           issue: total1LtrIssue,
//           return: total1LtrReturn,
//         },
//         "1/2ltr": {
//           issue: totalHalfLtrIssue,
//           return: totalHalfLtrReturn,
//         },
//         totalBottles: {
//           issue: total1LtrIssue + totalHalfLtrIssue,
//           return: total1LtrReturn + totalHalfLtrReturn,
//         },
//       },
//     });
//   } catch (err) {
//     console.error("❌ Bottle aggregation error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Failed to calculate bottle count",
//       error: err.message,
//     });
//   }
// };

// ✅ Updated Code of GetBottleCount For Date
const getBottleCountForDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required in DD/MM/YYYY format",
      });
    }

    const targetDate = date.replace(/-/g, "/");
    console.log("🗓️ Target Date:", targetDate);

    const convertToBottles = (sizeStr) => {
      if (!sizeStr) return { oneLtr: 0, halfLtr: 0 };

      const normalized = sizeStr.toLowerCase().trim();

      const sizeMap = {
        "1/2ltr":  { oneLtr: 0, halfLtr: 1 },
        "1/2 ltr": { oneLtr: 0, halfLtr: 1 },
        "0.5ltr":  { oneLtr: 0, halfLtr: 1 },
        "0.5 ltr": { oneLtr: 0, halfLtr: 1 },
        "500ml":   { oneLtr: 0, halfLtr: 1 },
        "1ltr":    { oneLtr: 1, halfLtr: 0 },
        "1 ltr":   { oneLtr: 1, halfLtr: 0 },
        "1.5ltr":  { oneLtr: 1, halfLtr: 1 },
        "1.5 ltr": { oneLtr: 1, halfLtr: 1 },
        "2ltr":    { oneLtr: 2, halfLtr: 0 },
        "2 ltr":   { oneLtr: 2, halfLtr: 0 },
        "2.5ltr":  { oneLtr: 2, halfLtr: 1 },
        "2.5 ltr": { oneLtr: 2, halfLtr: 1 },
        "3ltr":    { oneLtr: 3, halfLtr: 0 },
        "3 ltr":   { oneLtr: 3, halfLtr: 0 },
        "3.5ltr":  { oneLtr: 3, halfLtr: 1 },
        "3.5 ltr": { oneLtr: 3, halfLtr: 1 },
      };

      if (sizeMap[normalized]) {
        console.log(`   📐 Size "${sizeStr}" → sizeMap matched → 1ltr: ${sizeMap[normalized].oneLtr} | 1/2ltr: ${sizeMap[normalized].halfLtr}`);
        return sizeMap[normalized];
      }

      // Fallback
      const match = normalized.match(/^(\d+\.?\d*)\s*(ltr|l|liter|ml)?$/);
      if (match) {
        const liters = parseFloat(match[1]);
        const oneLtr = Math.floor(liters);
        const halfLtr = Math.round((liters % 1) * 10) / 10 === 0.5 ? 1 : 0;
        console.log(`   📐 Size "${sizeStr}" → fallback matched → liters: ${liters} | 1ltr: ${oneLtr} | 1/2ltr: ${halfLtr}`);
        return { oneLtr, halfLtr };
      }

      console.log(`   ⚠️ Size "${sizeStr}" → NO MATCH FOUND`);
      return { oneLtr: 0, halfLtr: 0 };
    };

    const orders = await CustomerOrders.find({
      deliveryDate: targetDate,
      status: { $in: ["Pending", "Delivered", "Returned"] },
    });

    console.log(`📦 Total Orders Found: ${orders.length}`);
    console.log(`⏳ Pending:   ${orders.filter((o) => o.status === "Pending").length}`);
    console.log(`✅ Delivered: ${orders.filter((o) => o.status === "Delivered").length}`);
    console.log(`🔁 Returned:  ${orders.filter((o) => o.status === "Returned").length}`);

    let total1LtrIssue = 0;
    let totalHalfLtrIssue = 0;
    let total1LtrReturn = 0;
    let totalHalfLtrReturn = 0;

   for (const order of orders) {
  console.log(`\n🧾 Order: ${order.orderNumber} | Status: ${order.status}`);

  // ✅ Issue = Pending + Delivered दोनों
  if (order.status === "Pending" || order.status === "Delivered") {
    for (const product of order.products) {
      if (!product.productName?.toLowerCase().includes("milk")) {
        console.log(`   ⛔ Skipped "${product.productName}" — Not a Milk product`);
        continue;
      }
      const { oneLtr, halfLtr } = convertToBottles(product.productSize);
      const qty = product.quantity || 1;
      total1LtrIssue += oneLtr * qty;
      totalHalfLtrIssue += halfLtr * qty;
      console.log(`   🥛 "${product.productName}" | Size: "${product.productSize}" | Qty: ${qty} → +${oneLtr * qty} (1ltr) +${halfLtr * qty} (1/2ltr)`);
    }
  }

  // ✅ Return = सिर्फ Returned orders
  if (order.status === "Returned") {
    if (!order.bottleReturns || order.bottleReturns.length === 0) {
      console.log(`   📭 No bottle returns for this order`);
    } else {
      for (const ret of order.bottleReturns) {
        const { oneLtr, halfLtr } = convertToBottles(ret.size);
        const qty = ret.quantity || 1;
        total1LtrReturn += oneLtr * qty;
        totalHalfLtrReturn += halfLtr * qty;
        console.log(`   ↩️ Return Size: "${ret.size}" | Qty: ${qty} → +${oneLtr * qty} (1ltr) +${halfLtr * qty} (1/2ltr)`);
      }
    }
  }
}

    console.log("\n📊 Final Bottle Count:");
    console.log(`   1ltr   → Issue: ${total1LtrIssue}   | Return: ${total1LtrReturn}`);
    console.log(`   1/2ltr → Issue: ${totalHalfLtrIssue} | Return: ${totalHalfLtrReturn}`);
    console.log(`   Total  → Issue: ${total1LtrIssue + totalHalfLtrIssue} | Return: ${total1LtrReturn + totalHalfLtrReturn}`);

    return res.status(200).json({
      success: true,
      message: `Bottle count for ${targetDate}`,
      data: {
        "1ltr": {
          issue: total1LtrIssue,
          return: total1LtrReturn,
        },
        "1/2ltr": {
          issue: totalHalfLtrIssue,
          return: totalHalfLtrReturn,
        },
        totalBottles: {
          issue: total1LtrIssue + totalHalfLtrIssue,
          return: total1LtrReturn + totalHalfLtrReturn,
        },
      },
    });
  } catch (err) {
    console.error("❌ Bottle aggregation error:", err);
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
