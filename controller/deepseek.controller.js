// controller/deepseek.controller.js
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { marked } from "marked";
import { Op } from "sequelize";
import fetch from "node-fetch"; // Si Node < 18, instala node-fetch
import { ChatMessage } from "../models/ChatMessage.js";
import {
  upsertDynamicModel,
  getDynamicModel,
  ensureLooseModel,
} from "../models/dynamicModels.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

const apiDeepseek = process.env.APIDEEPSEEK;
const apiKeyDeepseek = process.env.APIKEYDEEPSEEK;

class PromptDeepseek {
  constructor() {
    this.systemPrompt = `
Eres un asistente que:
1) Mantiene conversaciones naturales.
2) Traduce instrucciones en lenguaje humano a comandos JSON CRUD/define_entity.
3) Si detectas nombres de entidades y campos, genera JSON válido según formato:
{
  "isCommand": true,
  "action": "create|read|update|delete|define_entity",
  "entity": "nombreEntidad",
  "data": {...},     // Para create/update
  "where": {...},    // Para read/update/delete
  "schema": {...},   // Para define_entity
  "options": {...}   // opcional: limit, order, offset
}
Tipos soportados: string, text, integer, float, decimal, boolean, date, uuid, json.
Si no es intención CRUD, responde naturalmente.`;
  }

  // -------- Traducción de lenguaje natural a acciones --------
  mapNaturalLanguageAction(text) {
    if (!text) return null;
    const t = text.toLowerCase();

    if (/(crear|agrega|nuevo|añadir|insertar)/.test(t)) return "create";
    if (/(mostrar|ver|listar|busca|buscar|consultar)/.test(t)) return "read";
    if (/(modificar|actualizar|cambiar|editar)/.test(t)) return "update";
    if (/(eliminar|borrar|suprimir)/.test(t)) return "delete";
    if (/(definir entidad|crear entidad|generar tabla|crear tabla)/.test(t))
      return "define_entity";

    return null;
  }

  // -------- Envío de prompt a Deepseek --------
  async enviarPrompt(req, res) {
    try {
      const historico = req.body.messages || [];
      const contenidoFormateado = Array.isArray(historico)
        ? historico
        : [{ role: "user", content: String(historico) }];

      const response = await fetch(apiDeepseek, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKeyDeepseek}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: this.systemPrompt },
            ...contenidoFormateado,
          ],
          temperature: 0.3,
          max_tokens: 1500,
          top_p: 0.95,
        }),
      });

      if (!response.ok) throw new Error(`Error en la API: ${response.status}`);

      const data = await response.json();
      const rawRespuesta = data?.choices?.[0]?.message?.content ?? "";

      let parsed = null;
      try {
        parsed = JSON.parse(rawRespuesta);
      } catch {
        // No es JSON → respuesta normal
      }

      if (parsed?.isCommand && parsed?.entity) {
        const result = await this.routeCommand(parsed, rawRespuesta);

        await ChatMessage.create({
          role: "assistant",
          content: typeof result === "string" ? result : JSON.stringify(result),
          isCommand: true,
        });

        return res.status(200).json({
          success: true,
          isCommand: true,
          result,
        });
      }

      // Respuesta natural
      await ChatMessage.create({
        role: "assistant",
        content: rawRespuesta,
        isCommand: false,
      });

      return res.status(200).json({
        success: true,
        isCommand: false,
        respuesta: marked.parse(rawRespuesta),
        raw: rawRespuesta,
      });
    } catch (error) {
      console.error("Deepseek Error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // -------- Routing de comandos JSON --------
  async routeCommand(cmd, rawText) {
    // Inferir acción si no está definida
    if (!cmd.action && rawText) {
      const inferredAction = this.mapNaturalLanguageAction(rawText);
      if (inferredAction) cmd.action = inferredAction;
    }

    const { action, entity } = cmd;

    if (!action) throw new Error("No se pudo inferir la acción.");
    if (!entity) throw new Error("Entidad no definida.");

    if (action === "define_entity") {
      const schema = cmd.schema || {};
      const Model = await upsertDynamicModel(entity, schema);
      return { message: `Entidad '${Model.name}' definida y sincronizada.` };
    }

    // CRUD: obtener modelo o fallback flexible
    let Model = getDynamicModel(entity);
    if (!Model) Model = await ensureLooseModel(entity);

    switch (action) {
      case "create":
        return await this.genericCreate(Model, cmd);
      case "read":
        return await this.genericRead(Model, cmd);
      case "update":
        return await this.genericUpdate(Model, cmd);
      case "delete":
        return await this.genericDelete(Model, cmd);
      default:
        throw new Error(`Acción no soportada: ${action}`);
    }
  }

  // -------- CRUD genérico --------
  async genericCreate(Model, { data }) {
    if (!data || typeof data !== "object")
      throw new Error("Falta 'data' para create.");
    const created = await Model.create(data);
    return created.toJSON();
  }

  async genericRead(Model, { where, options }) {
    const query = {};
    if (where && typeof where === "object") {
      query.where = {};
      for (const [k, v] of Object.entries(where)) {
        if (typeof v === "string" && v.includes("%")) {
          query.where[k] = { [Op.iLike]: v };
        } else {
          query.where[k] = v;
        }
      }
    }
    if (options && typeof options === "object") {
      const { limit, offset, order } = options;
      if (Number.isInteger(limit)) query.limit = limit;
      if (Number.isInteger(offset)) query.offset = offset;
      if (Array.isArray(order)) query.order = order;
    }
    const rows = await Model.findAll(query);
    return rows.map((r) => r.toJSON());
  }

  async genericUpdate(Model, { data, where }) {
    if (!data || typeof data !== "object")
      throw new Error("Falta 'data' para update.");
    if (!where || typeof where !== "object")
      throw new Error("Falta 'where' para update.");
    const [count] = await Model.update(data, { where });
    return { updated: count };
  }

  async genericDelete(Model, { where }) {
    if (!where || typeof where !== "object")
      throw new Error("Falta 'where' para delete.");
    const deleted = await Model.destroy({ where });
    return { deleted };
  }

  // -------- Historial de chat -----------
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
