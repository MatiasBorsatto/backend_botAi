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
    const maxRetries = 3;
    let retryCount = 0;

    const makeRequest = async () => {
      try {
        const historico = req.body.messages;
        const contenidoFormateado = historico.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        }));

        const response = await fetch(apiGemini, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: contenidoFormateado,
            generationConfig: {
              candidateCount: 1,
            },
          }),
        });

        if (!response.ok) {
          if (response.status === 503 && retryCount < maxRetries) {
            retryCount++;
            const delay = Math.pow(2, retryCount) * 1000; // Backoff exponencial
            await new Promise((resolve) => setTimeout(resolve, delay));
            return makeRequest();
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const textoRespuesta = marked.parse(
          data.candidates[0].content.parts[0].text
        );

        return res.status(200).json({
          mensaje: "Se envió correctamente el prompt",
          respuesta: textoRespuesta,
        });
      } catch (error) {
        console.error("Error al enviar el prompt:", error);
        return res.status(500).json({
          error: error.message,
          intentos: retryCount,
        });
      }
    };

    return makeRequest();
  }
}

export default new Prompt();
