import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { marked } from "marked";

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

const apiGemini = process.env.APIGEMINI;
const apiKey = process.env.APIKEYGEMINI;

class Prompt {
  async enviarPrompt(req, res) {
    try {
      const response = await fetch(apiGemini, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: req.body.content, // Asumiendo que el prompt viene en req.body.prompt
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const textoRespuesta = marked.parse(
        data.candidates[0].content.parts[0].text
      );

      res.status(200).json({
        mensaje: "Se envió correctamente el prompt",
        respuesta: textoRespuesta,
        prompt: req.body.prompt,
      });
    } catch (error) {
      console.error("Error al enviar el prompt:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new Prompt();
