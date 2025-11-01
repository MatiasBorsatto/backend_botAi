import { Model, DataTypes } from "sequelize";
import sequelize from "../config/db.js";

class Chat extends Model {}

Chat.init(
  {
    id_chat: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    historial: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Chat",
    tableName: "chats",
    timestamps: true,
  }
);

// Asegurar que el modelo está sincronizado con la base de datos
await sequelize.sync();

export default Chat;
