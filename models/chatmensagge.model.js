import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const ChatMessage = sequelize.define("ChatMessage", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  role: {
    type: DataTypes.ENUM("user", "assistant"),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isCommand: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});
