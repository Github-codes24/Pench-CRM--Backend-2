const DeliveryBoy = require("../models/deliveryBoyModel");
const mongoose = require("mongoose");
const CustomerOrders = require("../models/customerOrderModel");
const { formatDateToDDMMYYYY } = require("../utils/parsedDateAndDay");
const Customer = require("../models/customerModel");
const Product = require("../models/productModel");
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE || "https://pench-delivery-boy-app.netlify.app/";
const moment = require("moment");
const { convertToBottlesInDiffSizes } = require("../utils/bottleHelper")

// ✅ Register Delivery Boy
const registerDeliveryBoy = async (req, res) => {
  try {
    const { name, email, phoneNumber, area, password, address } = req.body;
    const profileImage = req?.file;

    if (!name || !email || !phoneNumber || !area || !password || !address) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existing = await DeliveryBoy.findOne({ email });

    const existingPhoneNumber = await DeliveryBoy.findOne({ phoneNumber });

    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    if (existingPhoneNumber) {
      return res
        .status(400)
        .json({ success: false, message: "PhoneNumber already exists" });
    }

    const deliveryBoy = await DeliveryBoy.create({
      name,
      email,
      phoneNumber,
      area,
      password,
      profileImage,
      address,
    });

    return res.status(201).json({
      success: true,
      message: "Delivery boy registered successfully",
      deliveryBoy,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Login Delivery Boy
const loginDeliveryBoy = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    // Fetch password explicitly (since select:false is set for password)
    const deliveryBoy = await DeliveryBoy.findOne({ email }).select(
      "+password"
    );

    if (!deliveryBoy) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    // Compare entered password with hashed password
    const isMatch = await deliveryBoy.comparePassword(password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = await deliveryBoy.generateToken();

    return res.status(200).json({
      success: true,
      message: "Delivery boy logged in successfully",
      token,
      deliveryBoy: {
        _id: deliveryBoy._id,
        name: deliveryBoy.name,
        email: deliveryBoy.email,
        password: deliveryBoy.password,
        phoneNumber: deliveryBoy.phoneNumber,
        area: deliveryBoy.area,
        profileImage: deliveryBoy.profileImage,
        shareToken: deliveryBoy.shareToken,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get all delivery boys
const getAllDeliveryBoys = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      sortField = "",
      sortOrder = "desc",
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // Build filter object
    const filter = {};
    if (search) {
      if (!isNaN(search)) {
        // 🔹 search is numeric, match exact phone number
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { phoneNumber: Number(search) }, // ✅ exact match for number
          { area: { $regex: search, $options: "i" } },
        ];
      } else {
        // 🔹 search is string, apply regex only on text fields
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { area: { $regex: search, $options: "i" } },
        ];
      }
    }

    // Sorting
    let sort = {};
    if (sortField) {
      sort[sortField] = sortOrder === "asc" ? 1 : -1;
    } else {
      sort = { createdAt: -1 };
    }

    // Fetch data with pagination
    const [totalDeliveryBoys, deliveryBoys] = await Promise.all([
      DeliveryBoy.countDocuments(filter),
      DeliveryBoy.find(filter)
        .select("-encryptedPassword")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort(sort),
    ]);

    const totalPages = Math.ceil(totalDeliveryBoys / limit);
    const hasPrevious = page > 1;
    const hasNext = page < totalPages;

    res.status(200).json({
      success: true,
      totalDeliveryBoys,
      currentPage: page,
      totalPages,
      hasPrevious,
      hasNext,
      deliveryBoys,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get Delivery Boy By Id
const getDeliveryBoyById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery boy ID.",
      });
    }

    // Include encryptedPassword in query
    const deliveryBoy = await DeliveryBoy.findById(id).select(
      "+encryptedPassword"
    );

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    const customer = await Customer.find({ deliveryBoy: id })
      .populate("products.product", "productName") // only fetch productName
      .select("name phoneNumber startDate products");

    const assignedCustomers = customer.map((c) => {
      const productNames = c.products.map((p) => p.product?.productName || "");
      const productSizes = c.products.map((p) => p.productSize);

      return {
        _id: c._id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        startDate: c.startDate,
        productName: productNames.join(", "), // comma separated
        productSize: productSizes.join(", "), // comma separated
      };
    });
    let plainPassword = null;
    try {
      plainPassword = deliveryBoy.getPlainPassword();
    } catch (error) {
      console.error("Error getting plain password:", error);
    }

    const deliveryBoyCredentialShareableLink = `${FRONTEND_BASE_URL}?t=${deliveryBoy.shareToken}`;

    return res.status(200).json({
      success: true,
      message: "Delivery Boy By Id Fetch Successfully",
      data: {
        id: deliveryBoy._id,
        name: deliveryBoy.name,
        email: deliveryBoy.email,
        password: plainPassword, // ✅ Plaintext password
        phoneNumber: deliveryBoy.phoneNumber,
        area: deliveryBoy.area,
        address: deliveryBoy.address || "",
        profileImage: deliveryBoy.profileImage,
        isDeleted: deliveryBoy.isDeleted,
        createdAt: deliveryBoy.createdAt,
        updatedAt: deliveryBoy.updatedAt,
        credentialShareableLink: deliveryBoyCredentialShareableLink,
        assignedCustomers,
      },
    });
  } catch (error) {
    console.error("Error in getDeliveryBoyById:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Get Single Delivery Boy
const getDeliveryBoyProfile = async (req, res) => {
  try {
    const deliveryBoy = req.deliveryBoy._id;
    if (!deliveryBoy) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery boy not found" });
    }
    const deliveryBoyProfile = await DeliveryBoy.findById(deliveryBoy).select(
      "-password"
    );
    if (!deliveryBoyProfile) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery boy not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Delivery Boy Profile Fetch Successfully",
      deliveryBoyProfile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update Delivery Boy
const updateDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid delivery boy ID." });
    }

    const { name, email, phoneNumber, area, password, address } = req.body;
    const profileImage = req?.file?.path;

    // Email validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
      }
    }

    // Phone number validation
    if (phoneNumber) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phoneNumber.toString())) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid 10-digit phone number starting with 6-9",
        });
      }
    }

    // Fetch existing delivery boy
    const deliveryBoy = await DeliveryBoy.findById(id).select(
      "+encryptedPassword"
    );
    if (!deliveryBoy) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery boy not found" });
    }

    // Check for duplicate email (if email is being updated)
    if (email && email !== deliveryBoy.email) {
      const existingEmail = await DeliveryBoy.findOne({
        email,
        _id: { $ne: id },
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    // Check for duplicate phone number (if phone number is being updated)
    if (phoneNumber && phoneNumber !== deliveryBoy.phoneNumber) {
      const existingPhone = await DeliveryBoy.findOne({
        phoneNumber,
        _id: { $ne: id },
      });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone number already exists",
        });
      }
    }

    // Update fields if provided
    if (name) deliveryBoy.name = name;
    if (email) deliveryBoy.email = email;
    if (phoneNumber) deliveryBoy.phoneNumber = phoneNumber;
    if (area) deliveryBoy.area = area;
    if (address) deliveryBoy.address = address;
    if (profileImage) deliveryBoy.profileImage = profileImage;

    if (password) {
      deliveryBoy.password = password; // sirf plain assign karo
    }

    // Save with validation
    await deliveryBoy.save({ validateBeforeSave: true });

    return res.status(200).json({
      success: true,
      message: "Delivery Boy updated successfully",
      deliveryBoy,
    });
  } catch (error) {
    console.error("Error updating delivery boy:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

// ✅ Delete Delivery Boy
const deleteDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    const deliveryBoy = await DeliveryBoy.findByIdAndDelete(id);
    if (!deliveryBoy) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery boy not found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Delivery Boy Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//✅ Get Orders By Delivery Boy
const getOrdersByDeliveryBoy = async (req, res) => {
  try {
    const deliveryBoyId = req?.deliveryBoy?._id;

    let { page = 1, limit = 10, search = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    const today = new Date();
    const todayFormatted = formatDateToDDMMYYYY(today);

    const filter = {
      deliveryBoy: deliveryBoyId,
      deliveryDate: todayFormatted,
      status: "Pending",
    };

    const pipeline = [
      {
        $match: {
          deliveryBoy: deliveryBoyId,
          deliveryDate: todayFormatted,
          status: "Pending",
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: "$customer",
      },
    ];

    if (search) {
      if (!isNaN(search)) {
        pipeline.push({
          $addFields: {
            phoneNumberStr: { $toString: "$customer.phoneNumber" },
          },
        });
        pipeline.push({
          $match: {
            $or: [
              { orderNumber: { $regex: search, $options: "i" } },
              { phoneNumberStr: { $regex: search, $options: "i" } },
            ],
          },
        });
      } else {
        pipeline.push({
          $match: {
            $or: [
              { orderNumber: { $regex: search, $options: "i" } },
              { "customer.name": { $regex: search, $options: "i" } },
              { "customer.address": { $regex: search, $options: "i" } },
            ],
          },
        });
      }
    }

    pipeline.push({
      $project: {
        orderNumber: 1,
        deliveryBoy: 1,
        deliveryDate: 1,
        paymentMethod: 1,
        paymentStatus: 1,
        products: 1,
        totalAmount: 1,
        status: 1,
        bottlesReturned: 1,
        pendingBottleReturnQuantity: 1,
        bottleReturns: 1,
        createdAt: 1,
        updatedAt: 1,
        __v: 1,
        "customer._id": 1,
        "customer.name": 1,
        "customer.phoneNumber": 1,
        "customer.image": 1,
        "customer.address": 1,
      },
    });

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    // Get total count for pagination
    const countPipeline = pipeline.slice(0, -3);
    countPipeline.push({ $count: "total" });

    const [countResult, orders] = await Promise.all([
      CustomerOrders.aggregate(countPipeline),
      CustomerOrders.aggregate(pipeline),
    ]);

    const totalOrders = countResult[0]?.total || 0;

    const transformedOrders = orders.map((order) => ({
      ...order,
      products: order.products.map((product) => ({
        _id: product?._id,
        productImage: product?.productImage,
        productName: product?.productName,
        price: product?.price,
        productSize: product?.productSize,
        quantity: product?.quantity,
        totalPrice: product?.totalPrice,
      })),
    }));

    const totalPages = Math.ceil(totalOrders / limit);
    const hasPrevious = page > 1;
    const hasNext = page < totalPages;

    return res.status(200).json({
      success: true,
      message: `Found ${transformedOrders.length} orders for today (${todayFormatted})`,
      totalOrders,
      totalPages,
      currentPage: page,
      previous: hasPrevious,
      next: hasNext,
      orders: transformedOrders,
    });
  } catch (error) {
    console.error("getOrdersByDeliveryBoy Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching delivery boy orders",
      error: error.message,
    });
  }
};

//✅ Share Genearted  Token
const shareConsumeToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.staus(400).json({
        success: false,
        message: "Token is required",
      });
    }
    const sharedToken = await DeliveryBoy.findOne({ shareToken: token }).select(
      "_id name email password +encryptedPassword"
    );

    if (!sharedToken) {
      return res.status(404).json({
        success: false,
        message: "Share token not found",
      });
    }

    if (new Date() > new Date(sharedToken.shareTokenExpiresAt)) {
      return res
        .status(410)
        .json({ success: false, message: "Share token expired" });
    }

    let plainPassword = null;
    let hashedPassword = null;
    try {
      plainPassword = sharedToken.getPlainPassword();
      hashedPassword = sharedToken.password;
    } catch (err) {
      console.error("Decrypt error:", err);
    }

    sharedToken.shareTokenUsed = true;
    await sharedToken.save();

    return res.status(200).json({
      success: true,
      message: "Share token consumed successfully",
      shareToken: {
        _id: sharedToken._id,
        email: sharedToken.email,
        hashedPassword: hashedPassword,
        password: plainPassword,
        deliveryBoyName: sharedToken.name,
      },
    });
  } catch (error) {
    console.log("Error in shareConsumeToken:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to consume token",
      error: error.message,
    });
  }
};

