import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { marked } from "marked";
import { Contact } from "../models/Contact.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { Op } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

const apiDeepseek = process.env.APIDEEPSEEK;
const apiKeyDeepseek = process.env.APIKEYDEEPSEEK;

class PromptDeepseek {
  constructor() {
    this.systemPrompt = `Eres un asistente que puede mantener conversaciones normales y gestionar contactos.
    IMPORTANTE: Cuando detectes información de contacto como nombres, emails o teléfonos en el mensaje del usuario,
    DEBES responder SIEMPRE con un JSON en este formato, sin excepciones:
    {
      "isCommand": true,
      "action": "create",
      "data": {
        "nombre": "string",
        "email": "string",
        "telefono": "string"
      }
    }
    Por ejemplo, si el usuario dice "mi nombre es Juan Pérez, mi email es juan@email.com", 
    debes responder:
    {
      "isCommand": true,
      "action": "create",
      "data": {
        "nombre": "Juan Pérez",
        "email": "juan@email.com",
        "telefono": ""
      }
    }
    
    Si el usuario menciona explícitamente guardar, crear o agregar un contacto, usa action: "create".
    Si el usuario pide buscar o ver contactos, usa action: "read".
    Si el usuario pide modificar o actualizar, usa action: "update".
    Si el usuario pide eliminar o borrar, usa action: "delete".
    
    Para cualquier otra conversación que NO incluya información de contactos, responde naturalmente.`;
  }

  async enviarPrompt(req, res) {
    try {
      const historico = req.body.messages || [];

      // Agregar el system prompt al inicio del histórico
      const contenidoFormateado = [
        {
          role: "user",
          content: historico,
        },
      ];

      const response = await fetch(apiDeepseek, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKeyDeepseek}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          documents: this.systemPrompt,
          messages: contenidoFormateado,
          temperature: 0.7,
          max_tokens: 2000,
          top_p: 0.95,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status}`);
      }

      const data = await response.json();
      const rawRespuesta = data.choices[0].message.content;

      try {
        // Intentar parsear la respuesta como JSON
        const jsonResponse = JSON.parse(rawRespuesta);

        if (
          jsonResponse.isCommand &&
          jsonResponse.action &&
          jsonResponse.data
        ) {
          // Es un comando para la base de datos
          const resultado = await this.executeDbOperation(jsonResponse);

          const operacionesMsg = {
            create: "Contacto creado exitosamente",
            read: "Contactos encontrados",
            update: "Contacto actualizado exitosamente",
            delete: "Contacto eliminado exitosamente",
          };

          // Guardar en el historial
          await ChatMessage.create({
            role: "assistant",
            content: `${operacionesMsg[jsonResponse.action]}: ${JSON.stringify(
              resultado
            )}`,
            isCommand: true,
          });

          return res.status(200).json({
            success: true,
            mensaje: operacionesMsg[jsonResponse.action],
            resultado,
            isCommand: true,
          });
        }
      } catch (e) {
        // No es un JSON válido, tratar como respuesta normal
      }

      // Si llegamos aquí, es una respuesta normal
      await ChatMessage.create({
        role: "assistant",
        content: rawRespuesta,
        isCommand: false,
      });

      const htmlRespuesta = marked.parse(rawRespuesta);

      return res.status(200).json({
        success: true,
        respuesta: htmlRespuesta,
        raw: rawRespuesta,
        isCommand: false,
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async executeDbOperation(interpretation) {
    try {
      let result;
      switch (interpretation.action) {
        case "create":
          result = await Contact.create(interpretation.data);
          break;

        case "read":
          if (interpretation.data.email) {
            result = await Contact.findOne({
              where: { email: interpretation.data.email },
            });
          } else if (interpretation.data.nombre) {
            result = await Contact.findAll({
              where: {
                nombre: { [Op.iLike]: `%${interpretation.data.nombre}%` },
              },
            });
          } else {
            result = await Contact.findAll();
          }
          break;

        case "update":
          result = await Contact.update(interpretation.data, {
            where: { email: interpretation.data.email },
          });
          break;

        case "delete":
          result = await Contact.destroy({
            where: { email: interpretation.data.email },
          });
          break;
      }
      return result;
    } catch (error) {
      throw new Error(`Error en operación de base de datos: ${error.message}`);
    }
  }

  async getChatHistory(req, res) {
    try {
      const chatHistory = await ChatMessage.findAll({
        order: [["createdAt", "ASC"]],
        limit: 50,
      });
      res.json({ success: true, history: chatHistory });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new PromptDeepseek();
