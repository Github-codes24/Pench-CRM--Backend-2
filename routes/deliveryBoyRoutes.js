const express = require("express");
const router = express.Router();

const {
  createDeliveryBoy,
  loginDeliveryBoy,
  getAllDeliveryBoys,
  getDeliveryBoyById,
  updateDeliveryBoy,
  deleteDeliveryBoy,
} = require("../controller/deliveryBoyController");

const { isAuthenticatedUser } = require("../middlewares/auth");

router.post("/adddeliveryboy", isAuthenticatedUser, createDeliveryBoy);
router.post("/deliveryboy/login", loginDeliveryBoy);
router.get("/getalldeliveryboys", getAllDeliveryBoys);
router.get("/getdeliveryboy/:id", getDeliveryBoyById);
router.put("/updatedeliveryboy/:id", isAuthenticatedUser, updateDeliveryBoy);
router.delete("/deletedeliveryboy/:id", isAuthenticatedUser, deleteDeliveryBoy);

module.exports = router;
