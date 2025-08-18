const express = require("express");
const router = express.Router();
const {createProduct , getAllProducts ,getLowStockProducts, getProductById ,getProductByProductName,getProductByProductSize, updateProduct ,assignProductToDeliveryBoy,getSellerProducts,getProductDashboardStats, deleteProduct,getTopSellingProducts,addStockQuantity,removeStockQuantity,getProductsBySellerId} = require("../controllers/productController"); // 
const upload = require("../utils/multer"); // Handles file uploads
const { isAuthenticatedUser, authorizeRoles } = require("../middlewares/auth"); // Optional if you use auth

// Create product (with image upload, max 5 images)
router.post(
  "/products",
  //  isAuthenticatedUser,
  upload.array("image", 5),
  createProduct
);

// Get all products
router.get("/get-all-products", getAllProducts);

// Update product by ID (with image upload)
router.put(
  "/edit-product/:id",
 /*isAuthenticatedUser,*/
  upload.array("image", 5),
  updateProduct
);

router.put("/product/:productId/add-stock-quantity",/*isAuthenticatedUser,*/ addStockQuantity);
router.put("/product/:productId/remove-stock-quantity",/*isAuthenticatedUser,*/ removeStockQuantity);

// Get single product by ID
router.get("/get-product/:id",/*isAuthenticatedUser,*/ getProductById);
router.get("/get-product-by-name/",/*isAuthenticatedUser,*/ getProductByProductName);
router.get("/get-product-by-size/",/*isAuthenticatedUser,*/ getProductByProductSize);

// Delete product by ID
router.delete(
  "/products/:id",
  /*isAuthenticatedUser,*/
  deleteProduct
);

router.route("/getsellerproducts").get(isAuthenticatedUser, getSellerProducts)
router.get("/product-stats", getProductDashboardStats);
router.post("/assign-product", assignProductToDeliveryBoy);

//low stock aleart
router.get("/low-stock/products", getLowStockProducts);

module.exports = router;
