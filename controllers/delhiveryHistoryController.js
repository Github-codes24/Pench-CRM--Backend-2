const DeliveryHistory = require("../models/delhiveryHistory");
const Customer = require("../models/coustomerModel");
const DeliveryBoy = require("../models/delhiveryBoyModel");

// ➡️ Create a new delivery history entry
exports.createDeliveryHistory = async (req, res) => {
  try {
    const { customer, deliveryBoy, product, quantityDelivered, totalPrice, status, remarks } = req.body;

    if (!customer || !product || !totalPrice) {
      return res.status(400).json({ success: false, message: "Customer, Product and TotalPrice are required" });
    }

    const delivery = await DeliveryHistory.create({
      customer,
      deliveryBoy,
      product,
      quantityDelivered,
      totalPrice,
      status,
      remarks,
    });

    res.status(201).json({ success: true, delivery });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ➡️ Get all delivery histories (with filters)
exports.getAllDeliveries = async (req, res) => {
  try {
    const { customer, deliveryBoy, status, startDate, endDate } = req.query;
    let filter = {};

    if (customer) filter.customer = customer;
    if (deliveryBoy) filter.deliveryBoy = deliveryBoy;
    if (status) filter.status = status;
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const deliveries = await DeliveryHistory.find(filter)
      .populate("customer", "name phoneNumber address")
      .populate("deliveryBoy", "name phoneNumber area")
      .populate("product", "name price size");

    res.status(200).json({ success: true, count: deliveries.length, deliveries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ➡️ Get deliveries by customer
exports.getDeliveriesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const deliveries = await DeliveryHistory.find({ customer: customerId })
      .populate("customer", "name phoneNumber address")
      .populate("deliveryBoy", "name phoneNumber area")
      .populate("product", "name price size");

    res.status(200).json({ success: true, count: deliveries.length, deliveries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ➡️ Get deliveries by delivery boy
exports.getDeliveriesByDeliveryBoy = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    const deliveries = await DeliveryHistory.find({ deliveryBoy: deliveryBoyId })
      .populate("customer", "name phoneNumber address")
      .populate("deliveryBoy", "name phoneNumber area")
      .populate("product", "name price size");

    res.status(200).json({ success: true, count: deliveries.length, deliveries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ➡️ Update a delivery history record
exports.updateDeliveryHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const delivery = await DeliveryHistory.findByIdAndUpdate(id, req.body, {
      new: true,
    })
      .populate("Customer", "name phoneNumber")
      .populate("DeliveryBoy", "name phoneNumber")
      .populate("Product", "name price size");

    if (!delivery) {
      return res.status(404).json({ success: false, message: "Delivery record not found" });
    }

    res.status(200).json({ success: true, delivery });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ➡️ Delete a delivery history record
exports.deleteDeliveryHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const delivery = await DeliveryHistory.findByIdAndDelete(id);

    if (!delivery) {
      return res.status(404).json({ success: false, message: "Delivery record not found" });
    }

    res.status(200).json({ success: true, message: "Delivery record deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
