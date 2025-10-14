import { Model, DataTypes } from "sequelize";
import sequelize from "../config/db.js";

class Contacto extends Model {}

Contacto.init(
  {
    id_contacto: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^[\d\s+-]+$/i, // Validación básica para números de teléfono
      },
    },
  },
  {
    sequelize,
    modelName: "Contacto",
    tableName: "contactos",
    timestamps: true,
  }
);

// Asegurar que el modelo está sincronizado con la base de datos
await sequelize.sync();

export default Contacto;
