const Customer = require("../models/customerModel");
const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const SubscriptionPlan = require("../models/subscrptionplanModel");
const Subscription = require("../models/subscrptionModel");
const DeliveryBoy = require("../models/deliveryBoyModel");
const Product = require("../models/productModel");
const Invoice = require("../models/invoiceModel");
const Notification = require("../models/notificationModel");

exports.createCustomer = catchAsyncErrors(async (req, res, next) => {
  const {
    name,
    phoneNumber,
    products, // Array of { productType, size, quantity, price, subscriptionPlan }
    deliveryDays,
    deliveryBoy,
    address,
    frequency,
    paymentMode,
    paymentStatus,
    isPartialPayment,
    amountPaid,
  } = req.body;

  // Validate required fields
  if (
    !name ||
    !phoneNumber ||
    !Array.isArray(products) ||
    products.length === 0 ||
    !deliveryDays ||
    !deliveryBoy ||
    !address ||
    !paymentMode
  ) {
    return next(
      new ErrorHandler(
        "All required fields must be provided including products array",
        400
      )
    );
  }

  // Check if customer already exists
  const existingCustomer = await Customer.findOne({ phoneNumber });
  if (existingCustomer) {
    return next(
      new ErrorHandler("Customer with this phone number already exists", 400)
    );
  }

  // Validate products array & check stock availability
  let totalPrice = 0;
  const validatedProducts = [];

  for (const item of products) {
    const { productType, size, quantity, price, subscriptionPlan } = item;

    if (!productType || !size || !quantity || !price || !subscriptionPlan) {
      return next(
        new ErrorHandler(
          "Each product must have productType, size, quantity, price, and subscriptionPlan",
          400
        )
      );
    }

    const quantityNumber = Number(quantity);
    const priceNumber = Number(price);

    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      return next(
        new ErrorHandler(
          `Quantity must be a valid number for product ${productType}`,
          400
        )
      );
    }

    if (isNaN(priceNumber) || priceNumber <= 0) {
      return next(
        new ErrorHandler(
          `Price must be a valid number for product ${productType}`,
          400
        )
      );
    }

    // Find product by type and size
    const product = await Product.findOne({ productType, size });
    if (!product) {
      return next(
        new ErrorHandler(
          `Product not found for type "${productType}" and size "${size}"`,
          404
        )
      );
    }

    if (product.stock < quantityNumber) {
      return next(
        new ErrorHandler(
          `Insufficient stock for product "${productType}" size "${size}"`,
          400
        )
      );
    }

    // Find subscription plan
    const plan = await SubscriptionPlan.findOne({ subscriptionPlan });
    if (!plan) {
      return next(
        new ErrorHandler(
          `Subscription plan "${subscriptionPlan}" not found`,
          404
        )
      );
    }

    totalPrice += priceNumber * quantityNumber;

    validatedProducts.push({
      product: product._id,
      productType,
      size,
      quantity: quantityNumber,
      price: priceNumber,
      subscriptionPlan,
      plan, // save plan for later use
    });
  }

  // Create Customer with products array (storing details needed)
  const customer = await Customer.create({
    name,
    phoneNumber,
    products: validatedProducts.map((p) => ({
      product: p.product,
      productType: p.productType,
      size: p.size,
      quantity: p.quantity,
      price: p.price,
      subscriptionPlan: p.subscriptionPlan,
    })),
    deliveryDays,
    deliveryBoy,
    address,
    createdBy: req.user?._id || null,
  });

  // Create Subscription (aggregate from all products)
  // For demo, we use the first product's plan as base (or create custom logic)
  const firstPlan = validatedProducts[0].plan;

  const subscription = await Subscription.create({
    customer: customer._id,
    name: customer.name,
    phoneNumber: customer.phoneNumber,
    products: customer.products, // array of products
    deliveryDays: customer.deliveryDays,
    assignedDeliveryBoy: customer.deliveryBoy,
    address: customer.address,
    subscriptionPlan: firstPlan.subscriptionPlan,
    frequency: frequency || "Every Day",
    price: totalPrice,
    startDate: new Date(),
    status: "Active",
    deliveryTime: firstPlan.deliveryTime,
    discount: firstPlan.discount,
    totalPrice,
    isActive: true,
  });

  // Generate invoices per product
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const dateStr = `${dd}${mm}${yyyy}`;

  const invoices = [];

  for (const [index, p] of validatedProducts.entries()) {
    // Count existing invoices today to generate unique invoice ID per invoice
    const countToday = await Invoice.countDocuments({
      createdAt: {
        $gte: new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`),
        $lte: new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`),
      },
    });

    const paddedCount = String(countToday + index + 1).padStart(3, "0");
    const invoiceId = `INV-${dateStr}-${paddedCount}`;

    // Payment split logic (simplified: divide amountPaid and dueAmount equally among products if partial)
    let finalPaymentStatus = paymentStatus || "Unpaid";
    let paidAmount = 0;
    let dueAmount = p.price * p.quantity;
    let isPartial = false;

    if (isPartialPayment && amountPaid) {
      // Split paid amount proportionally
      const totalPaid = parseFloat(amountPaid);
      const proportion = (p.price * p.quantity) / totalPrice;
      paidAmount = parseFloat((totalPaid * proportion).toFixed(2));
      dueAmount = dueAmount - paidAmount;
      isPartial = true;
      finalPaymentStatus =
        paidAmount < p.price * p.quantity ? "Partial" : "Paid";
    } else if (finalPaymentStatus === "Paid") {
      paidAmount = p.price * p.quantity;
      dueAmount = 0;
    }

    // Deduct product stock
    const productDoc = await Product.findById(p.product);
    productDoc.stock -= p.quantity;
    await productDoc.save();

    // Create invoice
    const invoice = await Invoice.create({
      invoiceId,
      customer: customer._id,
      customerName: customer.name,
      productId: p.product,
      productType: p.product,
      size: p.size,
      productQuantity: p.quantity,
      price: p.price,
      subscriptionPlan: p.subscriptionPlan,
      paymentMode,
      paymentStatus: finalPaymentStatus,
      partialPayment: isPartial,
      amountPaid: paidAmount,
      amountDue: dueAmount,
    });

    invoices.push(invoice);
  }

  // Create delivery boy notification
  if (customer.deliveryBoy) {
    await Notification.create({
      deliveryBoy: customer.deliveryBoy,
      message: `New customer (${customer.name}) created with ${products.length} product(s).`,
    });
  }

  res.status(201).json({
    success: true,
    message: "Customer, subscription, and invoices created successfully",
    customer,
    subscription,
    invoices,
  });
});

