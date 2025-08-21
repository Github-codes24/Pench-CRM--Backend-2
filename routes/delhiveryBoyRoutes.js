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
router.get("/", getAllDeliveryBoys);
router.get("/:id", getDeliveryBoyById);
router.put("/:id", updateDeliveryBoy);
router.delete("/:id", deleteDeliveryBoy);

module.exports = router;
