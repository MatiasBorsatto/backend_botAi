import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { marked } from "marked";

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

const apiDeepseek = process.env.APIDEEPSEEK;
const apiKeyDeepseek = process.env.APIKEYDEEPSEEK;

class PromptDeepseek {
  async enviarPrompt(req, res) {
    try {
      const historico = req.body.messages;

      const contenidoFormateado = historico.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch(apiDeepseek, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKeyDeepseek}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: contenidoFormateado,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Respuesta cruda DeepSeek:", JSON.stringify(data, null, 2));

      const rawRespuesta = data.choices[0].message.content; // texto plano
      const htmlRespuesta = marked.parse(rawRespuesta); // para la UI

      res.status(200).json({
        mensaje: "Se envió correctamente el prompt",
        respuesta: htmlRespuesta, // se muestra en pantalla
        raw: rawRespuesta, // se guarda para el histórico
      });
    } catch (error) {
      console.error("Error al enviar el prompt:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new PromptDeepseek();
