import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false, // opcional: apaga logs de SQL
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  define: {
    schema: "aurai", // <-- Fuerza todas las tablas al esquema 'aurai'
    underscored: true, // opcional: convierte createdAt -> created_at
  },
  // searchPath asegura que al leer/escribir se use el esquema correcto
  schema: "aurai",
});

// Esto asegura que Sequelize use el esquema al iniciar
sequelize.createSchema("aurai", { logging: false }).catch(() => {}); // ignora error si ya existe

export default sequelize;
export { sequelize };
