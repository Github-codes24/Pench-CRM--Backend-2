const BottleTransaction = require("../models/bottleTransactionModel");
const DeliveryBoy = require("../models/delhiveryBoyModel");

// ✅ Create new transaction (assign bottles with sizes)
exports.createTransaction = async (req, res) => {
  try {
    const { deliveryBoy, assigned, returned, remarks } = req.body;

    // find last transaction for this delivery boy
    const lastTransaction = await BottleTransaction.findOne({ deliveryBoy })
      .sort({ createdAt: -1 });

    let prevPending = lastTransaction ? lastTransaction.pending : [];

    // initialize pending by merging prevPending + assigned - returned
    const pending = [];

    const sizes = ["0.5L", "1L"];

    sizes.forEach((size) => {
      const prev = prevPending.find((p) => p.size === size)?.count || 0;
      const assignCount = assigned?.find((a) => a.size === size)?.count || 0;
      const returnCount = returned?.find((r) => r.size === size)?.count || 0;

      pending.push({
        size,
        count: prev + assignCount - returnCount,
      });
    });

    const transaction = await BottleTransaction.create({
      deliveryBoy,
      assigned,
      returned,
      pending,
      remarks,
    });

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await BottleTransaction.find()
      .populate("deliveryBoy", "name phoneNumber area");
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get transactions by delivery boy
exports.getTransactionsByDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    const transactions = await BottleTransaction.find({ deliveryBoy: id })
      .populate("deliveryBoy", "name phoneNumber area");

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Update a transaction (edit remarks or values)
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await BottleTransaction.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!transaction)
      return res.status(404).json({ success: false, message: "Transaction not found" });

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await BottleTransaction.findByIdAndDelete(id);

    if (!transaction)
      return res.status(404).json({ success: false, message: "Transaction not found" });

    res.status(200).json({ success: true, message: "Transaction deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get current pending balance for a delivery boy
exports.getPendingBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const lastTransaction = await BottleTransaction.findOne({ deliveryBoy: id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      pending: lastTransaction ? lastTransaction.pending : [],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Update returned bottles by size
exports.updateReturnedBottles = async (req, res) => {
  try {
    const { id } = req.params; // transaction id
    const { size, count } = req.body; // size: "0.5L"/"1L", count: number

    if (!size || count === undefined || count < 0) {
      return res.status(400).json({
        success: false,
        message: "Size and returned count are required and must be >= 0",
      });
    }

    let transaction = await BottleTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    // Update returned entry
    let returnedEntry = transaction.returned.find((r) => r.size === size);
    if (!returnedEntry) {
      transaction.returned.push({ size, count: 0 });
      returnedEntry = transaction.returned.find((r) => r.size === size);
    }
    returnedEntry.count += count;

    // Find assigned entry
    const assignedEntry = transaction.assigned.find((a) => a.size === size);
    if (!assignedEntry) {
      return res.status(400).json({ success: false, message: `No assigned bottles for ${size}` });
    }

    // Update pending = assigned - returned
    let pendingEntry = transaction.pending.find((p) => p.size === size);
    if (!pendingEntry) {
      transaction.pending.push({ size, count: 0 });
      pendingEntry = transaction.pending.find((p) => p.size === size);
    }
    pendingEntry.count = assignedEntry.count - returnedEntry.count;

    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Returned bottles updated successfully for ${size}`,
      transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
