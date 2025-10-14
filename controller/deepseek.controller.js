import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

const apiGroq = process.env.APIDEEPSEEK;
const apiKeyGroq = process.env.APIKEYDEEPSEEK;

class PromptDeepseek {
  async enviarPrompt(req, res) {
    try {
      const historico = req.body.messages;

      if (!historico || !Array.isArray(historico) || historico.length === 0) {
        return res.status(400).json({
          error: "Se requiere un array de mensajes válido",
        });
      }

      if (!apiKeyGroq) {
        return res.status(500).json({
          error: "API Key no configurada",
        });
      }

      console.log("\n=== MENSAJES RECIBIDOS ===");
      console.log("Cantidad:", historico.length);

      // Validar y limpiar mensajes
      const mensajesValidos = historico
        .filter((msg) => {
          // Verificar que tenga role y content
          if (!msg.role || !msg.content) {
            console.warn("Mensaje sin role o content:", msg);
            return false;
          }

          // Verificar que role sea válido
          if (!["system", "user", "assistant"].includes(msg.role)) {
            console.warn("Role inválido:", msg.role);
            return false;
          }

          // Verificar que content sea string
          if (typeof msg.content !== "string") {
            console.warn("Content no es string:", typeof msg.content);
            return false;
          }

          return true;
        })
        .map((msg, index) => {
          const cleanContent = msg.content.trim();

          // Logging para debug
          console.log(
            `Mensaje ${index} [${msg.role}]:`,
            cleanContent.substring(0, 80) + "..."
          );

          return {
            role: msg.role,
            content: cleanContent,
          };
        });

      if (mensajesValidos.length === 0) {
        return res.status(400).json({
          error: "No hay mensajes válidos para procesar",
        });
      }

      // Limitar historial (mantener system + últimos 20 mensajes)
      let mensajesLimitados = mensajesValidos;
      if (mensajesValidos.length > 21) {
        const systemMessage = mensajesValidos.find((m) => m.role === "system");
        const otrosMensajes = mensajesValidos.filter(
          (m) => m.role !== "system"
        );
        const mensajesRecientes = otrosMensajes.slice(-20);

        mensajesLimitados = systemMessage
          ? [systemMessage, ...mensajesRecientes]
          : mensajesRecientes;

        console.log(
          `Historial reducido de ${mensajesValidos.length} a ${mensajesLimitados.length} mensajes`
        );
      }

      const requestBody = {
        model: "llama-3.3-70b-versatile",
        messages: mensajesLimitados,
        tool_choice: "none", // Agregar esta línea
        tools: [], // Agregar esta línea
      };

      // Calcular tamaño aproximado en tokens (4 caracteres ≈ 1 token)
      const totalChars = mensajesLimitados.reduce(
        (sum, msg) => sum + msg.content.length,
        0
      );
      const tokensAprox = Math.ceil(totalChars / 4);

      console.log("\n=== INFO DEL REQUEST ===");
      console.log("Mensajes a enviar:", mensajesLimitados.length);
      console.log("Caracteres totales:", totalChars);
      console.log("Tokens aproximados:", tokensAprox);
      console.log("Tamaño JSON:", JSON.stringify(requestBody).length, "bytes");

      if (tokensAprox > 6000) {
        console.warn("⚠️ ADVERTENCIA: Cerca del límite de tokens");
      }

      const response = await fetch(apiGroq, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKeyGroq}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("\n=== RESPUESTA DE GROQ ===");
      console.log("Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;

        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { raw: errorText };
        }

        console.error("❌ ERROR DE GROQ:");
        console.error(JSON.stringify(errorData, null, 2));

        let errorMessage = "Error en la API de Groq";

        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        } else if (response.status === 400) {
          errorMessage =
            "Solicitud inválida. Verifica el formato de los mensajes.";
        } else if (response.status === 401) {
          errorMessage = "API Key inválida";
        } else if (response.status === 429) {
          errorMessage = "Límite de rate alcanzado";
        }

        return res.status(response.status).json({
          error: errorMessage,
          detalles: errorData?.error?.message || errorText.substring(0, 200),
          debug: {
            mensajesEnviados: mensajesLimitados.length,
            tokensAproximados: tokensAprox,
          },
        });
      }

      const data = await response.json();
      console.log("✅ Respuesta exitosa");

      if (!data.choices?.[0]?.message?.content) {
        console.error("Estructura de respuesta inesperada:", data);
        throw new Error("Respuesta inválida del servidor");
      }

      const rawRespuesta = data.choices[0].message.content;
      const htmlRespuesta = marked.parse(rawRespuesta);

      console.log(
        "Respuesta generada:",
        rawRespuesta.substring(0, 100) + "...\n"
      );

      res.status(200).json({
        mensaje: "Se envió correctamente el prompt",
        respuesta: htmlRespuesta,
        raw: rawRespuesta,
      });
    } catch (error) {
      console.error("\n=== ERROR EN CONTROLADOR ===");
      console.error("Tipo:", error.constructor.name);
      console.error("Mensaje:", error.message);
      console.error("Stack:", error.stack);

      res.status(500).json({
        error: error.message,
        tipo: error.constructor.name,
      });
    }
  }
}

export default new PromptDeepseek();
