const Product = require("../models/productModel");
const {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} = require("date-fns");
const CustomerOrder = require("../models/customerOrderModel");
const moment = require("moment");

// ✅ Create Product
const createProduct = async (req, res) => {
  try {
    const { productName, description, size, price, stock } = req.body;
    const productImage = req?.file;

    if (!productName || !description || !size || !price) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (productName, description, size, price) are required",
      });
    }

    if (!productImage) {
      return res.status(400).json({
        success: false,
        message: "Product Image is required",
      });
    }

    // ✅ Normalize size
    let normalizeSize = size.replace(/\s+/g, "").toLowerCase();

    // ✅ General validation: must end with ltr, gm, or kg
    const sizePattern = /^\d+(\/\d+)?(ltr|gm|kg)$/;

    if (!sizePattern.test(normalizeSize)) {
      return res.status(400).json({
        success: false,
        message: "Invalid size format",
      });
    }

    // ✅ Check for duplicate product (same productName + same size)
    const duplicateProduct = await Product.findOne({
      productName,
      size: normalizeSize,
      isDeleted: false,
    });

    if (duplicateProduct) {
      return res.status(400).json({
        success: false,
        message: `Product with same name and size already exists`,
      });
    }

    // ✅ Generate Sequential Product Code (PC00001, PC00002, ...)
    const lastProduct = await Product.findOne().sort({ createdAt: -1 });

    let productNumber = 1;
    if (lastProduct && lastProduct.productCode) {
      const lastCode = lastProduct.productCode.replace("PC", "");
      if (!isNaN(lastCode)) {
        productNumber = parseInt(lastCode) + 1;
      }
    }

    const productCode = `PC${String(productNumber).padStart(5, "0")}`;

    // ✅ Save product
    const product = await Product.create({
      productName,
      description,
      size: normalizeSize,
      price: Number(price),
      stock: stock || 0,
      productCode,
      productImage: productImage?.path,
    });

    return res.status(201).json({
      success: true,
      message: "Product Added successfully",
      product,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed To Add Product",
      error: error.message,
    });
  }
};

// ✅ Get All Products
const getAllProducts = async (req, res) => {
  try {
    let { page = 1, limit = 10, sortOrder = "", search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // ---- Search Filter ----
    const filter = {};
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: "i" } },
        { size: { $regex: search, $options: "i" } },
      ];
    }

    // ---- Sorting ----
    let sort = {};
    if (sortOrder) {
      sort[sortOrder] = sortOrder === "asc" ? 1 : -1;
    } else {
      sort = { createdAt: -1 };
    }

    // ---- Count + Paginate ----
    const [totalProducts, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    // ---- Format Response ----
    const formattedProducts = products.map((p) => ({
      id: p._id,
      productName: p.productName,
      productImage: p.productImage,
      // description: p.description,
      // productType: p.productType,
      size: p.size,
      price: p.price,
      stockAvailable: p.stock,
      productCode: p.productCode,
      // isDeleted: p.isDeleted,
    }));

    const totalPages = Math.ceil(totalProducts / limit);
    const hasPrevious = page > 1;
    const hasNext = page < totalPages;

    return res.status(200).json({
      success: true,
      message: "All Products Fetched Successfully",
      totalProducts,
      totalPages,
      currentPage: page,
      previous: hasPrevious,
      next: hasNext,
      products: formattedProducts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed To Fetch Products",
      error: error.message,
    });
  }
};

// ✅ Get Product By Id
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const products = await Product.findById(id);
    if (!products) {
      return res.status(400).json({
        success: false,
        message: "Product Not Found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Product Found Successfully",
      products,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed To Fetch Product",
      error: error.message,
    });
  }
};

