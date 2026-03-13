import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";


// ================= CORS =================

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);


// ================= BODY =================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ================= LOGGER =================

app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url}`
  );
  next();
});


// ================= ROUTES =================

import paymentRoutes from "./routes/payment.js";
import webhookRoutes from "./routes/webhooks.js";

app.use("/api/payment", paymentRoutes);
app.use("/api/webhook", webhookRoutes);


// ================= HEALTH =================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});


app.get("/health/cashfree", (req, res) => {
  res.json({
    appId: process.env.CASHFREE_APP_ID ? "SET" : "MISSING",
    secret: process.env.CASHFREE_APP_SECRET ? "SET" : "MISSING",
    url:
      process.env.CASHFREE_API_URL ||
      "https://api.cashfree.com/pg",
  });
});


// ================= 404 =================

app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
  });
});


// ================= ERROR =================

app.use((err, req, res, next) => {
  console.log(err);

  res.status(500).json({
    error: err.message,
  });
});


// ================= START =================

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});