const Invoice = require("../models/invoiceModel");
const Product = require("../models/productModel");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

// exports.getDashboardStats = catchAsyncErrors(async (req, res, next) => {
//   const allInvoices = await Invoice.find();

//   // Total Sales (for Paid invoices)
//   const paidInvoices = allInvoices.filter(inv => inv.paymentStatus === "Paid");
//   const totalSales = paidInvoices.reduce((sum, inv) => sum + inv.price, 0);

//   // Subscription Counts
//   const subscriptionCounts = {
//     Daily: 0,
//     Weekly: 0,
//     Monthly: 0,
//     totalSubscriptions: 0
//   };

//   allInvoices.forEach(inv => {
//     if (inv.subscriptionPlan) {
//       if (subscriptionCounts[inv.subscriptionPlan] !== undefined) {
//         subscriptionCounts[inv.subscriptionPlan]++;
//       }
//       subscriptionCounts.totalSubscriptions++;
//     }
//   });

//   // Low stock alert
//   const lowStockThreshold = 10;
//   const lowStockProducts = await Product.find({ stock: { $lte: lowStockThreshold } })
//     .select("productType stock");

//   // Pending Payments
//   const unpaidInvoices = allInvoices.filter(inv => inv.paymentStatus === "Unpaid");
//   const totalPendingAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.price, 0);
//   const totalPendingCount = unpaidInvoices.length;

//   res.status(200).json({
//     success: true,
//     message: "Dashboard stats fetched successfully",
//     stats: {
//       totalSales,
//       subscriptionCounts,
//       lowStockAlerts: lowStockProducts,
//       pendingPayments: {
//         totalPendingCount,
//         totalPendingAmount
//       }
//     }
//   });
// });

exports.getDashboardStats = catchAsyncErrors(async (req, res, next) => {
  const allInvoices = await Invoice.find();

  const paidInvoices = allInvoices.filter(inv => inv.paymentStatus === "Paid");
  const totalSales = paidInvoices.reduce((sum, inv) => sum + (inv.price || 0), 0);

  const subscriptionCounts = {
    Daily: 0,
    Weekly: 0,
    Monthly: 0,
    totalSubscriptions: 0
  };

  allInvoices.forEach(inv => {
    const plan = inv.subscriptionPlan;
    if (plan && subscriptionCounts[plan] !== undefined) {
      subscriptionCounts[plan]++;
      subscriptionCounts.totalSubscriptions++;
    }
  });

  // 🛠 Fix: Explicitly filter for stock that exists and is a number <= 10
  const lowStockProducts = await Product.find({
    stock: { $exists: true, $ne: null, $lte: 10 }
  })
    .select("productType stock size")
    .sort({ stock: 1 });

  const unpaidInvoices = allInvoices.filter(inv => inv.paymentStatus === "Unpaid");
  const totalPendingAmount = unpaidInvoices.reduce((sum, inv) => sum + (inv.price || 0), 0);
  const totalPendingCount = unpaidInvoices.length;

  res.status(200).json({
    success: true,
    message: "Dashboard stats fetched successfully",
    stats: {
      totalSales,
      subscriptionCounts,
      pendingPayments: {
        totalPendingCount,
        totalPendingAmount
      },
      lowStockAlerts: {
        count: lowStockProducts.length,
        products: lowStockProducts
      }
    }
  });
});


exports.getSalesReport = catchAsyncErrors(async (req, res, next) => {
  const sales = await Invoice.find({ paymentStatus: { $in: ["Paid", "Unpaid"] } })
    .populate({
      path: "customer",
      select: "name"
    })
    .sort({ createdAt: -1 });

  const salesList = sales.map((inv) => ({
    _id:inv._id,
    customerName: inv.customer?.name || "N/A",
    date: inv.createdAt,
    productType: inv.productType,
    productQuantity: inv.productQuantity,
    totalAmount: inv.price,
    // payment: inv.payment || "N/A",
    payment:inv.paymentMode || "N/A",
    paymentStatus: inv.paymentStatus
  }));

  res.status(200).json({
    success: true,
    totalSales: salesList.length,
    sales: salesList
  });
});


// Helper: Get start and end date of the current week (Monday to Sunday)
const getCurrentWeekDates = () => {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 1 = Monday...
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const daysOfWeek = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    daysOfWeek.push(new Date(d));
  }

  return daysOfWeek;
};

