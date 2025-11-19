const Customer = require("../models/customerModel");
const CustomerOrders = require("../models/customerOrderModel");
const mongoose = require("mongoose");
const DeliveryBoy = require("../models/deliveryBoyModel");
const Product = require("../models/productModel");
const Notification = require("../models/notificationModel");
const {
  formatDateToDDMMYYYY,
  parseUniversalDate,
} = require("../utils/parsedDateAndDay");

// Helper function to calculate end date for alternate days subscription
const calculateAlternateDaysEndDate = (startDate) => {
  const start = new Date(startDate);
  const year = start.getFullYear();
  const month = start.getMonth();

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  const deliveryDates = [];

  for (let day = start.getDate(); day <= lastDayOfMonth; day += 2) {
    deliveryDates.push(day);
  }

  const lastDeliveryDate = deliveryDates[deliveryDates.length - 1];

  return lastDeliveryDate;
};

// ✅ Create Customer
const createCustomer = async (req, res) => {
  try {
    const {
      name,
      phoneNumber,
      address,
      deliveryBoyName,
      products,
      startDate,
      subscriptionPlan,
      subscriptionStatus,
      customDeliveryDates,
      paymentMethod,
      paymentStatus,
    } = req.body;

    if (
      !name ||
      !phoneNumber ||
      !address ||
      !deliveryBoyName ||
      !products ||
      !subscriptionPlan ||
      !subscriptionStatus
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // DeliveryBoy validate
    const deliveryBoy = await DeliveryBoy.findOne({ name: deliveryBoyName });

    const existingPhoneNumber = await Customer.findOne({
      phoneNumber: phoneNumber,
    });

    if (existingPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Customer already exist with this phone number",
      });
    }

    if (!deliveryBoy) {
      const allDeliveryBoys = await DeliveryBoy.find({}, "name");
      return res.status(400).json({
        success: false,
        message: "Invalid delivery boy name, please select from dropdown",
        availableDeliveryBoys: allDeliveryBoys.map((d) => d.name),
      });
    }

    // Payment Status validation
    const validPaymentStatus = ["Paid", "Partially Paid", "Unpaid"];

    if (paymentStatus && !validPaymentStatus.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status "${paymentStatus}". Please select from dropdown.`,
        availablePaymentStatus: validPaymentStatus,
      });
    }

    // Payment Method validation
    const validPaymentMethods = ["COD", "Online"];

    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method "${paymentMethod}". Please select from dropdown.`,
        availablePaymentMethod: validPaymentMethods,
      });
    }

    const validSubscriptionStatus = ["active", "inactive"];

    if (
      subscriptionStatus &&
      !validSubscriptionStatus.includes(subscriptionStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid subscription status "${subscriptionStatus}". Please select from dropdown.`,
        availableSubscriptionStatus: validSubscriptionStatus,
      });
    }

    // Validate Products
    const validatedProducts = [];

    for (let item of products) {
      const { productName, price, productSize, quantity, totalPrice } = item;

      if (!productName || !price || !productSize || !quantity || !totalPrice) {
        return res.status(400).json({
          success: false,
          message: "All product fields are required",
        });
      }

      // Product validate
      const productDoc = await Product.findOne({
        productName,
        size: productSize,
      });

      if (!productDoc) {
        const allProducts = await Product.find({}, "productName size");
        return res.status(400).json({
          success: false,
          message: `Invalid product name: ${productName}. Please select from dropdown.`,
          availableProducts: allProducts.map((p) => ({
            productName: p.productName,
            size: p.size,
          })),
        });
      }

      // productSize validate
      if (productDoc.size !== productSize) {
        return res.status(400).json({
          success: false,
          message: `Invalid size "${productSize}" for ${productName}. Please select from dropdown.`,
          availableSizes: [productDoc.size],
        });
      }

      validatedProducts.push({
        product: productDoc._id,
        productSize,
        price,
        quantity,
        totalPrice,
      });
    }

    const parsedCustomDates = Array.isArray(customDeliveryDates)
      ? customDeliveryDates
      : [];

    let finalStartDate, finalEndDate;

    if (subscriptionPlan === "Custom Date") {
      // For Custom Date: start = first custom date, end = last custom date
      if (parsedCustomDates.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Custom delivery dates are required for Custom Date subscription plan",
        });
      }
      finalStartDate = parsedCustomDates[0];
      finalEndDate = parsedCustomDates[parsedCustomDates.length - 1];
    } else {
      // For Monthly and Alternate Days: start = provided date or today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      finalStartDate = startDate || formatDateToDDMMYYYY(today);

      if (subscriptionPlan === "Alternate Days") {
        const parsedStartDate = parseUniversalDate(finalStartDate);
        const lastDeliveryDay = calculateAlternateDaysEndDate(parsedStartDate);

        // Create end date with the last delivery day
        const endDate = new Date(
          parsedStartDate.getFullYear(),
          parsedStartDate.getMonth(),
          lastDeliveryDay
        );
        finalEndDate = formatDateToDDMMYYYY(endDate);
      } else {
        // For Monthly: end = month end
        const parsedStartDate = parseUniversalDate(finalStartDate);
        const monthEndDate = new Date(
          parsedStartDate.getFullYear(),
          parsedStartDate.getMonth() + 1,
          0
        );
        finalEndDate = formatDateToDDMMYYYY(monthEndDate);
      }
    }

    // 🔹 Customer create
    const customer = new Customer({
      name,
      phoneNumber,
      address,
      subscriptionPlan,
      subscriptionStatus,
      customDeliveryDates: parsedCustomDates,
      startDate: finalStartDate,
      endDate: finalEndDate,
      products: validatedProducts,
      deliveryBoy: deliveryBoy._id,
      paymentMethod,
      paymentStatus,
    });

    await customer.save();

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message,
    });
  }
};

// ✅ Get all customers
const getAllCustomers = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      productName,
      productSize,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    let filter = { 
      customerStatus : "Active",
    };

    if (search) {
      const searchRegex = new RegExp(search, "i");
      if (!isNaN(search)) {
        filter.$or = [
          { name: searchRegex },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$phoneNumber" },
                regex: search,
                options: "i",
              },
            },
          },
        ];
      } else {
        filter.$or = [{ name: searchRegex }];
      }
    }

    const customers = await Customer.find(filter)
      .populate({
        path: "products.product",
        select: "productName",
      })
      .populate("deliveryBoy", "name")
      .sort({ createdAt: -1 });

    let filteredCustomers = customers;

    // Apply product name filter
    if (productName) {
      const productNameRegex = new RegExp(productName, "i");
      filteredCustomers = filteredCustomers.filter((customer) => {
        return customer.products.some((product) => {
          return (
            product.product &&
            product.product.productName &&
            productNameRegex.test(product.product.productName)
          );
        });
      });
    }

    // Apply product size filter
    if (productSize) {
      const productSizeRegex = new RegExp(`^${productSize}$`, "i");
      filteredCustomers = filteredCustomers.filter((customer) => {
        return customer.products.some((product) => {
          return (
            product.productSize && productSizeRegex.test(product.productSize)
          );
        });
      });
    }

    const totalCustomers = filteredCustomers.length;

    const paginatedCustomers = filteredCustomers.slice(
      (page - 1) * limit,
      page * limit
    );

    const formattedCustomers = paginatedCustomers.map((customer) => {
      return {
        _id: customer?._id,
        name: customer?.name,
        phoneNumber: customer?.phoneNumber,
        address: customer?.address,
        image: customer?.image,
        customerStatus: customer?.customerStatus,
        subscriptionPlan: customer?.subscriptionPlan,
        subscriptionStatus: customer?.subscriptionStatus,
        customDeliveryDates: customer?.customDeliveryDates,
        products: customer?.products.map((product) => ({
          _id: product?.product?._id,
          productName: product?.product?.productName,
          productSize: product?.productSize,
        })),
        deliveryBoy: customer?.deliveryBoy?.name,
        startDate: customer?.startDate,
        createdAt: customer?.createdAt,
        updatedAt: customer?.updatedAt,
      };
    });

    const totalPages = Math.ceil(totalCustomers / limit);
    const hasPrevious = page > 1;
    const hasNext = page < totalPages;

    return res.status(200).json({
      success: true,
      message: "All Customers fetched successfully",
      totalCustomers,
      totalPages,
      currentPage: page,
      previous: hasPrevious,
      next: hasNext,
      customers: formattedCustomers,
    });
  } catch (error) {
    console.error("getAllCustomers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching customers",
      error: error.message,
    });
  }
};

//✅ Get single customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    let { page = 1, limit = 10, from, to } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    // ---- Fetch customer ----
    const customer = await Customer.findById(id)
      .populate("products.product", "productName")
      .populate("deliveryBoy", "name");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const customerInfo = {
      _id: customer._id,
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      address: customer.address,
      subscriptionPlan: customer.subscriptionPlan,
      customDeliveryDates: customer?.customDeliveryDates,
      deliveryBoy: customer.deliveryBoy,
      products: customer?.products.map((product) => ({
        _id: product._id,
        productName: product.product.productName,
        productSize: product.productSize,
        price: product.price,
        quantity: product.quantity,
        totalPrice: product.totalPrice,
      })),
      paymentMethod: customer.paymentMethod,
      paymentStatus: customer.paymentStatus,
    };

    let orderFilter = { customer: id };

    if (from || to) {
      const fromDate = from ? parseUniversalDate(from) : null;
      const toDate = to ? parseUniversalDate(to) : null;

      if (fromDate && toDate) {
        orderFilter.deliveryDate = {
          $gte: formatDateToDDMMYYYY(fromDate),
          $lte: formatDateToDDMMYYYY(toDate),
        };
      } else if (fromDate) {
        orderFilter.deliveryDate = {
          $gte: formatDateToDDMMYYYY(fromDate),
        };
      } else if (toDate) {
        orderFilter.deliveryDate = {
          $lte: formatDateToDDMMYYYY(toDate),
        };
      }
    }

    const totalOrders = await CustomerOrders.countDocuments(orderFilter);

    const orders = await CustomerOrders.find(orderFilter)
      .select("orderNumber deliveryDate status products")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const formattedOrders = orders.map((order) => ({
      orderId: order._id,
      orderNumber: order.orderNumber,
      deliveryDate: order.deliveryDate,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      products: order.products.map((p) => ({
        productName: p.productName,
        productSize: p.productSize,
        quantity: p.quantity,
        price: p.price,
        totalPrice: p.totalPrice,
      })),
    }));

    const totalPages = Math.ceil(totalOrders / limit);
    const hasPrevious = page > 1;
    const hasNext = page < totalPages;

    return res.status(200).json({
      success: true,
      message: "Customer by Id fetched successfully",
      data: {
        customer: customerInfo,
        totalOrders,
        totalPages,
        currentPage: page,
        previous: hasPrevious,
        next: hasNext,
        orders: formattedOrders,
      },
    });
  } catch (error) {
    console.error("getCustomerById Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching customer",
      error: error.message,
    });
  }
};

// ✅ Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phoneNumber,
      address,
      subscriptionPlan,
      subscriptionStatus,
      customDeliveryDates,
    } = req?.body;

    const image = req?.file;

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (phoneNumber && phoneNumber !== customer.phoneNumber) {
      const existingCustomer = await Customer.findOne({
        phoneNumber: phoneNumber,
        _id: { $ne: id },
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "Phone number already in use by another customer",
        });
      }
    }

    if (
      subscriptionPlan &&
      !["Monthly", "Custom Date", "Alternate Days"].includes(subscriptionPlan)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid subscription plan. Must be Monthly, Custom Date, or Alternate Days",
      });
    }

    if (
      subscriptionStatus &&
      !["active", "inactive"].includes(subscriptionStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription status. Must be active or inactive",
      });
    }

    const customerUpdates = {};

    if (name) customerUpdates.name = name;
    if (phoneNumber) customerUpdates.phoneNumber = phoneNumber;
    if (address) customerUpdates.address = address;

    if (subscriptionPlan) {
      customerUpdates.subscriptionPlan = subscriptionPlan;

      if (
        subscriptionPlan === "Monthly" ||
        subscriptionPlan === "Alternate Days"
      ) {
        customerUpdates.customDeliveryDates = [];

        if (subscriptionPlan === "Alternate Days") {
          const startDate =
            customer.startDate || formatDateToDDMMYYYY(new Date());
          const parsedStartDate = parseUniversalDate(startDate);
          const lastDeliveryDay =
            calculateAlternateDaysEndDate(parsedStartDate);

          const endDate = new Date(
            parsedStartDate.getFullYear(),
            parsedStartDate.getMonth(),
            lastDeliveryDay
          );
          customerUpdates.endDate = formatDateToDDMMYYYY(endDate);
        } else if (subscriptionPlan === "Monthly") {
          const startDate =
            customer.startDate || formatDateToDDMMYYYY(new Date());
          const parsedStartDate = parseUniversalDate(startDate);
          const monthEndDate = new Date(
            parsedStartDate.getFullYear(),
            parsedStartDate.getMonth() + 1,
            0
          );
          customerUpdates.endDate = formatDateToDDMMYYYY(monthEndDate);
        }
      }
    }
    if (subscriptionStatus) {
      customerUpdates.subscriptionStatus = subscriptionStatus;
    }

    if (customDeliveryDates && Array.isArray(customDeliveryDates)) {
      if (subscriptionPlan === "Custom Date") {
        const existingDates = customer.customDeliveryDates || [];

        const formattedCustomDates = customDeliveryDates.map((dateStr) => {
          const parsedDate = parseUniversalDate(dateStr);
          return parsedDate ? formatDateToDDMMYYYY(parsedDate) : dateStr;
        });

        const mergedDates = [
          ...new Set([...existingDates, ...formattedCustomDates]),
        ];
        customerUpdates.endDate = mergedDates[mergedDates.length - 1];
        customerUpdates.customDeliveryDates = mergedDates;
      }
    }

    if (image) customerUpdates.image = image?.path;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      customerUpdates,
      { new: true, runValidators: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      updatedCustomer: updatedCustomer,
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({
      success: false,
      message: "Error updating customer",
      error: error.message,
    });
  }
};

// ✅Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const deletedCustomer = await Customer.findByIdAndDelete(id);

    if (!deletedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting customer",
      error: error.message,
    });
  }
};

// Make Absent Days
const makeAbsentDays = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: "Date is required in (DD-MM-YYYY) format",
      });
    }

    const customer = await Customer.findById(customerId)
      .populate("products.product")
      .populate("deliveryBoy", "name phoneNumber");

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    const normalizedDate = parseUniversalDate(date);

    if (!normalizedDate) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Please use DD-MM-YYYY format",
      });
    }

    const formattedInputDate = formatDateToDDMMYYYY(normalizedDate);

    const isAlreadyAbsent = customer.absentDays.includes(formattedInputDate);

    if (isAlreadyAbsent) {
      // Remove the date from absentDays to make customer present
      customer.absentDays = customer.absentDays.filter(
        (date) => date !== formattedInputDate
      );
      await customer.save();

      return res.json({
        success: true,
        message: "Customer marked present for this date",
        customer: {
          _id: customer._id,
          name: customer.name,
          phoneNumber: customer.phoneNumber,
          absentDays: customer.absentDays,
        },
      });
    }

    customer.absentDays.push(formattedInputDate);

    const deletedOrders = await CustomerOrders.deleteOne({
      customer: customerId,
      deliveryDate: date,
    });

    await customer.save();

    if (customer.deliveryBoy) {
      try {
        const existingNotification = await Notification.findOne({
          deliveryBoy: customer.deliveryBoy._id,
          customer: customer._id,
          type: "customer_absent",
          deliveryDate: formattedInputDate,
        });

        if (!existingNotification) {
          await Notification.createCustomerAbsentNotification(
            customer.deliveryBoy._id,
            customer._id,
            [formattedInputDate],
            customer.name
          );
        }
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError);
        return res.status(500).json({
          success: false,
          message: "Error while sending notification",
        });
      }
    }

    return res.json({
      success: true,
      message: "Customer marked absent successfully",
      customer: {
        _id: customer._id,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
        absentDays: customer.absentDays,
      },
    });
  } catch (err) {
    console.error("Error in makeAbsentDays:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

//✅ DropDown Api For deliveryDays
const getDeliveryDays = async (req, res) => {
  try {
    const deliveryDays = await Customer.schema.path("products.0.deliveryDays")
      .enumValues;
    return res.status(200).json({
      success: true,
      message: "Delivery days fetched successfully",
      deliveryDays,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching delivery days",
      error: error.message,
    });
  }
};

//✅ DropDown Api for subscriptionPlan
const getSubscriptionPlan = async (req, res) => {
  try {
    const subscriptionPlan = await Customer.schema.path("subscriptionPlan")
      .enumValues;
    return res.status(200).json({
      success: true,
      message: "Subscription plan fetched successfully",
      subscriptionPlan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching subscription plan",
      error: error.message,
    });
  }
};

//✅ DropDown Api for Payment Method
const getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = await Customer.schema.path("paymentMethod")
      .enumValues;
    res.status(200).json({
      success: true,
      message: "Payment Methods fetched successfully",
      paymentMethods,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment methods",
    });
  }
};

//✅ DropDown Api for Payment Status
const getPaymentStatus = async (req, res) => {
  try {
    const paymentStatus = await Customer.schema.path("paymentStatus")
      .enumValues;
    res.status(200).json({
      success: true,
      message: "Payment Status fetched successfully",
      paymentStatus,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment status",
    });
  }
};

//✅DropDown Api For Subscription Status
const getSubscriptionStatus = async (req, res) => {
  try {
    const subscriptionStatus = await Customer.schema.path("subscriptionStatus")
      .enumValues;
    res.status(200).json({
      success: true,
      message: "All Subscription Status fetched successfully",
      subscriptionStatus,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription status",
    });
  }
};

// ✅Add product To customer subscription
const addProductToCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { productName, price, productSize, quantity } = req.body;

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (!productName || !price || !productSize || !quantity) {
      return res.status(400).json({
        success: false,
        message:
          "productName, price, productSize, quantity, and totalPrice are required",
      });
    }

    const product = await Product.findOne({ productName, size: productSize });

    if (!product) {
      const allProducts = await Product.find({}, "productName size");
      return res.status(404).json({
        success: false,
        message: `Product "${productName}" not found. Please select from available products.`,
        availableProducts: allProducts.map((p) => ({
          productName: p.productName,
          size: p.size,
        })),
      });
    }

    const existingProduct = customer.products.find(
      (p) => p.product.toString() === product._id.toString()
    );

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product already exists in customer's subscription",
      });
    }

    if (!product.size.includes(productSize)) {
      return res.status(400).json({
        success: false,
        message: `Invalid product size "${productSize}" for "${productName}". Please select from available sizes.`,
        availableSizes: product.size,
      });
    }

    const totalPrice = quantity * price;

    const newProduct = {
      product: product._id,
      price: price,
      productSize: productSize,
      quantity: quantity,
      totalPrice: totalPrice,
    };

    customer.products.push(newProduct);

    await customer.save();

    const updatedCustomer = await Customer.findById(customerId);

    return res.status(200).json({
      success: true,
      message: "New Product added successfully to customer subscription",
      addedNewProduct: updatedCustomer,
    });
  } catch (error) {
    console.error("Error adding product to customer subscription:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding product to customer subscription",
      error: error.message,
    });
  }
};

// ✅ Remove product from customer subscription
const removeProductFromCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { productName } = req.body;

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const product = await Product.findOne({ productName });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const productIndex = customer.products.findIndex(
      (p) => p.product.toString() === product._id.toString()
    );

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not found for this customer subscription",
      });
    }

    customer.products.splice(productIndex, 1);

    await customer.save();

    const updatedCustomer = await Customer.findById(customerId);

    return res.status(200).json({
      success: true,
      message: "Product removed from customer subscription successfully",
      removedProduct: updatedCustomer,
    });
  } catch (error) {
    console.error("Error removing product from customer subscription:", error);
    return res.status(500).json({
      success: false,
      message: "Error removing product from customer subscription",
      error: error.message,
    });
  }
};

// ✅Update existing product of customer
const updateCustomerProduct = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { quantity, price, productName, productSize } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    let product = null;
    let productIndex = -1;

    if (productName) {
      product = await Product.findOne({ productName });

      if (!product) {
        const allProducts = await Product.find({}, "productName");
        return res.status(404).json({
          success: false,
          message: `Product "${productName}" not found. Please select from available products.`,
          availableProducts: allProducts.map((p) => p.productName),
        });
      }

      // Find the product in customer's products array
      productIndex = customer.products.findIndex(
        (p) => p.product.toString() === product._id.toString()
      );

      if (productIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Product not found in customer's products",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "productName is required to identify which product to update",
      });
    }

    if (productSize && !product.size.includes(productSize)) {
      return res.status(400).json({
        success: false,
        message: `Invalid product size "${productSize}" for "${productName}". Please select from available sizes.`,
        availableSizes: product.size,
      });
    }

    const currentProduct = customer.products[productIndex];

    if (quantity) currentProduct.quantity = quantity;
    if (price) currentProduct.price = price;
    if (productSize) currentProduct.productSize = productSize;
    if (product) currentProduct.product = product._id;

    // Recalculate totalPrice if quantity or price changed
    if (quantity || price) {
      const newQuantity = quantity || currentProduct.quantity;
      const newPrice = price || currentProduct.price;
      currentProduct.totalPrice = newQuantity * parseFloat(newPrice);
    }

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer product updated successfully",
      updatedProduct: customer,
    });
  } catch (error) {
    console.error("Error updating customer product:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating customer product",
      error: error.message,
    });
  }
};

// Get customer orders by month/year with delivery status
const getCustomerOrdersByMonth = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { month, year } = req.query;

    if (!customerId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "Customer ID, month, and year are required",
      });
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: "Month must be between 1 and 12",
      });
    }

    if (yearNum < 2025 || yearNum > 2050) {
      return res.status(400).json({
        success: false,
        message: "Year must be between 2025 and 2050",
      });
    }

    // Generate all dates in the month in DD/MM/YYYY format
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0);

    const generateDateRange = (start, end) => {
      const dates = [];
      const current = new Date(start);
      const endDate = new Date(end);

      while (current <= endDate) {
        dates.push(formatDateToDDMMYYYY(current));
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    const dateRange = generateDateRange(startDate, endDate);

    // Get all orders for the customer in the given month
    const orders = await CustomerOrders.find({
      customer: customerId,
      deliveryDate: { $in: dateRange },
    });

    // Create a map to group orders by date
    const ordersByDate = new Map();

    orders.forEach((order) => {
      const deliveryDate = order.deliveryDate;

      if (!ordersByDate.has(deliveryDate)) {
        ordersByDate.set(deliveryDate, order.status);
      }
    });

    // Convert absentDays to DD/MM/YYYY format for comparison
    const absentDaysFormatted = customer.absentDays.map((absentDate) => {
      return formatDateToDDMMYYYY(absentDate);
    });

    // Create result array with all dates in the month
    const result = dateRange.map((dateStr) => {
      if (ordersByDate.has(dateStr)) {
        // If order exists, return order status
        return {
          date: dateStr,
          status: ordersByDate.get(dateStr),
        };
      } else if (absentDaysFormatted.includes(dateStr)) {
        // If no order but date is in absent days, return Absent
        return {
          date: dateStr,
          status: "Absent",
        };
      } else {
        // If no order and not in absent days, return No Orders
        return {
          date: dateStr,
          status: "No Orders",
        };
      }
    });

    return res.status(200).json({
      success: true,
      message: `Orders for ${customer.name} in ${monthNum}/${yearNum}`,
      data: {
        month: monthNum,
        year: yearNum,
        orders: result,
      },
    });
  } catch (error) {
    console.error("getCustomerOrdersByMonth Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching customer orders by month",
      error: error.message,
    });
  }
};

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  makeAbsentDays,
  getDeliveryDays,
  getSubscriptionPlan,
  getPaymentMethods,
  getPaymentStatus,
  getSubscriptionStatus,
  addProductToCustomer,
  removeProductFromCustomer,
  updateCustomerProduct,
  getCustomerOrdersByMonth,
};
