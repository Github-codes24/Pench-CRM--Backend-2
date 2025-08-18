const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Enable CORS
app.use(
  cors({
    origin: "*", // Change to your frontend URL in production
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Parsing middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Root route (fixes "Cannot GET /")
app.get("/", (req, res) => {
  res.send("Backend is running ");
});

// Middlewares
const errorMiddleware = require("./middlewares/error");

// Routes
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const deliveryBoyRoutes = require("./routes/deliveryBoyRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const getDeliveryManagementRoutes = require("./routes/deliveryManagementRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const LeadRoutes = require("./routes/leadRoutes");

app.use("/api/v1", userRoutes);
app.use("/api/v1", productRoutes);
app.use("/api/v1", customerRoutes);
app.use("/api/v1", deliveryBoyRoutes);
app.use("/api/v1", invoiceRoutes);
app.use("/api/v1", orderRoutes);
app.use("/api/v1", paymentRoutes);
app.use("/api/v1", getDeliveryManagementRoutes);
app.use("/api/v1", dashboardRoutes);
app.use("/api/v1", subscriptionRoutes);
app.use("/api/v1", LeadRoutes);

// Error middleware
app.use(errorMiddleware);

module.exports = app;
