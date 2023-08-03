import express from "express";
import path from "path";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import seedRouter from "./routes/seedRoutes.js";
import artRouter from "./routes/artRoutes.js";
import userRouter from "./routes/userRoutes.js";
import orderRouter from "./routes/orderRoutes.js";
import bookRouter from "./routes/bookRoutes.js";
import requestRouter from "./routes/requestRoutes.js";
import uploadRouter from "./routes/uploadRoutes.js";

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("connected to db");
  })
  .catch((err) => {
    console.log(err.message);
  });

const app = express();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("https://fanartiks.onrender.com/api/keys/paypal", (req, res) => {
  res.send(process.env.PAYPAL_CLIENT_ID || "sb");
});
app.get("https://fanartiks.onrender.com/api/keys/google", (req, res) => {
  res.send({ key: process.env.GOOGLE_API_KEY || "" });
});

app.use("https://fanartiks.onrender.com/api/upload", uploadRouter);
app.use("https://fanartiks.onrender.com/api/seed", seedRouter);
app.use("https://fanartiks.onrender.com/api/arts", artRouter);
app.use("https://fanartiks.onrender.com/api/users", userRouter);
app.use("https://fanartiks.onrender.com/api/requests", requestRouter);
app.use("https://fanartiks.onrender.com/api/bookings", bookRouter);
app.use("https://fanartiks.onrender.com/api/orders", orderRouter);

const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "/frontend/build")));
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "/frontend/build/index.html"))
);

app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`serve at http://localhost:${port}`);
});
