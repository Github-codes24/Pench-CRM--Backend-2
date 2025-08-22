const express = require("express");
const {
  registerDeliveryBoy,
  loginDeliveryBoy,
  getAllDeliveryBoys,
  getDeliveryBoyById,
  updateDeliveryBoy,
  deleteDeliveryBoy,
} = require("../controllers/delhiveryBoyController");

const router = express.Router();

router.post("/register", registerDeliveryBoy);
router.post("/login", loginDeliveryBoy);
router.get("/getAll", getAllDeliveryBoys);
router.get("/getById/:id", getDeliveryBoyById);
router.put("/update/:id", updateDeliveryBoy);
router.delete("/delete/:id", deleteDeliveryBoy);

module.exports = router;
