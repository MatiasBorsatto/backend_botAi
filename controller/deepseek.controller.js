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
  async getChatHistory(req, res) {
    try {
      const messages = await ChatMessage.findAll({
        order: [["createdAt", "ASC"]],
      });

      res.status(200).json({
        success: true,
        messages: messages,
      });
    } catch (error) {
      console.error("Error al obtener el historial:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async enviarPrompt(req, res) {
    try {
      const historico = req.body.messages;
      const ultimoMensaje =
        historico[historico.length - 1].content.toLowerCase();

      const sistemaContext = {
        role: "system",
        content: `Eres un asistente que ayuda a gestionar contactos. 
        Para guardar contactos, pide la siguiente información: nombre, teléfono, email (opcional), dirección (opcional) y notas (opcional).
        Para buscar contactos, pide el nombre o teléfono del contacto.`,
      };

      // Detectar intención de gestión de contactos
      if (ultimoMensaje.includes("guardar contacto")) {
        return await this.iniciarGuardadoContacto(res);
      }

      if (ultimoMensaje.includes("buscar contacto")) {
        return await this.buscarContacto(ultimoMensaje, res);
      }

      // Procesar datos de contacto si el mensaje contiene la información
      if (this.esRespuestaContacto(ultimoMensaje)) {
        return await this.procesarDatosContacto(ultimoMensaje, res);
      }

      const contenidoFormateado = historico.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      await ChatMessage.create({
        role: "user",
        content: historico[historico.length - 1].content,
      });

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
      console.log("Respuesta cruda DeepSeek:", JSON.stringify(data, null, 2));

      const rawRespuesta = data.choices[0].message.content; // texto plano
      const htmlRespuesta = marked.parse(rawRespuesta); // para la UI

      res.status(200).json({
        mensaje: "Se envió correctamente el prompt",
        respuesta: htmlRespuesta, // se muestra en pantalla
        raw: rawRespuesta, // se guarda para el histórico
      });

      await ChatMessage.create({
        role: "assistant",
        content: rawRespuesta,
      });
    } catch (error) {
      console.error("Error al enviar el prompt:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async iniciarGuardadoContacto(res) {
    const respuesta =
      "Por favor, proporciona los siguientes datos del contacto:\n" +
      "- Nombre (obligatorio)\n" +
      "- Teléfono (obligatorio)\n" +
      "- Email (opcional)\n" +
      "- Dirección (opcional)\n" +
      "- Notas (opcional)";

    res.status(200).json({
      mensaje: "Iniciando guardado de contacto",
      respuesta: marked.parse(respuesta),
      raw: respuesta,
    });
  }

  async buscarContacto(mensaje, res) {
    const termino = mensaje.replace("buscar contacto", "").trim();

    const contactos = await Contacto.findAll({
      where: sequelize.or(
        { nombre: { [Op.iLike]: `%${termino}%` } },
        { telefono: { [Op.iLike]: `%${termino}%` } }
      ),
    });

    const respuesta =
      contactos.length > 0
        ? `Encontré los siguientes contactos:\n${contactos
            .map(
              (c) =>
                `\n- Nombre: ${c.nombre}\n  Teléfono: ${c.telefono}\n  Email: ${
                  c.email || "No especificado"
                }`
            )
            .join("\n")}`
        : "No encontré ningún contacto con esos datos.";

    res.status(200).json({
      mensaje: "Búsqueda completada",
      respuesta: marked.parse(respuesta),
      raw: respuesta,
    });
  }

  esRespuestaContacto(mensaje) {
    return (
      mensaje.includes("nombre:") ||
      mensaje.includes("teléfono:") ||
      mensaje.includes("telefono:")
    );
  }

  async procesarDatosContacto(mensaje, res) {
    const datos = {};
    const lineas = mensaje.split("\n");

    lineas.forEach((linea) => {
      if (linea.toLowerCase().includes("nombre:"))
        datos.nombre = linea.split(":")[1].trim();
      if (
        linea.toLowerCase().includes("telefono:") ||
        linea.toLowerCase().includes("teléfono:")
      )
        datos.telefono = linea.split(":")[1].trim();
      if (linea.toLowerCase().includes("email:"))
        datos.email = linea.split(":")[1].trim();
      if (
        linea.toLowerCase().includes("direccion:") ||
        linea.toLowerCase().includes("dirección:")
      )
        datos.direccion = linea.split(":")[1].trim();
      if (linea.toLowerCase().includes("notas:"))
        datos.notas = linea.split(":")[1].trim();
    });

    if (!datos.nombre || !datos.telefono) {
      const respuesta =
        "Por favor, asegúrate de proporcionar al menos el nombre y teléfono del contacto.";
      return res.status(200).json({
        mensaje: "Datos incompletos",
        respuesta: marked.parse(respuesta),
        raw: respuesta,
      });
    }

    try {
      const nuevoContacto = await Contacto.create(datos);
      const respuesta = `Contacto guardado exitosamente:\n\nNombre: ${datos.nombre}\nTeléfono: ${datos.telefono}`;

      res.status(200).json({
        mensaje: "Contacto guardado",
        respuesta: marked.parse(respuesta),
        raw: respuesta,
      });
    } catch (error) {
      console.error("Error al guardar contacto:", error);
      res.status(500).json({
        mensaje: "Error al guardar contacto",
        error: error.message,
      });
    }
  }
}

export default new PromptDeepseek();
