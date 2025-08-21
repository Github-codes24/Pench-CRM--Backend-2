const express = require("express");
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const router = express.Router();

router.post("/add-products", createProduct);
router.get("/get-products", getAllProducts);
router.get("/get-products/:id", getProductById);
router.put("/update-products/:id", updateProduct);
router.delete("/delete-products/:id", deleteProduct);

module.exports = router;