exports.getWeeklyEarningsByDay = catchAsyncErrors(async (req, res, next) => {
  const weekDays = getCurrentWeekDates();

  const earningsByDay = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Fetch all invoices for the current week
  const startDate = weekDays[0];
  const endDate = new Date(weekDays[6]);
  endDate.setHours(23, 59, 59, 999);

  const invoices = await Invoice.find({
    createdAt: { $gte: startDate, $lte: endDate },
    paymentStatus: "Paid"
  });

  for (const inv of invoices) {
    const invDate = new Date(inv.createdAt);
    const dayName = dayNames[invDate.getDay()];
    if (earningsByDay[dayName] !== undefined) {
      earningsByDay[dayName] += inv.price;
    }
  }

  const totalEarnings = Object.values(earningsByDay).reduce((sum, val) => sum + val, 0);

  res.status(200).json({
    success: true,
    week: earningsByDay,
    totalEarnings
  });
});

exports.getDeliverySummary = catchAsyncErrors(async (req, res, next) => {
  const invoices = await Invoice.find({ status: { $in: ["Delivered", "Accepted", "Pending"] } });

  let totalDeliveredBottles = 0;
  let totalReturnedBottles = 0;

  let summaryByQty = {
    "1L": { delivered: 0, returned: 0 },
    "0.5L": { delivered: 0, returned: 0 }
  };

  invoices.forEach(inv => {
    const qty = inv.productQuantity?.toString().trim();
    const returned = Number(inv.bottleReturned) || 0;

    if (qty === "1" || qty === "1L") {
      summaryByQty["1L"].delivered += 1;
      summaryByQty["1L"].returned += returned;
    } else if (qty === "0.5" || qty === "0.5L") {
      summaryByQty["0.5L"].delivered += 1;
      summaryByQty["0.5L"].returned += returned;
    }

    totalDeliveredBottles += 1;
    totalReturnedBottles += returned;
  });

  res.status(200).json({
    success: true,
    summary: {
      totalDeliveredBottles,
      totalReturnedBottles: parseFloat(totalReturnedBottles.toFixed(2)),
      byQuantity: {
        "1L": {
          delivered: summaryByQty["1L"].delivered,
          returned: parseFloat(summaryByQty["1L"].returned.toFixed(2))
        },
        "0.5L": {
          delivered: summaryByQty["0.5L"].delivered,
          returned: parseFloat(summaryByQty["0.5L"].returned.toFixed(2))
        }
      }
    }
  });
});


function getStartAndEndOfWeek() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

// Utility to get current week's Monday to Sunday


exports.getProductInsightThisWeek = catchAsyncErrors(async (req, res, next) => {
  const { monday, sunday } = getStartAndEndOfWeek();

  // Fetch all delivered invoices in the week
  const invoices = await Invoice.find({
    status: "Delivered",
    createdAt: { $gte: monday, $lte: sunday }
  });

  const productMap = {};
  const todayMap = {};
  let totalDelivered = 0;

  // Count deliveries
  invoices.forEach(inv => {
    const type = inv.productType;

    productMap[type] = (productMap[type] || 0) + 1;

    // Today tracking
    const created = new Date(inv.createdAt);
    const isToday = created.toDateString() === new Date().toDateString();
    if (isToday) {
      todayMap[type] = (todayMap[type] || 0) + 1;
    }

    totalDelivered += 1;
  });

  // Get all product types from Product collection
  const allProducts = await Product.find({}, "productType");
  const allProductTypes = [...new Set(allProducts.map(p => p.productType))];

  // Fill 0 for products not sold this week
  allProductTypes.forEach(type => {
    if (!productMap[type]) productMap[type] = 0;
  });

  const productInsights = Object.entries(productMap)
    .map(([type, count]) => ({ productType: type, deliveredCount: count }))
    .sort((a, b) => b.deliveredCount - a.deliveredCount);

  const topSelling = productInsights[0] || {};
  const leastSelling = productInsights
    .filter(p => p.deliveredCount === 0)[0] || productInsights[productInsights.length - 1] || {};

  const productOfDay = Object.entries(todayMap)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ productType: type, deliveredCount: count }))[0] || {};

  res.status(200).json({
    success: true,
    message: "Product insights fetched successfully",
    week: {
      from: monday.toISOString().split("T")[0],
      to: sunday.toISOString().split("T")[0]
    },
    totalDelivered: `${totalDelivered} unit`,
    productOfDay: productOfDay.productType || "N/A",
    topSelling: topSelling.productType || "N/A",
    lowestProductSale: leastSelling.productType || "N/A",
    productInsights
  });
});


