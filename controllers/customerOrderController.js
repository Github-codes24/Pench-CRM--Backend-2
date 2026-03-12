const CustomerOrders = require("../models/customerOrderModel");
const Customer = require("../models/customerModel");
const { generateOrderNumber } = require("../utils/generateOrderNumber");
const Product = require("../models/productModel");
const DeliveryBoy = require("../models/deliveryBoyModel");
const moment = require("moment");
const Razorpay = require("razorpay");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const gstNumber = process.env.GST_NUMBER;

// Helper function to get all available sizes for products with same name
const getAvailableSizesForProduct = async (productName) => {
  const products = await Product.find({ productName }, "size");
  const allSizes = products.map((p) => p.size);
  // Remove duplicates and return unique sizes
  return [...new Set(allSizes)];
};

// Create automatic orders for a customer based on their subscription plan and delivery date
const createAutomaticOrdersForCustomer = async (
  customerId,
  deliveryBoyId,
  deliveryDate = null
) => {
  try {
    const customer = await Customer.findById(customerId).populate(
      "products.product"
    );

    if (!customer || !customer.products || customer.products.length === 0) {
      return { success: false, message: "No products found for customer" };
    }

    const orderDeliveryDate = deliveryDate || customer.startDate;

    const ordersCreated = [];

    let shouldDeliver = false;

    if (
      customer.subscriptionPlan === "Monthly" ||
      customer.subscriptionPlan === "Alternate Days"
    ) {
      shouldDeliver = true;
    } else if (customer.subscriptionPlan === "Custom Date") {
      shouldDeliver =
        customer.customDeliveryDates &&
        customer.customDeliveryDates.includes(orderDeliveryDate);
    }

    if (shouldDeliver) {
      const orderNumber = await generateOrderNumber();
      const orderItems = [];
      let totalAmount = 0;

      // Create order items for all products
      for (const product of customer.products) {
        if (!product.product) continue;

        const itemTotalPrice = product.quantity * parseFloat(product.price);
        totalAmount += itemTotalPrice;

        orderItems.push({
          _id: product.product._id,
          productName: product.product.productName,
          price: product.price,
          productSize: product.productSize,
          quantity: product.quantity,
          totalPrice: itemTotalPrice,
        });
      }

      const order = new CustomerOrders({
        customer: customerId,
        deliveryBoy: deliveryBoyId,
        deliveryDate: orderDeliveryDate,
        products: orderItems,
        orderNumber,
        totalAmount,
        status: "Pending",
      });

      await order.save();
      ordersCreated.push(order);
    }

    return {
      success: true,
      message: `Created ${ordersCreated.length} automatic orders for delivery date: ${orderDeliveryDate}`,
      orders: ordersCreated,
    };
  } catch (error) {
    console.error("Error creating automatic orders:", error);
    return {
      success: false,
      message: "Error creating automatic orders",
      error: error.message,
    };
  }
};