// ✅ Get DeliveryBoy Own Bootle Tracking Record
// // 🔹 Helper: Convert size + quantity into 1ltr and 1/2ltr bottles
// function convertToBottles(size, quantity) {
//   const litersPerUnit = parseFloat(size.replace("ltr", ""));
//   const totalLiters = litersPerUnit * quantity;

//   const oneLtrBottles = Math.floor(totalLiters); // full liters
//   const halfLtrBottles = totalLiters % 1 === 0.5 ? 1 : 0; // half liter if remainder is .5

//   return { oneLtrBottles, halfLtrBottles };
// }


//✅ Order history
const getDeliveryBoyOwnBootleTrackingRecord = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoy?._id;

    if (!deliveryBoyId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);

    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: "Delivery boy not found" });
    }

    const today = formatDateToDDMMYYYY(new Date());
    console.log("🗓️ Today Date:", today);
    console.log("🚴 Delivery Boy:", deliveryBoy.name, "| ID:", deliveryBoyId);

    const assignedCustomers = await Customer.find({
      deliveryBoy: deliveryBoyId,
      subscriptionStatus: "active",
      customerStatus: "Active",
    }).select("_id");

    console.log("👥 Assigned Customers Count:", assignedCustomers.length);

    if (!assignedCustomers.length) {
      return res.status(404).json({
        success: false,
        message: "No customers assigned to this delivery boy",
      });
    }

    const customerIds = assignedCustomers.map((customer) => customer._id);

    const todayOrders = await CustomerOrders.find({
      deliveryBoy: deliveryBoyId,
      customer: { $in: customerIds },
      deliveryDate: today,
      status: { $in: ["Pending", "Delivered"] },
    });

    console.log(`\n📦 Today's Orders (Pending + Delivered): ${todayOrders.length}`);
    console.log(`   ⏳ Pending:   ${todayOrders.filter((o) => o.status === "Pending").length}`);
    console.log(`   ✅ Delivered: ${todayOrders.filter((o) => o.status === "Delivered").length}`);

    const todayOrdersWithReturns = await CustomerOrders.find({
      deliveryBoy: deliveryBoyId,
      customer: { $in: customerIds },
      deliveryDate: today,
      "bottleReturns.0": { $exists: true },
    });

    console.log(`\n🔄 Today's Orders With Bottle Returns: ${todayOrdersWithReturns.length}`);

    const lastDeliveredOrders = await CustomerOrders.find({
      deliveryBoy: deliveryBoyId,
      customer: { $in: customerIds },
      status: "Delivered",
    })
      .sort({ deliveryDate: -1, createdAt: -1 })
      .populate("customer", "name phoneNumber");

    console.log(`\n📋 Last Delivered Orders (all time): ${lastDeliveredOrders.length}`);

    const customerLastOrders = {};
    lastDeliveredOrders.forEach((order) => {
      const customerId = order.customer._id.toString();
      if (!customerLastOrders[customerId]) {
        customerLastOrders[customerId] = order;
      }
    });

    const allDeliveredOrders = Object.values(customerLastOrders);
    console.log(`📋 Unique Customers with Last Delivered Order: ${allDeliveredOrders.length}`);

    // ✅ Issue count
    let totalIssued = 0;
    let oneLtrIssued = 0;
    let halfLtrIssued = 0;

    console.log("\n🧮 Calculating ISSUED Bottles (Today's Pending + Delivered Orders):");
    for (const order of todayOrders) {
      console.log(`\n   🧾 Order: ${order.orderNumber} | Status: ${order.status}`);
      for (const p of order.products) {
        if (p.productName === "Milk") {
          if (p.productSize === "1ltr") {
            oneLtrIssued += p.quantity;
            totalIssued += p.quantity;
            console.log(`   🥛 Size: "1ltr" | Qty: ${p.quantity} → +${p.quantity} (1ltr)`);
          } else if (p.productSize === "1/2ltr") {
            halfLtrIssued += p.quantity;
            totalIssued += p.quantity;
            console.log(`   🥛 Size: "1/2ltr" | Qty: ${p.quantity} → +${p.quantity} (1/2ltr)`);
          } else {
            const { oneLtr, halfLtr } = convertToBottlesInDiffSizes(p.productSize);
            oneLtrIssued += oneLtr * p.quantity;
            halfLtrIssued += halfLtr * p.quantity;
            totalIssued += (oneLtr + halfLtr) * p.quantity;
            console.log(`   🥛 Size: "${p.productSize}" | Qty: ${p.quantity} → +${oneLtrBottles} (1ltr) +${halfLtrBottles} (1/2ltr)`);
          }
        } else {
          console.log(`   ⛔ Skipped "${p.productName}" — Not a Milk product`);
        }
      }
    }

    console.log(`\n📊 Issued Summary → 1ltr: ${oneLtrIssued} | 1/2ltr: ${halfLtrIssued} | Total: ${totalIssued}`);

    // ✅ Return count
    let totalReturned = 0;
    let oneLtrReturned = 0;
    let halfLtrReturned = 0;

    console.log("\n🔄 Calculating RETURNED Bottles (Today's Orders with bottleReturns):");
    for (const order of todayOrdersWithReturns) {
      console.log(`\n   🧾 Order: ${order.orderNumber} | Status: ${order.status}`);
      if (order.bottleReturns && order.bottleReturns.length > 0) {
        order.bottleReturns.forEach((ret) => {
          if (ret.size === "1ltr") {
            oneLtrReturned += ret.quantity;
            totalReturned += ret.quantity;
            console.log(`   ↩️ Return Size: "1ltr" | Qty: ${ret.quantity} → +${ret.quantity} (1ltr)`);
          } else if (ret.size === "1/2ltr") {
            halfLtrReturned += ret.quantity;
            totalReturned += ret.quantity;
            console.log(`   ↩️ Return Size: "1/2ltr" | Qty: ${ret.quantity} → +${ret.quantity} (1/2ltr)`);
          } else {
            const { oneLtr, halfLtr } = convertToBottlesInDiffSizes(ret.size);
            oneLtrReturned += oneLtr * ret.quantity;
            halfLtrReturned += halfLtr * ret.quantity;
            totalReturned += (oneLtr + halfLtr) * ret.quantity;
            console.log(`   ↩️ Return Size: "${ret.size}" | Qty: ${ret.quantity} → +${oneLtr} (1ltr) +${halfLtr} (1/2ltr)`);
          }
        });
      }
    }

    console.log(`\n📊 Returned Summary → 1ltr: ${oneLtrReturned} | 1/2ltr: ${halfLtrReturned} | Total: ${totalReturned}`);

    // ✅ Yet To Return count
    let totalDelivered = 0;
    let oneLtrDelivered = 0;
    let halfLtrDelivered = 0;

    console.log("\n📬 Calculating YET TO RETURN (Last Delivered Orders per Customer):");
    for (const order of allDeliveredOrders) {
      console.log(`\n   🧾 Order: ${order.orderNumber} | Customer: ${order.customer?.name}`);
      for (const p of order.products) {
        if (p.productName === "Milk") {
          if (p.productSize === "1ltr") {
            oneLtrDelivered += p.quantity;
            totalDelivered += p.quantity;
            console.log(`   🥛 Size: "1ltr" | Qty: ${p.quantity} → +${p.quantity} (1ltr)`);
          } else if (p.productSize === "1/2ltr") {
            halfLtrDelivered += p.quantity;
            totalDelivered += p.quantity;
            console.log(`   🥛 Size: "1/2ltr" | Qty: ${p.quantity} → +${p.quantity} (1/2ltr)`);
          } else {
            const { oneLtr, halfLtr } = convertToBottlesInDiffSizes(ret.size);
            oneLtrReturned += oneLtr * ret.quantity;
            halfLtrReturned += halfLtr * ret.quantity;
            totalReturned += (oneLtr + halfLtr) * ret.quantity;
            console.log(`   🥛 Size: "${p.productSize}" | Qty: ${p.quantity} → +${oneLtrBottles} (1ltr) +${halfLtrBottles} (1/2ltr)`);
          }
        } else {
          console.log(`   ⛔ Skipped "${p.productName}" — Not a Milk product`);
        }
      }
    }

    console.log(`\n📊 Delivered Summary → 1ltr: ${oneLtrDelivered} | 1/2ltr: ${halfLtrDelivered} | Total: ${totalDelivered}`);

    const totalYetToReturn = totalDelivered - totalReturned;
    const oneLtrYetToReturn = oneLtrDelivered - oneLtrReturned;
    const halfLtrYetToReturn = halfLtrDelivered - halfLtrReturned;

    console.log("\n📊 Final Summary:");
    console.log(`   🟡 Issued     → 1ltr: ${oneLtrIssued}   | 1/2ltr: ${halfLtrIssued}   | Total: ${totalIssued}`);
    console.log(`   🟢 Returned   → 1ltr: ${oneLtrReturned} | 1/2ltr: ${halfLtrReturned} | Total: ${totalReturned}`);
    console.log(`   🔴 YetToReturn→ 1ltr: ${oneLtrYetToReturn} | 1/2ltr: ${halfLtrYetToReturn} | Total: ${totalYetToReturn}`);

    const response = {
      _id: deliveryBoy._id,
      deliveryBoy: deliveryBoy.name,
      total: {
        issued: totalIssued,
        returned: totalReturned,
        yetToReturn: totalYetToReturn,
      },
      "1ltr": {
        issued: oneLtrIssued,
        returned: oneLtrReturned,
        yetToReturn: oneLtrYetToReturn,
      },
      "1/2ltr": {
        issued: halfLtrIssued,
        returned: halfLtrReturned,
        yetToReturn: halfLtrYetToReturn,
      },
      totalCustomers: assignedCustomers.length,
      todayOrdersCount: todayOrders.length,
    };

    return res.json({
      success: true,
      message: "Delivery boy own bottle tracking record fetched successfully",
      trackingRecord: response,
    });
  } catch (error) {
    console.error("❌ getDeliveryBoyOwnBootleTrackingRecord error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get delivery boy own bottle tracking record",
    });
  }
};

