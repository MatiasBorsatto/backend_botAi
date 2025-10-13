import express from "express";
import router from "./router/router.js";
import cors from "cors";

const app = express();

app.use(express.json());

app.use(cors());

app.use("/api", router);

app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Error interno del servidor",
  });
});

export default app;
