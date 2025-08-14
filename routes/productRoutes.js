const express = require("express");
const router = express.Router();
const {createProduct , getAllProducts ,getLowStockProducts, getProductById , updateProduct ,assignProductToDeliveryBoy,getSellerProducts,getProductDashboardStats, deleteProduct,getTopSellingProducts,addProductQuantity,removeProductQuantity,getProductsBySellerId} = require("../controller/productController"); // 
const upload = require("../utils/multer"); // Handles file uploads
const { isAuthenticatedUser, authorizeRoles } = require("../middlewares/auth"); // Optional if you use auth

// Create product (with image upload, max 5 images)
router.post(
  "/products",
   // isAuthenticatedUser,
  upload.array("image", 5),
  createProduct
);

router.put("/product/:productId/add-quantity",isAuthenticatedUser, addProductQuantity);
router.put("/product/:productId/remove-quantity", isAuthenticatedUser, removeProductQuantity);


// Get all products
router.get("/get-all-products", getAllProducts);

// Get single product by ID
router.get("/products/:id",isAuthenticatedUser, getProductById);

// Update product by ID (with image upload)
router.put(
  "/products/:id",
  isAuthenticatedUser,
  upload.array("image", 5),
  updateProduct
);

// Delete product by ID
router.delete(
  "/products/:id",
  isAuthenticatedUser,
  deleteProduct
);

router.route("/getsellerproducts").get(isAuthenticatedUser, getSellerProducts)
router.get("/product-stats", getProductDashboardStats);
router.post("/assign-product", assignProductToDeliveryBoy);

//low stock aleart


router.get("/low-stock/products", getLowStockProducts);

module.exports = router;