const getOrderHistory = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoy._id;
    let { status = "All", page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const todayDate = `${day}/${month}/${year}`;

    // ✅ Base filter
    let filter = {
      deliveryBoy: deliveryBoyId,
    };

    if (status === "All" || status === "Pending") {
      // ✅ In All and Pending Only today's order
      filter.deliveryDate = todayDate;
      if (status === "Pending") {
        filter.status = "Pending";
      }
    } else if (status === "Delivered") {
      // ✅ In Delivered All dates order
      filter.status = "Delivered";
    }

    const totalOrders = await CustomerOrders.countDocuments(filter);

    const orders = await CustomerOrders.find(filter)
      .populate({
        path: "customer",
        select: "name phoneNumber image address",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedOrders = orders.map((order) => ({
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      deliveryDate: order.deliveryDate,
      customer: {
        name: order.customer?.name,
        phoneNumber: order.customer?.phoneNumber,
        image: order.customer?.image,
        address: order.customer?.address,
      },
      products: order.products.map((p) => ({
        productName: p.productName,
        productSize: p.productSize,
        productImage: p.productImage,
      })),
    }));

    const totalPages = Math.ceil(totalOrders / limit);

    return res.status(200).json({
      success: true,
      message: "Order history fetched successfully",
      totalOrders,
      currentPage: page,
      totalPages,
      previous: page > 1,
      next: page < totalPages,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("getOrderHistory Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get order history",
      error: error.message,
    });
  }
};

// Logout Delivery Boy
const logoutDeliveryBoy = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({
      success: true,
      message: "Delivery Boy logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to logout delivery boy",
    });
  }
};

