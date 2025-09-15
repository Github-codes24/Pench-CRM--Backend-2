const DeliveryBoy = require("../models/deliveryBoyModel");
const mongoose = require("mongoose");
const CustomerOrders = require("../models/customerOrderModel");
const { formatDateToDDMMYYYY } = require("../utils/parsedDateAndDay");


const FRONTEND_BASE = process.env.FRONTEND_BASE_URL || "https://pench-delivery-boy-app.netlify.app";
const tokenExpiry = parseInt(process.env.TOKEN_TTL_MIN) || 15; // token expiry in minutes



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
      message:"Delivery boy logged in successfully",
      token,
      deliveryBoy: {
        _id: deliveryBoy._id,
        name: deliveryBoy.name,
        email: deliveryBoy.email,
        password:deliveryBoy.password,
        phoneNumber: deliveryBoy.phoneNumber,
        area: deliveryBoy.area,
        profileImage: deliveryBoy.profileImage,
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
    const filter = { isDeleted: false };
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
        .select("-encryptedPassword -password")
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

    let plainPassword = null
    try {
      plainPassword = deliveryBoy.getPlainPassword();
    } catch (error) {
      console.error("Error getting plain password:", error);
    }


    const deliveryBoyCredentialShareableLink = `${FRONTEND_BASE}?t=${deliveryBoy.shareToken}`;
    

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

    // Fetch existing delivery boy
    const deliveryBoy = await DeliveryBoy.findById(id).select(
      "+encryptedPassword"
    );
    if (!deliveryBoy) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery boy not found" });
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
    const deliveryBoy = await DeliveryBoy.findByIdAndUpdate(id, {
      isDeleted: true,
    });
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

    let { page = 1, limit = 10 } = req.query;
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
    };

    const [totalOrders, orders] = await Promise.all([
      CustomerOrders.countDocuments(filter),
      CustomerOrders.find(filter)
        .populate("customer", "name phoneNumber address image")
        .populate("products._id", "productImage")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    const transformedOrders = orders.map((order) => ({
      ...order.toObject(),
      products: order.products.map((product) => ({
        _id: product?._id?._id,
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
const shareConsumeToken = async(req, res) =>{
  try {
    const {token} = req.query
    if(!token){
      return res.staus(400).json({
        success: false,
        message: "Token is required",
      })
    }
    const sharedToken = await DeliveryBoy.findOne({shareToken: token})
    .select("_id name email password +encryptedPassword")

    if(!sharedToken){
      return res.status(404).json({
        success: false,
        message: "Share token not found",
      })
    }

    if (new Date() > new Date(sharedToken.shareTokenExpiresAt)) {
      return res.status(410).json({ success: false, message: "Share token expired" });
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
        _id:sharedToken._id,
        email: sharedToken.email,
        hashedPassword: hashedPassword,
        password:plainPassword,
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
}

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
};
