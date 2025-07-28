// controller/productController.js
const Product = require("../models/productModel"); // adjust path if needed
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");
const Invoice = require("../models/invoiceModel"); // Import Invoice model
const DeliveryBoy = require("../models/deliveryBoyModel"); // Import DeliveryBoy model
exports.createProduct = catchAsyncErrors(async (req, res, next) => {
    const {description, productType,stock, quantity, price } = req.body;

    if (!description || !quantity || !price ) {
        return next(new ErrorHandler("All fields are required", 400));
    }

    const productData = {
        description,
        quantity,
        stock,
        productType,
        price: Number(price),
        user: req.user ? req.user._id : null,
        image: [],
    };

    // ✅ Handle single or multiple uploads
    if (req.file) {
        productData.image.push(req.file.path);
    } else if (req.files && req.files.length > 0) {
        productData.image = req.files.map(file => file.path);
    }

    const product = await Product.create(productData);

    res.status(201).json({
        success: true,
        message: "Product created successfully",
        product,
    });
});


// Update Product
exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;
    const { name, description,productType, quantity, size, price, stock } = req.body;

    const product = await Product.findById(id);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    // Update fields only if provided
    if (name) product.name = name;
    if (description) product.description = description;
    if( productType) product.productType = productType;
    if (size) product.size = size;
    if (quantity) product.quantity = quantity;
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);

    // Handle updated image (optional)
    if (req.file) {
        product.image = [req.file.path];
    }

    await product.save();

    res.status(200).json({
        success: true,
        message: "Product updated successfully",
        product,
    });
});

// Add Product Quantity
exports.addProductQuantity = catchAsyncErrors(async (req, res, next) => {
    const { productId } = req.params;
    let { quantity } = req.body;

    quantity = Number(quantity);

    if (!quantity || quantity <= 0) {
        return next(new ErrorHandler("Please provide a valid quantity to add", 400));
    }

    const product = await Product.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    product.stock += quantity;
    await product.save();

    res.status(200).json({
        success: true,
        message: `${quantity} units added successfully by user ${req.user._id}`,
        updatedStock: product.stock,
    });
});

// Remove Product Quantity
exports.removeProductQuantity = catchAsyncErrors(async (req, res, next) => {
    const { productId } = req.params;
    let { quantity } = req.body;

    quantity = Number(quantity);

    if (!quantity || quantity <= 0) {
        return next(new ErrorHandler("Please provide a valid quantity to remove", 400));
    }

    const product = await Product.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    if (product.stock < quantity) {
        return next(new ErrorHandler("Not enough stock to remove", 400));
    }

    product.stock -= quantity;
    await product.save();

    res.status(200).json({
        success: true,
        message: `${quantity} units removed successfully by user ${req.user._id}`,
        updatedStock: product.stock,
    });
});

exports.getAllProducts = catchAsyncErrors(async (req, res, next) => {
    const products = await Product.find(); // or add filters/sorting
    res.status(200).json({
        success: true,
        count: products.length,
        products,
    });
});

exports.getProductById = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;

    const product = await Product.findById(id).populate("user", "name email");

    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    res.status(200).json({
        success: true,
        product,
    });
});

exports.getSellerProducts = catchAsyncErrors(async (req, res, next) => {
    const products = await Product.find({ user: req.user._id });

    res.status(200).json({
        success: true,
        count: products.length,
        products,
    });
});

exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

        res.status(200).json({
        success: true,
        message: "Product deleted successfully",
    });
});


// GET Product Dashboard Stats
exports.getProductDashboardStats = catchAsyncErrors(async (req, res, next) => {
  // Fetch all products
  const products = await Product.find();

  // Initialize counters
  let totalStock = 0;
  let lowStockCount = 0;
  let activeProducts = 0;
  let soldMap = {};

  // Aggregate product sales from invoices
  const invoices = await Invoice.find();

  for (const invoice of invoices) {
    const key = invoice.productType;
    const quantity = Number(invoice.productQuantity) || 0;
    soldMap[key] = (soldMap[key] || 0) + quantity;
  }

  const productStats = products.map(product => {
    const soldUnits = soldMap[product.productType] || 0;
    totalStock += product.stock;

    if (product.stock < 10) lowStockCount++;
    if (product.stock > 0) activeProducts++;

    return {
      productType: product.productType,
      description: product.description,
      size: product.size,
      price: product.price,
      stock: product.stock,
      soldUnits,
    };
  });

  // Sort top selling products
  const topSelling = [...productStats].sort((a, b) => b.soldUnits - a.soldUnits).slice(0, 5);

  res.status(200).json({
    success: true,
    totalProducts: products.length,
    totalStock,
    totalSoldUnits: Object.values(soldMap).reduce((a, b) => a + b, 0),
    lowStockCount,
    activeProducts,
    topSellingProducts: topSelling,
    products: productStats
  });
});


exports.assignProductToDeliveryBoy = catchAsyncErrors(async (req, res, next) => {
  const { deliveryBoyId, productId, quantity } = req.body;

  if (!deliveryBoyId || !productId || !quantity) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  if (product.stock < quantity) {
    return next(new ErrorHandler("Not enough product stock available", 400));
  }

  const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
  if (!deliveryBoy) {
    return next(new ErrorHandler("Delivery boy not found", 404));
  }

  // Update or add assigned product stock
  const existingIndex = deliveryBoy.assignedProductStock.findIndex(p =>
    p.productId.toString() === productId
  );

  if (existingIndex !== -1) {
    deliveryBoy.assignedProductStock[existingIndex].quantity += quantity;
  } else {
    deliveryBoy.assignedProductStock.push({ productId, quantity });
  }

  await deliveryBoy.save();

  // Deduct from product stock
  product.stock -= quantity;
  await product.save();

  // Populate product details
  await deliveryBoy.populate({
    path: "assignedProductStock.productId",
    select: "productType price description"
  });

  res.status(200).json({
    success: true,
    message: "Product assigned to delivery boy successfully",
    deliveryBoy
  });
});

exports.getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ stock: 1 }); // Sort ascending (low stock first)

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully, sorted by low stock",
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};