//✅ Get Pending Bottles
// const getPendingBottles = async (req, res) => {
//   try {
//     const deliveryBoyId = req.deliveryBoy?._id;
//     if (!deliveryBoyId) {
//       return res.status(400).json({
//         success: false,
//         message: "Delivery Boy ID is required",
//       });
//     }

//     // ✅ Today's date
//     const today = moment().format("DD/MM/YYYY");
//     console.log("🗓️ Today:", today);

//     // ✅ Get all delivered orders with pending bottles
//     const orders = await CustomerOrders.find({
//       deliveryBoy: deliveryBoyId,
//       // status: "Delivered",
//       deliveryDate: today,
//       $or: [
//         { pendingBottleReturnQuantity: { $gt: 0 } }, // still pending
//         { "bottleReturns.0": { $exists: true } }, // OR at least 1 return entry exists
//       ],
//     })
//       .populate("customer", "_id name phoneNumber address")
//       .populate("products._id", "productImage");

//       console.log("orders found", orders.length)

//     if (!orders.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No pending bottles found for any customer",
//       });
//     }

//     // ✅ Group data by customer
//     const customersMap = {};

//     orders.forEach((order) => {
//       const cust = order.customer;
//       if (!customersMap[cust._id]) {
//         customersMap[cust._id] = {
//           customerId: cust._id,
//           name: cust.name,
//           phoneNumber: cust.phoneNumber,
//           address: cust.address,
//           totalpendingBottleReturnQuantity: 0,
//           totalBottleReturnedQuantity: 0,
//           products: [],
//         };
//       }

