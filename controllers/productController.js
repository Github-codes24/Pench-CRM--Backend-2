const Product = require("../models/productModel");
const ErrorHandler = require("../utils/errorhendler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

exports.createProduct = catchAsyncErrors(async (req, res, next) => {
  const { productName, description, size, price, stock } = req.body;

  if (!productName || !description || !size || !price) {
    return next(new ErrorHandler("All required fields must be filled", 400));
  }

  // 🔹 Generate productCode
  // productName ko uppercase aur spaces replace karo
  const prefix = productName.toUpperCase().replace(/\s+/g, "-");

  // us productName se related last product find karo
  const lastProduct = await Product.findOne({ productName }).sort({
    createdAt: -1,
  });

  let productNumber = 1;
  if (lastProduct && lastProduct.productCode) {
    const lastCode = lastProduct.productCode.split("-").pop(); // last number nikal lo
    if (!isNaN(lastCode)) {
      productNumber = parseInt(lastCode) + 1;
    }
  }

  const productCode = `${prefix}-${String(productNumber).padStart(3, "0")}`;

  // 🔹 Save product
  const product = await Product.create({
    productName,
    description,
    size,
    price: Number(price),
    stock: stock || 0,
    productCode,
  });

  res.status(201).json({
    success: true,
    message: "Product Added successfully",
    product,
  });
});

exports.getAllProducts = catchAsyncErrors(async (req, res) => {
  const {
    productName,
    size,
    minPrice,
    maxPrice,
    sortBy,
    sortOrder,
    page,
    limit,
  } = req.query;

  const pageNumber = Number(page) || 1;
  const pageSize = Number(limit) || 10;
  const skip = (pageNumber - 1) * pageSize;

  // Build filter for both queries
  const filter = {};
  if (productName) filter.productName = { $regex: productName, $options: "i" };
  if (size) filter.size = size;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  let sort = {};
  if (sortBy) {
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;
  } else {
    sort = { createdAt: -1 };
  }

  // Get individual products
  const products = await Product.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(pageSize);

  const total = await Product.countDocuments(filter);

  // Get grouped products (without pagination for grouping)
  const groupedProducts = await Product.aggregate([
  { $match: filter },
  {
    $addFields: {
      // Normalize product name: trim whitespace and convert to lowercase for grouping
      normalizedProductName: {
        $trim: { input: { $toLower: "$productName" } }
      }
    }
  },
  {
    $group: {
      _id: "$normalizedProductName", // Group by normalized name
      productName: { $first: "$productName" }, // Keep original name for display
      originalNames: { $addToSet: "$productName" }, // Track all original names
      description: { $first: "$description" },
      productType: { $first: "$productType" },
      sizes: {
        $push: {
          _id: "$_id",
          size: "$size",
          price: "$price",
          stock: "$stock",
          productCode: "$productCode"
        }
      },
      totalVariants: { $sum: 1 },
      minPrice: { $min: "$price" },
      maxPrice: { $max: "$price" },
      avgPrice: { $avg: "$price" },
      stockTotal: { $sum: "$stock" }
    }
  },
  {
    $project: {
      _id: 0,
      normalizedName: "$_id",
      productName: 1,
      originalNames: 1,
      description: 1,
      productType: 1,
      sizes: 1,
      totalVariants: 1,
      minPrice: 1,
      maxPrice: 1,
      avgPrice: 1,
      stockTotal: 1
    }
  },
  { $sort: { productName: 1 } }
]);
  res.status(200).json({
    success: true,
    count: products.length,
    totalPages: Math.ceil(total / pageSize),
    currentPage: pageNumber,
    individualProducts: products,
    groupedProducts: groupedProducts,
  });
});
exports.getProductById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) return next(new ErrorHandler("Product not found", 404));
  res.status(200).json({ success: true, product });
});

exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { productName, description, size, price, stock } = req.body;
  const product = await Product.findById(id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  Object.assign(product, {
    ...(productName && { productName }),
    ...(description && { description }),
    ...(size && { size }),
    ...(price !== undefined && { price: Number(price) }),
    ...(stock !== undefined && { stock: Number(stock) }),
  });

  await product.save();
  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    product,
  });
});

exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const product = await Product.findByIdAndDelete(id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
    deletedProduct: product,
  });
});