// ✅ Update Product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, description, size, price, stock } = req.body;
    const productImage = req?.file;

    // Build update object dynamically
    const updateData = {};
    if (productName) updateData.productName = productName;
    if (description) updateData.description = description;
    if (size) {
      const normalizeSize = size.replace(/\s+/g, "").toLowerCase();
      updateData.size = normalizeSize;

      // ✅ Check for duplicate product (same productName + same size )
      const duplicateProduct = await Product.findOne({
        _id: { $ne: id },
        productName: productName || undefined,
        size: normalizeSize,
      });

      if (duplicateProduct) {
        return res.status(400).json({
          success: false,
          message: `Product with same name and size already exists`,
        });
      }
    }
    if (price) updateData.price = price;
    if (stock) updateData.stock = stock;
    if (productImage) updateData.productImage = productImage.path;

    // ⚡ Single DB call, no validation re-run
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true, // return updated doc
      lean: true, // return plain JS object (faster)
    }).exec(); // ensure query executes immediately

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed To Update Product",
      error: error.message,
    });
  }
};

// ✅ Delete Product
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed To Delete Product",
    });
  }
};

// ✅ Total Products Sold
const totalProductsSold = async (req, res) => {
  try {
    const { period } = req.query;

    // Validate period parameter
    if (!["daily", "weekly", "monthly"].includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid period. Use: daily, weekly, or monthly",
      });
    }

    let startDate, endDate;
    const now = new Date();

    // Calculate date ranges for current period
    switch (period) {
      case "daily":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;

      case "weekly":
        startDate = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
        endDate = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
        break;

      case "monthly":
        startDate = startOfMonth(subMonths(new Date(), 1));
        endDate = endOfMonth(subMonths(new Date(), 1));
        break;
    }

    // Convert dates to DD/MM/YYYY format and generate all dates in range
    const formatDateToDDMMYYYY = (date) => {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Generate all dates in the range for proper filtering
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

    // Aggregate pipeline to get total units sold from CustomerOrders
    const pipeline = [
      {
        $match: {
          status: "Delivered",
          deliveryDate: { $in: dateRange },
        },
      },
      {
        $unwind: "$products",
      },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: "$products.quantity" },
        },
      },
    ];

    const result = await CustomerOrder.aggregate(pipeline);
    const totalUnits = result.length > 0 ? result[0].totalUnits : 0;

    return res.status(200).json({
      success: true,
      message: "Total products sold retrieved successfully",
      totalProductsSold: totalUnits,
      period: period,
    });
  } catch (error) {
    console.error("Error in totalProductsSold:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get total products sold",
      error: error.message,
    });
  }
};

// ✅ Total Low Stock Product Count
const getLowStockProductsCount = async (req, res) => {
  try {
    const lowStockCount = await Product.countDocuments({
      stock: { $lte: 20 },
      isDeleted: false,
    });

    return res.status(200).json({
      success: true,
      message: "Low stock count retrieved successfully",
      lowStockCount: lowStockCount,
    });
  } catch (error) {
    console.error("Error in getLowStockCount:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ✅ Get Low Stock Products List
const getLowStockProductsList = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {
      stock: { $lte: 20 }, // Low stock condition
      isDeleted: false,
    };

    // ---- Count + Paginate ----
    const [totalProducts, lowStockProducts] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .select("productName productImage size stock")
        .sort({ stock: 1 }) // lowest stock first
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    // ---- Format Response ----
    const formattedProducts = lowStockProducts.map((p) => ({
      id: p._id,
      productName: p.productName,
      productImage: p.productImage,
      size: p.size,
      stockAvailable: p.stock,
    }));

    const totalPages = Math.ceil(totalProducts / limit);
    const hasPrevious = page > 1;
    const hasNext = page < totalPages;

    return res.status(200).json({
      success: true,
      message: "Low stock products retrieved successfully",
      totalProducts,
      totalPages,
      currentPage: page,
      previous: hasPrevious,
      next: hasNext,
      products: formattedProducts,
    });
  } catch (error) {
    console.error("Error in getLowStockProducts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed To Get Low Stock Products",
      error: error.message,
    });
  }
};

