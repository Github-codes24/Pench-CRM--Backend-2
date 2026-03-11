const express = require("express");
const app = express();
const db = require("./config/db");
const env = require("dotenv");
env.config();
const port = process.env.PORT || 4000;
const cookieParser = require("cookie-parser");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const { initializeOrders } = require("./controllers/customerOrderController");

require("./smsJob/job");

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
    optionsSuccessStatus: 200,
  })
);

// Swagger

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Pench",
      version: "1.0.0",
      description: "API documentation for Pench Backend",
    },
    servers: [
      { url: "http://localhost:8000" },
      { url: "https://pench-crm-backend.onrender.com" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
const adminRoutes = require("./routes/adminRoutes");
const customerRoutes = require("./routes/customerRoutes");
const deliveryBoyRoutes = require("./routes/deliveryBoyRoutes");
const bottleTrackingRoutes = require("./routes/bottleTrackingRoutes");
const deliveryManagementRoutes = require("./routes/deliveryManagementRoutes");
const productRoutes = require("./routes/productRoutes");
const customerInvoiceRoutes = require("./routes/customerInvoiceRoutes");
const customOrderRoutes = require("./routes/customerOrderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const termsAndConditionRoutes = require("./routes/termsAndConditionRoutes");
const helpAndSupportRoutes = require("./routes/helpAndSupportRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

app.use("/api/admin", adminRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/deliveryBoy", deliveryBoyRoutes);
app.use("/api/bottleTracking", bottleTrackingRoutes);
app.use("/api/deliveryManagement", deliveryManagementRoutes);
app.use("/api/product", productRoutes);
app.use("/api/invoice", customerInvoiceRoutes);
app.use("/api/customOrder", customOrderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/termsAndCondition", termsAndConditionRoutes);
app.use("/api/helpAndSupport", helpAndSupportRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/notification", notificationRoutes);

// Connect DB then start server
db().then(async () => {
  // console.log("✅ Database connected");


  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
  // Run orders initialization only once at server start
  initializeOrders()
    .then(() => console.log("✅ Orders initialized"))
    .catch((err) => console.error("❌ Orders init failed:", err.message));

});
