const express = require("express");
const app = express();

const http = require("http");

const mongoose = require("mongoose");
const env = require("dotenv");
env.config();
const port = process.env.PORT || 4000;
const cookieParser = require("cookie-parser")
const cors = require("cors");
app.use(express.json())

app.use(cookieParser())

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  exposedHeaders: ["X-Total-Count"],
}))

app.use(express.json());

const adminRoutes = require("./routes/adminRoutes")
const coustomerRoutes = require("./routes/coustomerRoutes")
const DelhiveryBoyRoutes = require("./routes/delhiveryBoyRoutes")
const bottleRoutes = require("./routes/bottleTransactionRoutes")


app.use("/admin" , adminRoutes);
app.use("/customer" , coustomerRoutes);
app.use("/delhiveryBoy" , DelhiveryBoyRoutes);
app.use("/bottle" , bottleRoutes);



app.get("/", (req, res) => {
  res.send("we are Pench Milk");
});

main().catch((err) => console.log(err));

async function main() {
  mongoose
    .connect(process.env.MONGO_DB_URL, { useNewUrlParser: true })
    .then(() => {
      console.log("mongo_db connected");
    });
}

// const htttpServer = http.createServer(app);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