//       // ✅ Collect milk products for this order
//       const milkProducts = order.products.filter(
//         (p) => p.productName.toLowerCase() === "milk"
//       );

//       if (milkProducts.length > 0) {
//         const productNames = milkProducts.map((p) => p.productName).join(", ");
//         const productSizes = milkProducts.map((p) => p.productSize).join(", ");
//         const productQuantities = milkProducts
//           .map((p) => p.quantity)
//           .join(", ");

//         // ✅ Total bottles returned for this order (from array)
//         const totalReturnedForOrder = (order.bottleReturns || []).reduce(
//           (sum, b) => sum + b.quantity,
//           0
//         );

//         customersMap[cust._id].products.push({
//           orderId: order._id,
//           orderNumber: order.orderNumber,
//           productName: productNames,
//           productSize: productSizes,
//           quantity: productQuantities,
//           productImage: milkProducts[0]._id?.productImage || "",
//           bottlePendingQuantity: order.pendingBottleReturnQuantity || 0,
//           bottleReturns: order.bottleReturns || [], // 👈 return full array
//           bottlesReturned: totalReturnedForOrder,
//         });

//         // ✅ Update customer totals
//         // ✅ Update customer totals (sum across all orders)
//         customersMap[cust._id].totalpendingBottleReturnQuantity +=
//           order.pendingBottleReturnQuantity || 0;
//         customersMap[cust._id].totalBottleReturnedQuantity +=
//           totalReturnedForOrder;
//       }
//     });