// ✅ Add Stock
const addStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Product ID and quantity are required",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot add stock to deleted product",
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { stock: parseInt(quantity) } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Stock added successfully",
      data: {
        productId: updatedProduct._id,
        productName: updatedProduct.productName,
        stock: updatedProduct.stock,
      },
    });
  } catch (error) {
    console.error("Error in addStock:", error);
    return res.status(500).json({
      success: false,
      message: "Failed To Add Stock",
      error: error.message,
    });
  }
};

// ✅ Remove Stock
const removeStock = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove stock from deleted product",
      });
    }

    if (product.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock. No stock available to remove",
        data: {
          availableStock: product.stock,
        },
      });
    }

    // Decrease stock by 1
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { stock: -1 } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Stock Decreased successfully",
      data: {
        productId: updatedProduct._id,
        productName: updatedProduct.productName,
        stock: updatedProduct.stock,
      },
    });
  } catch (error) {
    console.error("Error in removeStock:", error);
    return res.status(500).json({
      success: false,
      message: "Failed To Remove Stock",
      error: error.message,
    });
  }
};

// ✅ Get Top Selling Product And Total Product Sold
const getTopSellingProductSold = async (req, res) => {
  try {
    const { period } = req.query;

    if (!["daily", "weekly", "monthly"].includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid period. Use: daily, weekly, or monthly",
      });
    }

    let startDate, endDate;

    switch (period) {
      case "daily":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;

      case "weekly":
        startDate = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
        endDate = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
        break;

      case "monthly":
        startDate = startOfMonth(subMonths(new Date(), 1));
        endDate = endOfMonth(subMonths(new Date(), 1));
        break;
    }

    // Convert dates to DD/MM/YYYY format and generate all dates in range
    const formatDateToDDMMYYYY = (date) => {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Generate all dates in the range for proper filtering
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

    // Aggregate pipeline to get top selling product and total sold
    const pipeline = [
      {
        $match: {
          status: "Delivered",
          deliveryDate: { $in: dateRange },
        },
      },
      {
        $unwind: "$products",
      },
      {
        $group: {
          _id: "$products.productName",
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
      {
        $group: {
          _id: null,
          totalProductsSold: { $sum: "$totalQuantity" },
          topSellingProduct: { $first: "$_id" },
          topSellingQuantity: { $first: "$totalQuantity" },
          allProducts: {
            $push: {
              productName: "$_id",
              quantity: "$totalQuantity",
            },
          },
        },
      },
    ];

    const result = await CustomerOrder.aggregate(pipeline);

    if (!result.length || result[0].totalProductsSold === 0) {
      return res.status(200).json({
        success: true,
        message: `No delivered orders found for ${period}`,
        data: {
          totalProductsSold: 0,
          topSellingProduct: "No products sold",
          period,
        },
      });
    }

    const salesData = result[0];

    return res.status(200).json({
      success: true,
      message: `Sales summary for ${period} period`,
      data: {
        totalProductsSold: salesData.totalProductsSold,
        topSellingProduct: salesData.topSellingProduct,
        period,
      },
    });
  } catch (error) {
    console.error("Error in getTopSellingProductSold:", error);
    return res.status(500).json({
      success: false,
      message: "Failed To Get Top Selling Product And Total Product Sold",
      error: error.message,
    });
  }
};

//✅ Get Total Product Deliver Tommorow
const getTotalProductDeliveryTommorow = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      productName,
      productSize,
      search = "",
      sortOrder = "desc",
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const tomorrow = moment().add(1, "day").format("DD/MM/YYYY");

    const matchConditions = {
      deliveryDate: tomorrow,
      status: "Pending",
    };

    const pipeline = [
      { $match: matchConditions },

      // Lookup customer
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },

      // Lookup deliveryBoy
      {
        $lookup: {
          from: "deliveryboys", // collection name in MongoDB
          localField: "deliveryBoy",
          foreignField: "_id",
          as: "deliveryBoy",
        },
      },
      { $unwind: "$deliveryBoy" },

      // Apply search filter AFTER lookups
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "customer.name": { $regex: search, $options: "i" } },
                  { "deliveryBoy.name": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      { $unwind: "$products" },

      // Apply product filters after unwinding products
      ...(productName || productSize
        ? [
            {
              $match: {
                ...(productName && {
                  "products.productName": {
                    $regex: productName,
                    $options: "i",
                  },
                }),
                ...(productSize && {
                  "products.productSize": {
                    $regex: `^${productSize}$`,
                    $options: "i",
                  },
                }),
              },
            },
          ]
        : []),

      {
        $group: {
          _id: "$customer._id",
          customerName: { $first: "$customer.name" },
          deliveryBoyName: { $first: "$deliveryBoy.name" }, // ✅ Added delivery boy name
          deliveryDate: { $first: "$deliveryDate" },
          productNames: { $push: "$products.productName" },
          productSizes: { $push: "$products.productSize" },
          quantities: { $push: "$products.quantity" },
        },
      },
      {
        $project: {
          _id: 0,
          customerId: "$_id",
          customerName: 1,
          deliveryBoyName: 1, // Include delivery boy name in response
          deliveryDate: 1,
          productName: {
            $reduce: {
              input: "$productNames",
              initialValue: "",
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  "$$this",
                  { $concat: ["$$value", ", ", "$$this"] },
                ],
              },
            },
          },
          productSize: {
            $reduce: {
              input: "$productSizes",
              initialValue: "",
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  "$$this",
                  { $concat: ["$$value", ", ", "$$this"] },
                ],
              },
            },
          },
          quantity: {
            $reduce: {
              input: "$quantities",
              initialValue: "",
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  { $toString: "$$this" },
                  { $concat: ["$$value", ", ", { $toString: "$$this" }] },
                ],
              },
            },
          },
        },
      },
      { $sort: { deliveryDate: sortOrder === "asc" ? 1 : -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const countPipeline = [
      { $match: { deliveryDate: tomorrow, status: "Pending" } },

      // Lookup customer
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },

      // Lookup deliveryBoy
      {
        $lookup: {
          from: "deliveryboys",
          localField: "deliveryBoy",
          foreignField: "_id",
          as: "deliveryBoy",
        },
      },
      { $unwind: "$deliveryBoy" },

      // Apply search filter AFTER lookups
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "customer.name": { $regex: search, $options: "i" } },
                  { "deliveryBoy.name": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      { $unwind: "$products" },

      // Apply product filters AFTER unwind
      ...(productName || productSize
        ? [
            {
              $match: {
                ...(productName && {
                  "products.productName": {
                    $regex: productName,
                    $options: "i",
                  },
                }),
                ...(productSize && {
                  "products.productSize": {
                    $regex: `^${productSize}$`,
                    $options: "i",
                  },
                }),
              },
            },
          ]
        : []),

      {
        $group: {
          _id: "$customer._id", // count unique customers
        },
      },
      { $count: "total" },
    ];

    const [result, countResult] = await Promise.all([
      CustomerOrder.aggregate(pipeline),
      CustomerOrder.aggregate(countPipeline),
    ]);

    const totalRecords = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalRecords / limit);
    const hasPrevious = page > 1;
    const hasNext = page < totalPages;

    return res.status(200).json({
      success: true,
      message: "Total products to deliver tomorrow fetched successfully",
      totalRecords,
      totalPages,
      currentPage: page,
      previous: hasPrevious,
      next: hasNext,
      customer: result,
    });
  } catch (error) {
    console.error("❌ Error in getTotalProductDeliverTommorow:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get total products to deliver tomorrow",
      error: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  totalProductsSold,
  getLowStockProductsCount,
  getLowStockProductsList,
  addStock,
  removeStock,
  getTopSellingProductSold,
  getTotalProductDeliveryTommorow,
};
