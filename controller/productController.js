// controller/productController.js
const Product = require("../models/productModel"); // adjust path if needed
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");

exports.createProduct = catchAsyncErrors(async (req, res, next) => {
    const { name, description, productType, size, quantity, price } = req.body;

    if (!name || !description || !quantity || !price || !size) {
        return next(new ErrorHandler("All fields are required", 400));
    }

    const productData = {
        name,
        description,
        quantity,
        productType,
        size,
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
    const { productId } = req.params;
    const { name, description,productType, quantity, size, price, stock } = req.body;

    const product = await Product.findById(productId);
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
    const product = await Product.findById(req.params.id);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    await product.remove();

    res.status(200).json({
        success: true,
        message: "Product deleted successfully",
    });
});

