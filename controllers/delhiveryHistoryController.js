const DeliveryHistory = require("../models/delhiveryHistory");
const Customer = require("../models/coustomerModel");
const DeliveryBoy = require("../models/delhiveryBoyModel");
const Payment = require("../models/paymentModel");
const mongoose = require("mongoose")
// ➡️ Create a new delivery history entry
exports.createDeliveryHistory = async (req, res) => {
  try {
    const {
      customer,
      deliveryBoy,
      product,
      quantityDelivered,
      totalPrice,
      status,
      remarks,
    } = req.body;

    if (!customer || !product || !totalPrice) {
      return res.status(400).json({
        success: false,
        message: "Customer, Product and TotalPrice are required",
      });
    }

    const delivery = await DeliveryHistory.create({
      customer,
      deliveryBoy,
      product,
      quantityDelivered,
      totalPrice,
      status,
      remarks,
    });

    res.status(201).json({ success: true, delivery });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ➡️ Get all delivery histories (with filters)
exports.getAllDeliveries = async (req, res) => {
  try {
    const { customer, deliveryBoy, status, startDate, endDate } = req.query;
    let filter = {};

    if (customer) filter.customer = customer;
    if (deliveryBoy) filter.deliveryBoy = deliveryBoy;
    if (status) filter.status = status;
    if (startDate && endDate) {
      let start = new Date(startDate);
      let end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // include the whole day
      filter.date = { $gte: start, $lte: end };
    }

    const deliveries = await DeliveryHistory.find(filter)
      .populate("customer", "name phoneNumber address")
      .populate("deliveryBoy", "name phoneNumber area")
      .populate("products.product", "productName price size stock");

    res
      .status(200)
      .json({ success: true, count: deliveries.length, deliveries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ➡️ Get deliveries by customer
exports.getDeliveriesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const {
      fromDate,
      toDate,
      status,
      page = 1,
      limit = 10,
      sortBy = "date",
      sortOrder = "desc"
    } = req.query;

    // Validate customer ID
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID format",
      });
    }

    // Build filter object
    const filter = { customer: customerId };

    // Date range filtering
    if (fromDate || toDate) {
      filter.date = {};

      if (fromDate) {
        const from = new Date(fromDate);
        if (isNaN(from.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate format. Use YYYY-MM-DD",
          });
        }
        from.setHours(0, 0, 0, 0);
        filter.date.$gte = from;
      }

      if (toDate) {
        const to = new Date(toDate);
        if (isNaN(to.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate format. Use YYYY-MM-DD",
          });
        }
        to.setHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    }

    // Status filtering
    if (status) {
      if (!["Delivered", "Missed", "Pending"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Use: Delivered, Missed, or Pending",
        });
      }
      filter.status = status;
    }

    // Pagination
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    // Sorting
    const sort = {};
    const validSortFields = ["date", "createdAt", "totalPrice", "status"];
    if (validSortFields.includes(sortBy)) {
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;
    } else {
      sort.date = -1; // Default sort by date descending
    }

    // Execute query with pagination
    const deliveries = await DeliveryHistory.find(filter)
      .populate("customer", "name phoneNumber address")
      .populate("deliveryBoy", "name phoneNumber area")
      .populate("products.product", "productName price size productType")
      .sort(sort)
      .skip(skip)
      .limit(pageSize);

    // Get total count for pagination
    const totalCount = await DeliveryHistory.countDocuments(filter);

    // Calculate summary statistics
    const summary = {
      totalDeliveries: totalCount,
      totalAmount: 0,
      totalAmountPaid: 0,
      deliveredCount: 0,
      missedCount: 0,
      pendingCount: 0,
      bottleSummary: {}
    };

    deliveries.forEach(delivery => {
      summary.totalAmount += delivery.totalPrice || 0;
      summary.totalAmountPaid += delivery.amountPaid || 0;

      if (delivery.status === "Delivered") summary.deliveredCount++;
      if (delivery.status === "Missed") summary.missedCount++;
      if (delivery.status === "Pending") summary.pendingCount++;

      // Bottle summary
      if (delivery.bottleIssued && Array.isArray(delivery.bottleIssued)) {
        delivery.bottleIssued.forEach(bottle => {
          if (!summary.bottleSummary[bottle.size]) {
            summary.bottleSummary[bottle.size] = { issued: 0, returned: 0 };
          }
          summary.bottleSummary[bottle.size].issued += bottle.count || 0;
        });
      }

      if (delivery.bottleReturn && Array.isArray(delivery.bottleReturn)) {
        delivery.bottleReturn.forEach(bottle => {
          if (!summary.bottleSummary[bottle.size]) {
            summary.bottleSummary[bottle.size] = { issued: 0, returned: 0 };
          }
          summary.bottleSummary[bottle.size].returned += bottle.count || 0;
        });
      }
    });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      totalCount,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNext: pageNumber < Math.ceil(totalCount / pageSize),
        hasPrev: pageNumber > 1,
        pageSize
      },
      filters: {
        fromDate,
        toDate,
        status,
        customerId
      },
      summary,
      deliveries
    });
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// ➡️ Get deliveries by delivery boy
exports.getDeliveriesByDeliveryBoy = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    const deliveries = await DeliveryHistory.find({
      deliveryBoy: deliveryBoyId,
    })
      .populate("customer", "name phoneNumber address")
      .populate("deliveryBoy", "name phoneNumber area")
      .populate("product", "name price size");

    res
      .status(200)
      .json({ success: true, count: deliveries.length, deliveries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ➡️ Update a delivery history record
exports.updateDeliveryHistory = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("id----------", id);

    const delivery = await DeliveryHistory.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("customer", "name phoneNumber")
      .populate("deliveryBoy", "name phoneNumber")

      .populate("product", "productName price size");

    // console.log("delivery----------", delivery);

    if (!delivery) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery record not found" });
    }

    res.status(200).json({ success: true, delivery });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ➡️ Delete a delivery history record
exports.deleteDeliveryHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const delivery = await DeliveryHistory.findByIdAndDelete(id);

    if (!delivery) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery record not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Delivery record deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const {
      customerId,
      deliveryBoyId,
      date,
      status,
      products,
      amountPaid,
      paymentMethod,
      bottleIssued,
      bottleReturn,
      remarks,
    } = req.body;

    // Validate required fields
    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Valid customer ID is required",
      });
    }

    if (!deliveryBoyId || !mongoose.Types.ObjectId.isValid(deliveryBoyId)) {
      return res.status(400).json({
        success: false,
        message: "Valid delivery boy ID is required",
      });
    }

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if delivery boy exists
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    // Set target date (default to today if not provided)
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if delivery history already exists for this date
    let deliveryHistory = await DeliveryHistory.findOne({
      customer: customerId,
      date: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    // If no existing record, create a new one
    if (!deliveryHistory) {
      // Calculate total price from products
      const totalPrice = products
        ? products.reduce((total, product) => {
          return total + (product.totalPrice || 0);
        }, 0)
        : 0;

      deliveryHistory = await DeliveryHistory.create({
        customer: customerId,
        deliveryBoy: deliveryBoyId,
        date: targetDate,
        products: products || [],
        totalPrice: totalPrice,
        status: status || "Pending",
        amountPaid: amountPaid || 0,
        paymentMethod: paymentMethod,
        bottleIssued: bottleIssued || [],
        bottleReturn: bottleReturn || [],
        remarks: remarks,
      });
    } else {
      // Update existing record
      const updateData = {};

      if (status && ["Delivered", "Missed", "Pending"].includes(status)) {
        updateData.status = status;
      }

      if (products && Array.isArray(products)) {
        updateData.products = products;
      }

      if (amountPaid !== undefined) {
        updateData.amountPaid = amountPaid;
      }

      if (paymentMethod && ["cash", "upi", "card"].includes(paymentMethod)) {
        updateData.paymentMethod = paymentMethod;
      }

      if (bottleIssued && Array.isArray(bottleIssued)) {
        updateData.bottleIssued = bottleIssued;
      }

      if (bottleReturn && Array.isArray(bottleReturn)) {
        updateData.bottleReturn = bottleReturn;
      }

      if (remarks !== undefined) {
        updateData.remarks = remarks;
      }

      deliveryHistory = await DeliveryHistory.findByIdAndUpdate(
        deliveryHistory._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
    }

    // Create payment record if amount is paid
    let payment = null;
    if (amountPaid && amountPaid > 0) {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)}`;

      // Get product IDs from delivery history
      const productIds = deliveryHistory.products.map((p) => p.product);

      // Calculate payment status
      let paymentStatus = "Partially Paid";
      if (amountPaid >= deliveryHistory.totalPrice) {
        paymentStatus = "Paid";
      }

      // Create payment record
      payment = await Payment.create({
        invoiceNumber: invoiceNumber,
        customer: customerId,
        totalAmount: deliveryHistory.totalPrice,
        paidAmount: amountPaid,
        productId: productIds,
        paidDate: new Date(),
        note: remarks || `Payment for delivery on ${targetDate.toDateString()}`,
        paymentMethod: paymentMethod || "Cash",
        status: paymentStatus,
      });

      // Update customer's payment records
      customer.amountPaidTillDate =
        (customer.amountPaidTillDate || 0) + amountPaid;
      customer.amountDue = Math.max(0, (customer.amountDue || 0) - amountPaid);
      await customer.save();
    }

    // Populate the delivery history for response
    const populatedHistory = await DeliveryHistory.findById(deliveryHistory._id)
      .populate("customer", "name phoneNumber address")
      .populate("deliveryBoy", "name phoneNumber")
      .populate("products.product", "productName price size");

    res.status(200).json({
      success: true,
      message: "Delivery status updated successfully",
      data: {
        deliveryHistory: populatedHistory,
        payment: payment,
      },
    });
  } catch (error) {
    console.error("Error updating delivery status:", error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getTodayOrdersSummary = async (req, res) => {
  try {
    const { date } = req.query;

    // Set target date
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

    // Find all customers with products
    const customers = await Customer.find()
      .populate({
        path: "products.product",
        select: "productName  size price",
      })
      .populate("deliveryBoy", "name phoneNumber")
      .populate("absentDays");

    // Find all custom orders for the target date
    const customOrders = await CustomerCustomOrder.find({
      date: {
        $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
        $lt: new Date(targetDate.setHours(23, 59, 59, 999)),
      },
    })
      .populate("customer", "name phoneNumber address")
      .populate("product", "productName  size price")
      .populate("deliveryBoy", "name phoneNumber");

    // Process orders
    const productSummary = {};
    const deliveryBoySummary = {};
    const milkSummary = {
      totalMilkQuantity: 0,
      totalMilkBottles: 0,
      milkProducts: [],
      milkSizes: {},
    };
    const nonMilkSummary = {
      totalNonMilkQuantity: 0,
      nonMilkProducts: [],
    };

    // Function to check if product is milk
    const isMilkProduct = (productName, size) => {
      const milkTypes = ["milk", "doodh", "दूध", "Milk", "MILK"];
      const liquidSizes = ["1/4ltr", "1/2ltr", "1ltr"];

      const isMilkType = milkTypes.includes(productType.toLowerCase());
      const isLiquidSize = liquidSizes.includes(size);

      return isMilkType && isLiquidSize;
    };

    // Function to calculate bottles required for milk
    const calculateBottlesRequired = (size, quantity) => {
      const sizeToBottles = {
        "1/4ltr": quantity, // 1 bottle per 250ml
        "1/2ltr": quantity, // 1 bottle per 500ml
        "1ltr": quantity, // 1 bottle per 1 liter
      };
      return sizeToBottles[size] || 0;
    };

    // Process subscription orders
    for (const customer of customers) {
      if (isAbsentDay(customer, targetDate)) continue;
      if (!customer.products || !Array.isArray(customer.products)) continue;

      for (const product of customer.products) {
        if (!product || !product.product) continue;

        try {
          if (shouldDeliverOnDate(customer, product, targetDate)) {
            const productData = product.product;
            const productId = productData._id.toString();
            const productName = productData.productName || "Unknown Product";
            const productType = productData.productType || "Other";
            const size = productData.size || "Standard";
            const quantity = product.quantity || 0;
            const price = productData.price || 0;

            const isMilk = isMilkProduct(productName, size);
            const bottlesRequired = isMilk
              ? calculateBottlesRequired(size, quantity)
              : 0;

            // Initialize product entry
            if (!productSummary[productId]) {
              productSummary[productId] = {
                productId: productId,
                productName: productName,
                productType: productType,
                size: size,
                isMilk: isMilk,
                totalQuantity: 0,
                totalBottles: bottlesRequired,
                totalPrice: 0,
                customers: [],
                deliveryBoys: new Set(),
              };
            }

            // Update product summary
            productSummary[productId].totalQuantity += quantity;
            productSummary[productId].totalBottles += bottlesRequired;
            productSummary[productId].totalPrice += quantity * price;

            // Add customer info
            productSummary[productId].customers.push({
              customerId: customer._id,
              customerName: customer.name,
              quantity: quantity,
              deliveryBoy: customer.deliveryBoy
                ? {
                  _id: customer.deliveryBoy._id,
                  name: customer.deliveryBoy.name,
                }
                : null,
            });

            // Track delivery boys
            if (customer.deliveryBoy) {
              productSummary[productId].deliveryBoys.add(
                customer.deliveryBoy._id.toString()
              );
            }

            // Update milk/non-milk summary
            if (isMilk) {
              milkSummary.totalMilkQuantity += quantity;
              milkSummary.totalMilkBottles += bottlesRequired;

              // Track milk sizes
              if (!milkSummary.milkSizes[size]) {
                milkSummary.milkSizes[size] = {
                  size: size,
                  quantity: 0,
                  bottles: 0,
                };
              }
              milkSummary.milkSizes[size].quantity += quantity;
              milkSummary.milkSizes[size].bottles += bottlesRequired;
            } else {
              nonMilkSummary.totalNonMilkQuantity += quantity;
            }

            // Update delivery boy summary
            if (customer.deliveryBoy) {
              const deliveryBoyId = customer.deliveryBoy._id.toString();
              if (!deliveryBoySummary[deliveryBoyId]) {
                deliveryBoySummary[deliveryBoyId] = {
                  deliveryBoyId: deliveryBoyId,
                  deliveryBoyName: customer.deliveryBoy.name,
                  totalOrders: 0,
                  totalQuantity: 0,
                  milkQuantity: 0,
                  nonMilkQuantity: 0,
                  totalBottles: 0,
                  products: {},
                };
              }

              deliveryBoySummary[deliveryBoyId].totalOrders += 1;
              deliveryBoySummary[deliveryBoyId].totalQuantity += quantity;
              deliveryBoySummary[deliveryBoyId].totalBottles += bottlesRequired;

              if (isMilk) {
                deliveryBoySummary[deliveryBoyId].milkQuantity += quantity;
              } else {
                deliveryBoySummary[deliveryBoyId].nonMilkQuantity += quantity;
              }

              if (!deliveryBoySummary[deliveryBoyId].products[productId]) {
                deliveryBoySummary[deliveryBoyId].products[productId] = {
                  productName: productName,
                  productType: productType,
                  size: size,
                  isMilk: isMilk,
                  quantity: 0,
                  bottles: bottlesRequired,
                };
              }
              deliveryBoySummary[deliveryBoyId].products[productId].quantity +=
                quantity;
              deliveryBoySummary[deliveryBoyId].products[productId].bottles +=
                bottlesRequired;
            }
          }
        } catch (error) {
          console.error("Error processing product:", error);
          continue;
        }
      }
    }

    // Process custom orders (similar logic as above)
    for (const customOrder of customOrders) {
      if (!customOrder.product) continue;

      const productData = customOrder.product;
      const productId = productData._id.toString();
      const productName = productData.productName || "Unknown Product";
      const productType = productData.productType || "Other";
      const size = productData.size || "Standard";
      const quantity = customOrder.quantity || 0;
      const price = productData.price || 0;

      const isMilk = isMilkProduct(productName, size);
      const bottlesRequired = isMilk
        ? calculateBottlesRequired(size, quantity)
        : 0;

      // ... (same processing logic as subscription orders)
    }

    // Convert to arrays and prepare response
    const productSummaryArray = Object.values(productSummary).map(
      (product) => ({
        ...product,
        deliveryBoysCount: product.deliveryBoys.size,
        customersCount: product.customers.length,
      })
    );

    const deliveryBoySummaryArray = Object.values(deliveryBoySummary).map(
      (deliveryBoy) => ({
        ...deliveryBoy,
        products: Object.values(deliveryBoy.products),
      })
    );

    milkSummary.milkSizes = Object.values(milkSummary.milkSizes);

    // Calculate totals
    const totalOrders = productSummaryArray.reduce(
      (sum, product) => sum + product.customersCount,
      0
    );
    const totalQuantity = productSummaryArray.reduce(
      (sum, product) => sum + product.totalQuantity,
      0
    );

    res.status(200).json({
      success: true,
      message: `Orders summary for ${targetDate.toDateString()}`,
      data: {
        date: targetDate,
        summary: {
          totalOrders: totalOrders,
          totalQuantity: totalQuantity,
          totalMilk: milkSummary.totalMilkQuantity,
          totalNonMilk: nonMilkSummary.totalNonMilkQuantity,
          totalBottles: milkSummary.totalMilkBottles,
          totalProducts: productSummaryArray.length,
          totalDeliveryBoys: deliveryBoySummaryArray.length,
        },
        milkSummary: milkSummary,
        nonMilkSummary: nonMilkSummary,
        products: productSummaryArray,
        deliveryBoys: deliveryBoySummaryArray,
      },
    });
  } catch (error) {
    console.error("Error fetching today orders summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
