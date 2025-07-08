const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors"); // <--- Added

// Enable CORS
// Enable CORS for a specific origin
app.use(cors({
  origin: "*", // <-- exact frontend path
  credentials: true
}));

// Middlewares
const errorMiddleware = require("./middlewares/error");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const deliveryBoyRoutes = require("./routes/deliveryBoyRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
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
// Error middleware
app.use(errorMiddleware);

module.exports = app;