// exports.getBottleTracking = catchAsyncErrors(async (req, res, next) => {
//   const { startDate, endDate } = req.query;

//   const start = startDate ? new Date(startDate) : new Date("2000-01-01");
//   const end = endDate ? new Date(endDate) : new Date();
//   end.setHours(23, 59, 59, 999);

//   // Fetch all invoices within the date range (no filter on status or bottleIssued)
//   const invoices = await Invoice.find({
//     invoiceDate: { $gte: start, $lte: end },
//   });

//   let totalInvoices = invoices.length;
//   let totalBottles = 0;
//   let totalReturnedBottles = 0;

//   const byQuantity = {
//     "500ml": { issued: 0, returned: 0 },
//     "1L": { issued: 0, returned: 0 },
//     "2L": { issued: 0, returned: 0 },
//   };

//   const tracking = [];

//   invoices.forEach(inv => {
//     const qtyRaw = inv.productQuantity?.toString().trim().toLowerCase();
//     let size = "";

//     if (["0.5", "500ml", "1/2"].includes(qtyRaw)) size = "500ml";
//     else if (["1", "1l", "1ltr"].includes(qtyRaw)) size = "1L";
//     else if (["2", "2l", "2ltr"].includes(qtyRaw)) size = "2L";
//     else size = "Unknown";

//     // Count total issued bottles (if productQuantity is valid)
//     if (size !== "Unknown") {
//       byQuantity[size].issued += 1;
//       totalBottles += 1;
//     }

//     const returned = inv.bottleReturnedYesNo === true;

//     if (returned && size !== "Unknown") {
//       byQuantity[size].returned += 1;
//       totalReturnedBottles += 1;
//     }

//     tracking.push({
//       customerName: inv.customerName || "N/A",
//       productType: inv.productType || "N/A",
//       productQuantity: size,
//       invoiceDate: inv.invoiceDate?.toISOString().split("T")[0] || "N/A",
//       bottleReturn: returned ? "Yes" : "No",
//       status: inv.status || "N/A"
//     });
//   });

//   res.status(200).json({
//     success: true,
//     message: "Bottle tracking and summary fetched successfully",
//     summary: {
//       totalInvoices,
//       totalBottles,
//       totalReturnedBottles,
//       byQuantity,
//     },
//     tracking,
//   });
// });



exports.getBottleTracking = catchAsyncErrors(async (req, res, next) => {
  const { from, to } = req.query;

  const start = from ? new Date(from) : new Date("2000-01-01");
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999); // include entire end day

  const invoices = await Invoice.find({
    invoiceDate: { $gte: start, $lte: end },
  });

  let totalInvoices = invoices.length;
  let totalBottles = 0;
  let totalReturnedBottles = 0;

  const byQuantity = {
    "500ml": { issued: 0, returned: 0 },
    "1L": { issued: 0, returned: 0 },
    "2L": { issued: 0, returned: 0 },
  };

  const tracking = [];

  invoices.forEach(inv => {
    const qtyRaw = inv.productQuantity?.toString().trim().toLowerCase();
    let size = "";

    if (["0.5", "500ml", "1/2"].includes(qtyRaw)) size = "500ml";
    else if (["1", "1l", "1ltr"].includes(qtyRaw)) size = "1L";
    else if (["2", "2l", "2ltr"].includes(qtyRaw)) size = "2L";
    else size = "Unknown";

    if (size !== "Unknown") {
      byQuantity[size].issued += 1;
      totalBottles += 1;
    }

    const returned = inv.bottleReturnedYesNo === true;

    if (returned && size !== "Unknown") {
      byQuantity[size].returned += 1;
      totalReturnedBottles += 1;
    }

    tracking.push({
      customerName: inv.customerName || "N/A",
      productType: inv.productType || "N/A",
      productQuantity: size,
      invoiceDate: inv.invoiceDate?.toISOString().split("T")[0] || "N/A",
      bottleReturn: returned ? "Yes" : "No",
      status: inv.status || "N/A"
    });
  });

  res.status(200).json({
    success: true,
    message: "Bottle tracking and summary fetched successfully",
    summary: {
      totalInvoices,
      totalBottles,
      totalReturnedBottles,
      byQuantity,
    },
    tracking,
  });
});
