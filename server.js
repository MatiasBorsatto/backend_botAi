import app from "./app.js";
import dotenv from "dotenv";
import os from "os";

dotenv.config();

const PORT = process.env.PORT;

const interfaces = os.networkInterfaces();
let ip = "localhost";
// for (const iface of Object.values(interfaces).flat()) {
//   if (iface.family === "IPv4" && !iface.internal) {
//     ip = iface.address;
//     break;
//   }
// }

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en http://${ip}:${PORT}`);
});

// Manejo de errores del servidor
app.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`⚠️ El puerto ${PORT} está en uso`);
  } else {
    console.error("⚠️ Error del servidor:", error);
  }
});