//     const customers = Object.values(customersMap);

//     return res.status(200).json({
//       success: true,
//       message: "Pending bottles data fetched successfully",
//       totalCustomers: customers.length,
//       customers,
//     });
//   } catch (error) {
//     console.error("getPendingBottles Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Error fetching pending bottles",
//       error: error.message,
//     });
//   }
// };

// ✅ Final fixed code of GetPending Bottels
const getPendingBottles = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoy?._id;
    if (!deliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "Delivery Boy ID is required",
      });
    }

    const today = moment().format("DD/MM/YYYY");
    const tomorrow = moment().add(1, "day").format("DD/MM/YYYY");

    console.log("📅 Today:", today);
    console.log("📅 Tomorrow:", tomorrow);
    console.log("🚴 DeliveryBoy ID:", deliveryBoyId);

    // Step 1: Fetch today's orders (Pending + Delivered)
    const todayOrders = await CustomerOrders.find({
      deliveryBoy: deliveryBoyId,
      deliveryDate: today,
      status: { $in: ["Pending", "Delivered"] },
    }).populate("customer", "_id name phoneNumber address area");

    const todayPendingCount = todayOrders.filter(o => o.status === "Pending").length;
    const todayDeliveredCount = todayOrders.filter(o => o.status === "Delivered").length;

    console.log(`📦 Today's Orders: ${todayOrders.length}`);
    console.log(`   ⏳ Pending:   ${todayPendingCount}`);
    console.log(`   ✅ Delivered: ${todayDeliveredCount}`);

    let ordersToShow = [];
    let displayDate = today;

    if (todayOrders.length === 0) {
      // Case 1: No orders today → show tomorrow's orders (advance view)
      console.log("📭 No today orders → showing tomorrow's orders");

      const tomorrowOrders = await CustomerOrders.find({
        deliveryBoy: deliveryBoyId,
        deliveryDate: tomorrow,
        status: "Pending",
      }).populate("customer", "_id name phoneNumber address area");

      ordersToShow = tomorrowOrders;
      displayDate = tomorrow;
      console.log(`📦 Tomorrow's Orders: ${tomorrowOrders.length}`);

    } else if (todayPendingCount > 0) {
      // Case 2: Today has some pending orders → show today's orders
      console.log("⏳ Today has pending orders → showing today's orders");
      ordersToShow = todayOrders;
      displayDate = today;

    } else if (todayPendingCount === 0 && todayDeliveredCount > 0) {
      // Case 3: All today's orders are delivered
      // → Check if tomorrow's orders are generated for all customers
      console.log("✅ All today's orders delivered → checking tomorrow's orders...");

      // Get list of customers who got delivery today
      const todayDeliveredCustomerIds = todayOrders.map(o => o.customer._id.toString());
      console.log(`👥 Today delivered customers: ${todayDeliveredCustomerIds.length}`);

      // Fetch tomorrow's generated orders
      const tomorrowOrders = await CustomerOrders.find({
        deliveryBoy: deliveryBoyId,
        deliveryDate: tomorrow,
        status: "Pending",
      }).populate("customer", "_id name phoneNumber address area");

      const tomorrowCustomerIds = tomorrowOrders.map(o => o.customer._id.toString());
      console.log(`📦 Tomorrow's Orders generated for: ${tomorrowCustomerIds.length} customers`);

      // Check if tomorrow's orders are generated for all today's delivered customers
      const allTomorrowOrdersGenerated = todayDeliveredCustomerIds.every(
        id => tomorrowCustomerIds.includes(id)
      );

      console.log(`🔍 All tomorrow orders generated: ${allTomorrowOrdersGenerated}`);

      if (allTomorrowOrdersGenerated && tomorrowOrders.length > 0) {
        // Tomorrow's orders are ready → switch to tomorrow's orders
        console.log("🚀 Tomorrow's orders ready → showing tomorrow's orders");
        ordersToShow = tomorrowOrders;
        displayDate = tomorrow;
      } else {
        // Tomorrow's orders not yet generated by initializeOrders
        // → Keep showing today's delivered orders until tomorrow's are ready
        console.log("⏳ Tomorrow's orders not yet generated → still showing today's orders");
        ordersToShow = todayOrders;
        displayDate = today;
      }
    }

    // Return empty array instead of 404 when no orders found
    if (!ordersToShow.length) {
      return res.status(200).json({
        success: true,
        message: `No orders found for ${displayDate}`,
        totalCustomers: 0,
        displayDate,
        customers: [],
      });
    }

    const customers = [];

    for (const order of ordersToShow) {
      const cust = order.customer;

      // Filter only milk products
      const milkProducts = order.products.filter(
        (p) => p.productName.toLowerCase() === "milk"
      );

      // Calculate bottle count based on product size
      let oneLtrBottles = 0;
      let halfLtrBottles = 0;

      for (const p of milkProducts) {
        console.log("🔍 convertToBottles result:", convertToBottles(p.productSize));
        const { oneLtr, halfLtr } = convertToBottlesInDiffSizes(p.productSize);
        console.log("oneLtr:", oneLtr, "| halfLtr:", halfLtr);
        oneLtrBottles += oneLtr * p.quantity;
        halfLtrBottles += halfLtr * p.quantity;
        console.log(`   🥛 "${p.productName}" | Size: "${p.productSize}" | Qty: ${p.quantity} → 1ltr: ${oneLtr * p.quantity} | 1/2ltr: ${halfLtr * p.quantity}`);
      }

      const totalBottles = oneLtrBottles + halfLtrBottles;

      // Calculate total bottles returned from bottleReturns array
      const bottlesReturned = (order.bottleReturns || []).reduce(
        (sum, b) => sum + b.quantity, 0
      );

      console.log(`\n👤 Customer: ${cust?.name} | Status: ${order.status} | 1ltr: ${oneLtrBottles} | 1/2ltr: ${halfLtrBottles} | Total: ${totalBottles}`);

      customers.push({
        customerId: cust?._id,
        name: cust?.name,
        phoneNumber: cust?.phoneNumber,
        address: cust?.address,
        area: cust?.area,
        orderId: order._id,
        orderNumber: order.orderNumber,
        deliveryDate: order.deliveryDate,
        orderStatus: order.status,
        bottles: {
          "1ltr": oneLtrBottles,
          "1/2ltr": halfLtrBottles,
          total: totalBottles,
        },
        bottleReturns: order.bottleReturns || [],
        bottlesReturned,
        pendingBottleReturnQuantity: order.pendingBottleReturnQuantity || 0,
      });
    }

    console.log(`\n📊 Final → displayDate: ${displayDate} | Total Customers: ${customers.length}`);

    return res.status(200).json({
      success: true,
      message: `Orders for ${displayDate}`,
      totalCustomers: customers.length,
      displayDate,
      customers,
    });

  } catch (error) {
    console.error("❌ getPendingBottles Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching pending bottles",
      error: error.message,
    });
  }
};




// ✅ Get All Bottle sizes
const getAllMilkBottleSizes = async (req, res) => {
  try {
    const sizes = await Product.find({ productName: "Milk" }, { size: 1 });
    return res.status(200).json({
      success: true,
      message: "All milk bottle sizes fetched successfully",
      sizes,
    });
  } catch (error) {
    console.error("❌ Error in getAllMilkBottleSizes:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get all milk bottle sizes",
      error: error.message,
    });
  }
};

module.exports = {
  registerDeliveryBoy,
  loginDeliveryBoy,
  getAllDeliveryBoys,
  getDeliveryBoyProfile,
  updateDeliveryBoy,
  deleteDeliveryBoy,
  getDeliveryBoyById,
  getOrdersByDeliveryBoy,
  shareConsumeToken,
  getDeliveryBoyOwnBootleTrackingRecord,
  getOrderHistory,
  getPendingBottles,
  logoutDeliveryBoy,
  getAllMilkBottleSizes,
};
