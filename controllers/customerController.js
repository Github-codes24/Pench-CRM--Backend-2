const Customer = require("../models/coustomerModel");

// ➡️ Create new customer
exports.createCustomer = async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ➡️ Get all customers
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find()
      .populate("products.product", "productName price size stock")
      .populate("deliveryBoy", "name phoneNumber");
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ➡️ Get single customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate("products.product", "productName price size")
      .populate("deliveryBoy", "name phoneNumber");
    if (!customer) return res.status(404).json({ success: false, error: "Customer not found" });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ➡️ Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) return res.status(404).json({ success: false, error: "Customer not found" });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ➡️ Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: "Customer not found" });
    res.json({ success: true, message: "Customer deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

