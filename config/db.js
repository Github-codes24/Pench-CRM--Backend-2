const mongoose = require("mongoose");

const connectDatabase = () => {
  const dbURI = process.env.DATABASE_URI || "mongodb+srv://adityadhopte16:bPZ39Sf6pfmaKzFJ@cluster0.bq1nb.mongodb.net/milk_pench";
  // console.log("Connecting to database:", dbURI);

  mongoose
    .connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,

    })
    .then((data) => {
      console.log(`Mongodb connected with server: ${data.connection.host}`);

    })
    .catch((err) => {
      console.error('Error connecting to MongoDB:', err);

      // Further debug output
      if (err.name === 'MongoNetworkError') {
        console.error("MongoNetworkError: Network issues, MongoDB server might not be running.");
      } else if (err.name === 'MongooseServerSelectionError') {
        console.error("MongooseServerSelectionError: Cannot reach MongoDB server.");
      }
    });
};

module.exports = connectDatabase;
