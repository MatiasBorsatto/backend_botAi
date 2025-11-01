import sequelize from "../config/db.js";
import Usuario from "./usuario.model.js";
import Chat from "./chat.model.js";

// Definir relaciones
Usuario.hasMany(Chat, {
  foreignKey: "usuario_id",
  sourceKey: "id_usuario",
  as: "chats",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Chat.belongsTo(Usuario, {
  foreignKey: "usuario_id",
  targetKey: "id_usuario",
  as: "usuario",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Sincronizar modelos con la base de datos
await sequelize.sync({ alter: true });

export { Usuario, Chat, sequelize };
