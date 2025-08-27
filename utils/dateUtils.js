function isSameDay(date1, date2) {
  return date1.toDateString() === date2.toDateString();
}

const Product = require("../models/productModel");

function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function normalizeDate(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function isAbsentDay(customer, targetDate) {
  if (!customer.absentDays || !Array.isArray(customer.absentDays)) {
    return false;
  }

  return customer.absentDays.some((absentDate) =>
    isSameDay(normalizeDate(absentDate), normalizeDate(targetDate))
  );
}

function shouldDeliverOnDate(customer, product, targetDate) {
  console.log(product, customer, targetDate, "product");
  // Check if customer is absent on this day
  if (isAbsentDay(customer, targetDate)) {
    return false;
  }

  const startDate = normalizeDate(product.startDate);
  const endDate = normalizeDate(product.endDate);
  const normalizedTargetDate = normalizeDate(targetDate);

  // Check if within subscription period
  if (normalizedTargetDate < startDate || normalizedTargetDate > endDate) {
    return false;
  }
  console.log(normalizedTargetDate, "normalizedTargetDate");
  // Handle different subscription plans
  switch (product.subscriptionPlan) {
    case "Monthly":
      // Monthly subscription follows delivery days pattern
      return checkDeliveryPattern(product, normalizedTargetDate, startDate);

    case "Alternate Days":
    // Alternate days subscription delivers every 2nd day
    // return checkAlternateDays(startDate, normalizedTargetDate);

    case "Daily":
      // Daily subscription delivers every day
      return true;

    // case "Weekly":
    //   // Weekly subscription delivers on specific day of week
    //   return checkWeeklyDelivery(product, normalizedTargetDate, startDate);

    // case "Weekdays":
    //   // Weekdays subscription (Monday-Friday)
    //   return isWeekday(normalizedTargetDate);

    // case "Weekends":
    //   // Weekends subscription (Saturday-Sunday)
    //   return isWeekend(normalizedTargetDate);

    default:
      return false;
  }
}

function checkDeliveryPattern(product, targetDate, startDate) {
  switch (product.deliveryDays) {
    case "Daily":
      return true;

    case "Alternate Days":
      const daysDiff = Math.floor(
        (targetDate - startDate) / (1000 * 60 * 60 * 24)
      );
      return daysDiff % 2 === 0;

    case "Monday to Friday":
      return isWeekday(targetDate);

    case "Weekends":
      return isWeekend(targetDate);

    case "Custom":
      if (
        !product.customDeliveryDates ||
        product.customDeliveryDates.length === 0
      ) {
        return false;
      }
      return product.customDeliveryDates.some((customDate) => {
        try {
          const customDateObj = normalizeDate(customDate);
          return isSameDay(customDateObj, targetDate);
        } catch (error) {
          console.error("Error parsing custom delivery date:", error);
          return false;
        }
      });

    default:
      return false;
  }
}

function checkAlternateDays(startDate, targetDate) {
  const daysDiff = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));
  return daysDiff % 2 === 0;
}

function checkWeeklyDelivery(product, targetDate, startDate) {
  // If specific delivery day is set, use it
  if (product.deliveryDayOfWeek) {
    return targetDate.getDay() === product.deliveryDayOfWeek;
  }

  // Otherwise, deliver on the same day of week as start date
  return targetDate.getDay() === startDate.getDay();
}

// Helper functions
function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday to Friday
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Saturday or Sunday
}

