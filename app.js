import express from "express";
import router from "./router/router.js";
import cors from "cors";
import { sequelize } from "./config/database.js";

const app = express();

app.use(express.json());
app.use(cors());

// Sincronizar modelos con la base de datos
sequelize
  .sync({ force: false })
  .then(() => {
    console.log("✅ Base de datos sincronizada");
  })
  .catch((err) => {
    console.error("❌ Error al sincronizar la base de datos:", err);
  });

app.use("/api", router);

export default app;
