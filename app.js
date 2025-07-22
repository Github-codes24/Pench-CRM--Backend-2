const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors"); // <--- Added

// Enable CORS
// Enable CORS for a specific origin
app.use(cors({
  origin: "*", // <-- exact frontend path
  credentials: true,
  optionsSuccessStatus: 200  // <-- Added for legacy browsers handling

}));

// Middlewares
const errorMiddleware = require("./middlewares/error");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const deliveryBoyRoutes = require("./routes/deliveryBoyRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const getDeliveryManagementRoutes = require("./routes/deliveryMangementRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const subscrptionRoutes = require("./routes/subscrptionRoutes");
const LeadRoutes = require("./routes/leadRoutes");
// Parsing middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1", userRoutes);
app.use("/api/v1", productRoutes);
app.use("/api/v1", customerRoutes);
app.use("/api/v1", deliveryBoyRoutes);
app.use("/api/v1", invoiceRoutes);
app.use("/api/v1", orderRoutes);
app.use("/api/v1",paymentRoutes);
app.use("/api/v1",getDeliveryManagementRoutes);
app.use("/api/v1",dashboardRoutes);
app.use("/api/v1",subscrptionRoutes);
app.use("/api/v1", LeadRoutes);
// Error middleware
app.use(errorMiddleware);

module.exports = app;