function normalizeDate(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function isSameDay(date1, date2) {
  return date1.toDateString() === date2.toDateString();
}

function isAbsentDay(customer, targetDate) {
  if (!customer.absentDays || !Array.isArray(customer.absentDays)) {
    return false;
  }

  return customer.absentDays.some((absentDate) =>
    isSameDay(normalizeDate(absentDate), normalizeDate(targetDate))
  );
}

async function formatOrderResponse(
  customers,
  customOrders,
  targetDate,
  deliveryBoyId
) {
  console.log(customOrders, customers, targetDate, "product");
  const customerOrdersMap = new Map();
  const normalizedTargetDate = normalizeDate(targetDate);
  console.log(normalizedTargetDate, "normalizedTargetDate");

  // First, fetch all products to get size information
  const allProducts = await Product.find({}).select("_id productName size");

  // Create a map of product information
  const productInfoMap = new Map();
  const sizeBottleRequirements = new Map();

  allProducts.forEach((product) => {
    // Check if product is milk based on product name
    const isMilkProduct = isProductMilk(product.productName);

    productInfoMap.set(product._id.toString(), {
      productName: product.productName,
      size: product.size,
      isMilkProduct: isMilkProduct,
    });

    // Track all unique sizes that require bottles (for milk products)
    if (isMilkProduct && product.size) {
      if (!sizeBottleRequirements.has(product.size)) {
        sizeBottleRequirements.set(product.size, {
          size: product.size,
          count: 0,
          productNames: new Set(),
        });
      }
    }
  });

  // Process subscription orders
  for (const customer of customers) {
    if (!customer.products || !Array.isArray(customer.products)) {
      continue;
    }
    console.log(customer, "customer");
    const customerOrders = [];

    for (const product of customer.products) {
      if (!product || !product.product) {
        continue;
      }

      try {
        if (shouldDeliverOnDate(customer, product, normalizedTargetDate)) {
          console.log("working");
          const productId = product.product._id.toString();
          const productInfo = productInfoMap.get(productId);

          if (!productInfo) continue;

          const order = {
            orderType: "subscription",
            orderId: product._id,
            product: {
              _id: product.product._id,
              name: productInfo.productName || "Unknown Product",
              description: product.product.description || "",
              size: productInfo.size || "N/A",
              quantity: product.quantity || 0,
              price: product.price || 0,
              isMilkProduct: productInfo.isMilkProduct || false,
            },
            subscription: {
              plan: product.subscriptionPlan || "N/A",
              deliveryDays: product.deliveryDays || "N/A",
              startDate: product.startDate,
              endDate: product.endDate,
              customDeliveryDates: product.customDeliveryDates || [],
            },
            financials: {
              totalPrice: product.totalPrice || 0,
              amountPaid: product.amountPaidTillDate || 0,
              amountDue: product.amountDue || 0,
            },
            timestamps: {
              createdAt: product.createdAt,
              updatedAt: product.updatedAt,
            },
          };

          // Calculate bottle requirements for milk products
          if (productInfo.isMilkProduct && productInfo.size) {
            order.bottleRequirements = [
              {
                size: productInfo.size,
                count: product.quantity || 0,
                productName: productInfo.productName,
              },
            ];

            // Update overall size bottle requirements
            if (sizeBottleRequirements.has(productInfo.size)) {
              const sizeReq = sizeBottleRequirements.get(productInfo.size);
              sizeReq.count += product.quantity || 0;
              sizeReq.productNames.add(productInfo.productName);
            }
          }

          customerOrders.push(order);
        }
      } catch (error) {
        console.error("Error processing product:", error);
        continue;
      }
    }

    if (customerOrders.length > 0) {
      customerOrdersMap.set(customer._id.toString(), {
        customer: {
          _id: customer._id,
          name: customer.name || "N/A",
          phoneNumber: customer.phoneNumber || "N/A",
          address: customer.address || "N/A",
          userProfile: customer.userProfile || null,
          gender: customer.gender || "N/A",
        },
        orders: customerOrders,
      });
    }
  }

  // Process custom orders
  for (const customOrder of customOrders) {
    if (!customOrder.customer || !customOrder.product) {
      continue;
    }

    const customerId = customOrder.customer._id.toString();
    const productId = customOrder.product._id.toString();
    const productInfo = productInfoMap.get(productId);

    if (!productInfo) continue;

    const orderData = {
      orderType: "custom",
      orderId: customOrder._id,
      product: {
        _id: customOrder.product._id,
        name: productInfo.productName || "Unknown Product",
        description: customOrder.product.description || "",
        size: productInfo.size || "N/A",
        quantity: customOrder.quantity || 0,
        price: customOrder.product.price || 0,
        isMilkProduct: productInfo.isMilkProduct || false,
      },
      financials: {
        totalPrice: customOrder.totalPrice || 0,
        amountPaid: customOrder.amountPaid || 0,
        amountDue: customOrder.totalPrice - (customOrder.amountPaid || 0),
      },
      timestamps: {
        createdAt: customOrder.createdAt,
        updatedAt: customOrder.updatedAt,
      },
    };

    // Calculate bottle requirements for milk products
    if (productInfo.isMilkProduct && productInfo.size) {
      orderData.bottleRequirements = [
        {
          size: productInfo.size,
          count: customOrder.quantity || 0,
          productName: productInfo.productName,
        },
      ];

      // Update overall size bottle requirements
      if (sizeBottleRequirements.has(productInfo.size)) {
        const sizeReq = sizeBottleRequirements.get(productInfo.size);
        sizeReq.count += customOrder.quantity || 0;
        sizeReq.productNames.add(productInfo.productName);
      }
    }

    if (customerOrdersMap.has(customerId)) {
      customerOrdersMap.get(customerId).orders.push(orderData);
    } else {
      customerOrdersMap.set(customerId, {
        customer: {
          _id: customOrder.customer._id,
          name: customOrder.customer.name || "N/A",
          phoneNumber: customOrder.customer.phoneNumber || "N/A",
          address: customOrder.customer.address || "N/A",
          userProfile: customOrder.customer.userProfile || null,
          gender: customOrder.customer.gender || "N/A",
        },
        orders: [orderData],
      });
    }
  }

  // Convert map to array and add overall bottle summary
  const result = Array.from(customerOrdersMap.values());

  // Add overall bottle requirements summary
  const bottleSummary = Array.from(sizeBottleRequirements.values())
    .filter((sizeReq) => sizeReq.count > 0)
    .map((sizeReq) => ({
      size: sizeReq.size,
      totalBottles: sizeReq.count,
      products: Array.from(sizeReq.productNames),
    }));

  return {
    customers: result,
    bottleSummary: bottleSummary,
    totalBottlesRequired: bottleSummary.reduce(
      (total, item) => total + item.totalBottles,
      0
    ),
  };
}

// Helper function to check if product is milk based on product name
function isProductMilk(productName) {
  if (!productName) return false;

  const milkKeywords = [
    "milk",
    "doodh",
    "दूध",
    "dudh",
    "दुध",
    "milk",
    "milky",
    "dairy",
    "क्षीर",
    "ksheer",
  ];

  const productNameLower = productName.toLowerCase();

  return milkKeywords.some((keyword) =>
    productNameLower.includes(keyword.toLowerCase())
  );
}

// Helper function to calculate bottles required based on size
function calculateBottlesRequired(size, quantity) {
  // 1 bottle per unit for all milk sizes
  return quantity || 0;
}

const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};
module.exports = {
  isSameDay,
  isWeekday,
  isWeekend,
  normalizeDate,
  isAbsentDay,
  shouldDeliverOnDate,
  formatOrderResponse,
  formatDate,
};
