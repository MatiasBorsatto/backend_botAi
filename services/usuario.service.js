import { Chat } from "../models/index.js";

class UsuarioService {
  async guardarHistorial(historial) {
    try {
      console.log(historial);
      // Validación básica de datos
      if (!historial || typeof historial !== "object") {
        throw new Error("Datos de historial inválidos");
      }

      // Validar campos requeridos
      if (!historial.titulo) {
        throw new Error("El título es requerido");
      }

      if (!historial.historial) {
        throw new Error("El historial es requerido");
      }

      if (!historial.usuario_id) {
        throw new Error("El ID del usuario es requerido");
      }

      // Crear el chat
      const nuevoChat = Chat.build({
        titulo: historial.titulo,
        historial: historial.historial,
        usuario_id: historial.usuario_id,
      });

      // Validar antes de guardar
      await nuevoChat.validate();

      // Guardar el chat
      const chatGuardado = await nuevoChat.save();

      return chatGuardado;
    } catch (error) {
      console.error("Error en UsuarioService.guardarHistorial:", error);
      throw error;
    }
  }

  async obtenerHistorialPorUsuario(usuario_id) {
    try {
      const chats = await Chat.findAll({
        where: { usuario_id },
        order: [["createdAt", "DESC"]],
      });

      // Parsear el historial de cada chat si está en formato JSON
      return chats.map((chat) => ({
        ...chat.toJSON(),
        historial:
          typeof chat.historial === "string"
            ? JSON.parse(chat.historial)
            : chat.historial,
      }));
    } catch (error) {
      console.error(
        "Error en UsuarioService.obtenerHistorialPorUsuario:",
        error
      );
      throw error;
    }
  }

  async obtenerChatPorId(id_chat) {
    try {
      const chat = await Chat.findByPk(id_chat);

      if (!chat) {
        throw new Error("Chat no encontrado");
      }

      return {
        ...chat.toJSON(),
        historial:
          typeof chat.historial === "string"
            ? JSON.parse(chat.historial)
            : chat.historial,
      };
    } catch (error) {
      console.error("Error en UsuarioService.obtenerChatPorId:", error);
      throw error;
    }
  }

  async actualizarHistorial(id_chat, nuevoHistorial) {
    try {
      const chat = await Chat.findByPk(id_chat);

      if (!chat) {
        throw new Error("Chat no encontrado");
      }

      const historialString =
        typeof nuevoHistorial === "string"
          ? nuevoHistorial
          : JSON.stringify(nuevoHistorial);

      chat.historial = historialString;
      await chat.save();

      return chat;
    } catch (error) {
      console.error("Error en UsuarioService.actualizarHistorial:", error);
      throw error;
    }
  }
}

export default new UsuarioService();
