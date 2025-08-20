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


app.use("/admin" , adminRoutes);


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

const htttpServer = http.createServer(app);
htttpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
