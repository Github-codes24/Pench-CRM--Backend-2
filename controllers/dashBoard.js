const Product = require("../models/productModel");
const ErrorHandler = require("../utils/errorhendler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const Customer = require("../models/coustomerModel");
const { formatDate } = require("../utils/dateUtils");

// low-stock
exports.getLowStockProducts = catchAsyncErrors(async (req, res, next) => {
    const products = await Product.find(
        { stock: { $lt: 10 } },
        { productName: 1, productCode: 1, stock: 1, size: 1, _id: 0 }
    );

    if (!products || products.length === 0) {
        return next(new ErrorHandler("No low stock products found", 404));
    }

    res.status(200).json({
        success: true,
        count: products.length,
        products,
    });
});





// Dashboard subscription
exports.getActiveSubscriptions = catchAsyncErrors(async (req, res, next) => {
    const { customerId } = req.query;

    const match = {};
    if (customerId) match._id = customerId;

    const customers = await Customer.find(match)
        .select("name phoneNumber address userProfile products")
        .populate({
            path: "products.product",
            select: "productName size productCode",
        })
        .lean();

    if (!customers || customers.length === 0) {
        return next(new ErrorHandler("No customers found", 404));
    }

    const subscriptions = [];
    for (const c of customers) {
        if (!Array.isArray(c.products) || c.products.length === 0) continue;

        for (const p of c.products) {
            if (!p || !p.product) continue;

            subscriptions.push({
                id: c._id,
                fullName: c.name,
                phoneNumber: c.phoneNumber,
                address: c.address,
                userProfile: c.userProfile,

                productType: p.product.productName,
                productSize: p.product.size,
                productCode: p.product.productCode,

                quantity: p.quantity,
                startDate: p.startDate ? formatDate(p.startDate) : null,
                endDate: p.endDate ? formatDate(p.endDate) : null,

                subscription: p.subscriptionPlan,
                deliveryDays: p.deliveryDays,
                status: "Active",
            });
        }
    }

    if (subscriptions.length === 0) {
        return next(new ErrorHandler("No active subscriptions found", 404));
    }

    res.status(200).json({
        success: true,
        count: subscriptions.length,
        data: subscriptions,
    });
});