// Function for server start
const initializeOrders = async () => {
  try {
    const today = moment().format("DD/MM/YYYY");
    const tomorrow = moment().add(1, "day").format("DD/MM/YYYY");

    const activeCustomers = await Customer.find({
      subscriptionStatus: "active",
      isDeleted: false,
    })
      .populate("products.product")
      .populate("deliveryBoy");

    if (activeCustomers.length === 0) {
      console.log("No active customers found for order creation.");
      return;
    }

    let ordersCreatedToday = 0;
    let ordersCreatedTomorrow = 0;

    for (const customer of activeCustomers) {
      const existingOrderToday = await CustomerOrders.findOne({
        customer: customer._id,
        deliveryDate: today,
      });

      const existingOrderTomorrow = await CustomerOrders.findOne({
        customer: customer._id,
        deliveryDate: tomorrow,
      });

      if (!existingOrderToday) {
        const shouldCreateToday = await shouldCreateOrderForCustomer(
          customer,
          today
        );
        if (shouldCreateToday) {
          const result = await createAutomaticOrdersForCustomer(
            customer._id,
            customer.deliveryBoy._id,
            today
          );
          if (result.success && result.orders.length > 0) {
            ordersCreatedToday++;
          }
        }
      }

      if (!existingOrderTomorrow) {
        const shouldCreateTomorrow = await shouldCreateOrderForCustomer(
          customer,
          tomorrow
        );
        if (shouldCreateTomorrow) {
          const result = await createAutomaticOrdersForCustomer(
            customer._id,
            customer.deliveryBoy._id,
            tomorrow
          );
          if (result.success && result.orders.length > 0) {
            ordersCreatedTomorrow++;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in initializing orders:", error.message);
  }
};

// function to check if an order should be created for a customer on a specific date
const shouldCreateOrderForCustomer = async (customer, date) => {
  // Check if the customer is not absent on this date
  const isNotAbsent = !customer.absentDays?.includes(date);
  if (!isNotAbsent) {
    return false;
  }

  const currentDate = moment(date, "DD/MM/YYYY");
  const startDate = moment(customer.startDate, "DD/MM/YYYY");
  const endDate = moment(customer.endDate, "DD/MM/YYYY");

  if (!currentDate.isBetween(startDate, endDate, "day", "[]")) {
    return false;
  }

  // Check subscription plan specific logic
  switch (customer.subscriptionPlan) {
    case "Monthly":
      return true;

    case "Alternate Days":
      const daysFromStart = currentDate.diff(startDate, "days");
      return daysFromStart % 2 === 0;

    case "Custom Date":
      return customer.customDeliveryDates?.includes(date) || false;

    default:
      return false;
  }
};

//✅ Create Additional Order
const createAdditionalOrder = async (req, res) => {
  try {
    const { customerId } = req?.params;
    const { date, products, deliveryBoyId } = req.body;

    // Validation
    if (!customerId || !products || products.length === 0 || !deliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "Customer, products, and deliveryBoy are required",
      });
    }

    const customer = await Customer.findById(customerId);

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Customer not found.",
      });
    } else if (!deliveryBoy) {
      return res.status(400).json({
        success: false,
        message: "Delivery boy not found.",
      });
    }

    for (let item of products) {
      const { productName, price, productSize, quantity, totalPrice } = item;

      if (!productName || !price || !productSize || !quantity || !totalPrice) {
        return res.status(400).json({
          success: false,
          message: "All product fields are required",
          requiredFields: [
            "productName",
            "price",
            "productSize",
            "quantity",
            "totalPrice",
          ],
        });
      }

      // Validate that totalPrice matches quantity * price
      const expectedTotalPrice = parseFloat(quantity) * parseFloat(price);
      const providedTotalPrice = parseFloat(totalPrice);

      if (Math.abs(expectedTotalPrice - providedTotalPrice) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Total price mismatch for ${productName}. Expected: ${expectedTotalPrice}, Provided: ${providedTotalPrice}`,
          productName,
          expectedTotalPrice,
          providedTotalPrice,
        });
      }

      const productDoc = await Product.findOne({ productName: productName });

      if (!productDoc) {
        const availableProducts = await Product.find({}, "productName size");
        return res.status(400).json({
          success: false,
          message: `Product '${productName}' not found. Please select from the available products.`,
          availableProducts: availableProducts.map((p) => ({
            productName: p.productName,
            availableSizes: p.size,
          })),
        });
      }

      // Validate product size - check if the requested size is available for this product
      const availableSizes = await getAvailableSizesForProduct(productName);
      if (!availableSizes.includes(productSize)) {
        return res.status(400).json({
          success: false,
          message: `Product size '${productSize}' is not available for '${productName}'.`,
          availableSizes: availableSizes,
        });
      }

      item._id = productDoc._id;
    }

    const existingOrder = await CustomerOrders.findOne({
      customer: customer._id,
      deliveryBoy: deliveryBoy._id,
      deliveryDate: date,
      status: { $in: ["Pending"] },
    });

    let savedOrder;
    let isNewOrder = false;

    if (existingOrder) {
      const newProducts = products.map((item) => {
        return { ...item, _id: item._id };
      });

      const duplicateProducts = [];

      for (const newProduct of newProducts) {
        const existingProductIndex = existingOrder.products.findIndex(
          (existingProduct) =>
            existingProduct._id.toString() === newProduct._id.toString() &&
            existingProduct.productSize === newProduct.productSize
        );

        if (existingProductIndex !== -1) {
          const existingProduct = existingOrder.products[existingProductIndex];
          duplicateProducts.push({
            productName: existingProduct.productName,
            productSize: existingProduct.productSize,
            quantity: existingProduct.quantity,
            price: existingProduct.price,
          });
        }
      }

      if (duplicateProducts.length > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Product with same name and size already ordered for this customer",
          duplicateProducts: duplicateProducts,
        });
      }

      existingOrder.products.push(...newProducts);

      existingOrder.totalAmount = existingOrder.products.reduce(
        (total, product) => total + parseFloat(product.totalPrice || 0),
        0
      );

      savedOrder = await existingOrder.save();
    } else {
      // Create new order
      const newOrder = new CustomerOrders({
        customer: customer._id,
        orderNumber: await generateOrderNumber(),
        deliveryDate: date,
        products: products.map((item) => {
          return { ...item, _id: item._id };
        }),
        deliveryBoy: deliveryBoy._id,
        totalAmount: products.reduce(
          (total, product) => total + parseFloat(product.totalPrice || 0),
          0
        ),
        status: "Pending",
        paymentStatus: "Unpaid",
      });

      savedOrder = await newOrder.save();
      isNewOrder = true;
    }

    const populatedOrder = await CustomerOrders.findById(savedOrder._id);

    return res.status(201).json({
      success: true,
      message: isNewOrder
        ? "New order created successfully"
        : "Products added to existing order successfully",
      data: populatedOrder,
      isNewOrder: isNewOrder,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating order",
      error: error.message,
    });
  }
};

//✅ Update Order Status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await CustomerOrders.findById(orderId)
      .populate("customer")
      .populate("products._id");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // ✅ Update status if provided
    if (status) {
      // Agar already Delivered hai, to dobara increment mat karo
      if (status === "Delivered" && order.status !== "Delivered") {
        let milkQuantity = 0;
        order.products.forEach((p) => {
          if (p.productName.toLowerCase() === "milk") {
            milkQuantity += p.quantity;
          }
        });

        // Sirf ek baar Delivered hone par hi add karo
        order.pendingBottleReturnQuantity =
          (order.pendingBottleReturnQuantity || 0) + milkQuantity;
      }

      order.status = status;
    }

    // // ✅ Handle bottle return size if provided
    // if (bottleReturnSize) {
    //   order.bottleReturnSize = bottleReturnSize;
    // }

    // // ✅ Handle bottlesReturned count manually from body
    // if (typeof bottlesReturned === "number" && bottlesReturned >= 0) {
    //   order.bottlesReturned = bottlesReturned;

    //   // Decrease pendingBottleReturnQuantity based on returned bottles
    //   order.pendingBottleReturnQuantity =
    //     (order.pendingBottleReturnQuantity || 0) - bottlesReturned;

    //   if (order.pendingBottleReturnQuantity < 0) {
    //     order.pendingBottleReturnQuantity = 0; // prevent negative
    //   }
    // }

    await order.save();

    //✅ Comma Seprated value
    const productNames = order.products.map((p) => p.productName).join(", ");
    const productSizes = order.products.map((p) => p.productSize).join(", ");
    const productQuantities = order.products.map((p) => p.quantity).join(", ");

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      _id: order?._id,
      orderNumber: order?.orderNumber,
      customerId: order?.customer?._id,
      customerName: order?.customer?.name,
      productName: productNames,
      productSize: productSizes,
      quantity: productQuantities,
      status: order?.status,
      pendingBottleReturnQuantity: order?.pendingBottleReturnQuantity,
    });
  } catch (error) {
    console.error("updateOrderStatus Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating order",
      error: error.message,
    });
  }
};

//✅ Update Bottle Returns

// Helper: normalize size like "1ltr", "2.5ltr", "1/2ltr"
const normalizeSize = (sizeStr) => {
  if (!sizeStr) return "1ltr";
  const s = sizeStr.toString().toLowerCase().replace(/\s/g, "");
  if (s.includes("1/2")) return "1/2ltr";
  return s;
};

const convertToStandardBottles = (size, quantity) => {
  const litersPerUnit = parseFloat(size.replace("ltr", ""));
  const totalLiters = litersPerUnit * quantity;

  const oneLtrBottles = Math.floor(totalLiters);
  const remainder = totalLiters % 1;
  const halfLtrBottles = remainder >= 0.5 ? 1 : 0;

  return { oneLtrBottles, halfLtrBottles };
};

const updateBottleReturns = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { bottleReturns } = req.body;

    const deliveryBoy = await DeliveryBoy.findById(req.deliveryBoy._id);

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    const today = moment().format("DD/MM/YYYY");

    // Find the last delivered order for this customer and delivery boy
    const lastDeliveredOrder = await CustomerOrders.findOne({
      customer: customerId,
      deliveryBoy: deliveryBoy._id,
      status: "Delivered",
      deliveryDate: { $ne: today },
    })
      .populate("customer")
      .populate("deliveryBoy")
      .sort({ deliveryDate: -1, createdAt: -1 }); // Sort by delivery date descending, then by creation date

    if (!lastDeliveredOrder) {
      return res.status(404).json({
        success: false,
        message: "No delivered order found for this customer",
      });
    }

    const todayOrder = await CustomerOrders.findOne({
      customer: customerId,
      deliveryBoy: deliveryBoy._id,
      deliveryDate: today,
    })
      .populate("customer")
      .populate("deliveryBoy");

    if (!todayOrder) {
      return res.status(404).json({
        success: false,
        message: `No order found for today (${today}). Please create an order first.`,
      });
    }

    if (!Array.isArray(bottleReturns) || bottleReturns.length === 0) {
      return res.status(400).json({
        success: false,
        message: "bottleReturns must be a non-empty array",
      });
    }

    const allowedSizes = lastDeliveredOrder.products.map((p) =>
      normalizeSize(p.productSize)
    );

    const standardBottleReturns = [];
    let totalOneLtrReturned = 0;
    let totalHalfLtrReturned = 0;

    for (const ret of bottleReturns) {
      const normSize = normalizeSize(ret.size);

      if (!allowedSizes.includes(normSize)) {
        continue;
      }

      if (typeof ret.quantity === "number" && ret.quantity > 0) {
        const { oneLtrBottles, halfLtrBottles } = convertToStandardBottles(
          normSize,
          ret.quantity
        );

        if (oneLtrBottles > 0) {
          totalOneLtrReturned += oneLtrBottles;
        }
        if (halfLtrBottles > 0) {
          totalHalfLtrReturned += halfLtrBottles;
        }
      }
    }

    if (totalOneLtrReturned > 0) {
      standardBottleReturns.push({
        size: "1ltr",
        quantity: totalOneLtrReturned,
        previousOrderId: lastDeliveredOrder._id, // ✅ Last delivered order _id
        previousDeliveryDate: lastDeliveredOrder.deliveryDate, // ✅ Last delivered order date
      });
    }
    if (totalHalfLtrReturned > 0) {
      standardBottleReturns.push({
        size: "1/2ltr",
        quantity: totalHalfLtrReturned,
        previousOrderId: lastDeliveredOrder._id, // ✅ Last delivered order _id
        previousDeliveryDate: lastDeliveredOrder.deliveryDate, // ✅ Last delivered order date
      });
    }

    if (standardBottleReturns.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid bottle returns to process",
        allowedSizes,
        lastDeliveryDate: lastDeliveredOrder.deliveryDate,
      });
    }

    todayOrder.bottleReturns = standardBottleReturns;

    await Promise.all([todayOrder.save(), lastDeliveredOrder.save()]);

    const cleanedBottleReturns = todayOrder.bottleReturns.map((ret) => ({
      size: ret.size,
      quantity: ret.quantity,
      previousOrderId: ret.previousOrderId,
      previousDeliveryDate: ret.previousDeliveryDate,
    }));

    return res.status(200).json({
      success: true,
      message: `Bottle return details added to today's order (${today})`,
      _id: todayOrder._id,
      orderNumber: todayOrder.orderNumber,
      deliveryDate: today,
      deliveryBoyName: lastDeliveredOrder.deliveryBoy?.name,
      customerName: lastDeliveredOrder.customer?.name,
      lastDeliveryDate: lastDeliveredOrder.deliveryDate,
      bottleReturns: cleanedBottleReturns,
    });
  } catch (error) {
    console.error("updateBottleReturns Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating bottle return details",
      error: error.message,
    });
  }
};

module.exports = {
  createAutomaticOrdersForCustomer,
  createAdditionalOrder,
  initializeOrders,
  updateOrderStatus,
  updateBottleReturns,
};
