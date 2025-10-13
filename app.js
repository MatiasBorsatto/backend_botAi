import express from "express";
import router from "./router/router.js";
import cors from "cors";
import { sequelize } from "./config/db.js";

const app = express();

app.use(express.json());

app.use(cors());

app.use("/api", router);

app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

// Sincronizar modelos con la base de datos
sequelize
  .sync({ force: false })
  .then(() => {
    console.log("✅ Base de datos sincronizada");
  })
  .catch((err) => {
    console.error("❌ Error al sincronizar la base de datos:", err);
  });

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Error interno del servidor",
  });
});

export default app;