exports.getAllCustomers = catchAsyncErrors(async (req, res, next) => {
  const { productType, productSize, page = 1, limit = 10 } = req.query;

  // Convert pagination params to numbers and set defaults
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  // 1. Fetch paginated customers sorted by newest first
  const customers = await Customer.find()
    .populate("deliveryBoy", "name email phoneNumber area")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // If no customers found, return empty result early
  if (!customers.length) {
    return res.status(200).json({
      success: true,
      count: 0,
      customers: [],
    });
  }

  // 2. Fetch subscriptions for these customers with active/blocked status
  const subscriptions = await Subscription.find({
    customer: { $in: customers.map((c) => c._id) },
    status: { $in: ["Active", "Blocked"] },
  })
    .select(
      "customer status subscriptionPlan startDate endDate isActive deliveryDays frequency price totalPrice deliveryTime discount products"
    )
    .populate("products", "name productType size quantity"); // include size & quantity

  // 3. Map customerId => latest subscription
  const subscriptionMap = {};
  subscriptions.forEach((sub) => {
    const customerId = sub.customer?.toString();
    if (!customerId) return;

    const existing = subscriptionMap[customerId];
    if (!existing || new Date(sub.startDate) > new Date(existing.startDate)) {
      subscriptionMap[customerId] = sub;
    }
  });

  // 4. Merge subscription data into customers
  let enrichedCustomers = customers.map((customer) => {
    const sub = subscriptionMap[customer._id.toString()] || null;

    // Extract product types and sizes
    const productTypes = sub?.products?.length
      ? sub.products.map((p) => p.productType)
      : [];

    const productSizes = sub?.products?.length
      ? sub.products.map((p) => p.size)
      : [];

    return {
      ...customer.toObject(),
      subscriptionStatus: sub?.status || "No Plan",
      subscriptionPlan:
        sub?.subscriptionPlan || customer.subscriptionPlan || "No Plan",
      subscriptionStartDate: sub?.startDate || null,
      subscriptionEndDate: sub?.endDate || null,
      isActive: sub?.isActive ?? false,
      deliveryDays: sub?.deliveryDays || customer.deliveryDays || null,
      frequency: sub?.frequency || null,
      price: sub?.price || null,
      totalPrice: sub?.totalPrice || null,
      deliveryTime: sub?.deliveryTime || null,
      discount: sub?.discount || null,
      products: sub?.products || [],
      productTypes,
      productSizes,
    };
  });

  // 5. Apply productType filter if provided
  if (productType) {
    enrichedCustomers = enrichedCustomers.filter((customer) =>
      customer.productTypes.includes(productType)
    );
  }

  // 6. Apply productSize filter if provided
  if (productSize) {
    enrichedCustomers = enrichedCustomers.filter((customer) =>
      customer.productSizes.includes(productSize)
    );
  }

  // 7. Return paginated result
  res.status(200).json({
    success: true,
    count: enrichedCustomers.length,
    page: pageNum,
    limit: limitNum,
    customers: enrichedCustomers,
  });
});
