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
    Si detectas un comando relacionado con contactos (crear, leer, actualizar o eliminar), 
    responde con un JSON en este formato:
    {
      "isCommand": true,
      "action": "create|read|update|delete",
      "data": {
        "nombre": "string",
        "email": "string",
        "telefono": "string"
      }
    }
    Si es una conversación normal, responde naturalmente.`;
  }

  async enviarPrompt(req, res) {
    try {
      const historico = req.body.messages;

      // Agregar el system prompt al inicio del histórico
      const contenidoFormateado = [
        {
          role: "system",
          content: this.systemPrompt,
        },
        ...historico.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const response = await fetch(apiDeepseek, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKeyDeepseek}`,
        },
        body: JSON.stringify({
          model: "deepseek-r1-distill-llama-70b",
          messages: contenidoFormateado,
          temperature: 0.6,
          max_completion_tokens: 4096,
          top_p: 0.95,
          stream: false,
          reasoning_format: "hidden",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const rawRespuesta = data.choices[0].message.content;

      // Intentar detectar si es un comando JSON
      let isCommand = false;
      let resultado = null;
      try {
        const jsonResponse = JSON.parse(rawRespuesta);
        if (jsonResponse.isCommand) {
          isCommand = true;
          resultado = await this.executeDbOperation(jsonResponse);
        }
      } catch (e) {
        // No es un JSON, es una respuesta normal
      }

      // Guardar mensaje del usuario
      await ChatMessage.create({
        role: "user",
        content: historico[historico.length - 1].content,
        isCommand: false,
      });

      // Guardar respuesta del asistente
      await ChatMessage.create({
        role: "assistant",
        content: isCommand
          ? `Operación completada: ${resultado}`
          : rawRespuesta,
        isCommand,
      });

      const htmlRespuesta = marked.parse(rawRespuesta);

      res.status(200).json({
        mensaje: "Se envió correctamente el prompt",
        respuesta: htmlRespuesta,
        raw: rawRespuesta,
        isCommand,
        resultado,
      });
    } catch (error) {
      console.error("Error al enviar el prompt:", error);
      res.status(500).json({ error: error.message });
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
