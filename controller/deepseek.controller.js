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
        parts: [
          {
            text: msg.content,
          },
        ],
      }));

      const response = await fetch(apiDeepseek, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKeyDeepseek,
        },
        body: JSON.stringify({
          model: "deepseek-r1-distill-llama-70b",
          contents: contenidoFormateado,
          temperature: 0.6,
          max_completion_tokens: 4096,
          top_p: 0.95,
          stream: false,
          stop: null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const textoRespuesta = marked.parse(data.choices[0].message[0].content);

      res.status(200).json({
        mensaje: "Se envió correctamente el prompt",
        respuesta: textoRespuesta,
      });
    } catch (error) {
      console.error("Error al enviar el prompt:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new PromptDeepseek();
