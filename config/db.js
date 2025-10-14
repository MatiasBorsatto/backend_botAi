import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  schema: "aurai",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  logging: console.log,
  define: {
    timestamps: true,
    underscored: true,
  },
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexión establecida correctamente.");
    return true;
  } catch (error) {
    console.error("❌ Error conectando a la base de datos:", error);
    return false;
  }
};

// Realizar prueba de conexión inicial
testConnection();

export default sequelize;
