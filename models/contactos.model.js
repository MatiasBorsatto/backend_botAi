const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Contacto = sequelize.define("Contact", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  telefono: {
    type: DataTypes.STRING,
  },
  localidad: {
    type: DataTypes.STRING,
  },
});

export default Contacto;
