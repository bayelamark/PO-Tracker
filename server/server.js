const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cardRoutes = require("./routes/cardRoutes");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/cards", cardRoutes);
app.use("/api/auth", authRoutes);

app.get("/", function (request, response) {
  response.json({
    message: "PO Tracker server is running."
  });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB.");

    app.listen(PORT, function () {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed.");
    console.error(error.message);
    process.exit(1);
  }
}

startServer();