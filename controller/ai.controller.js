import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { marked } from "marked";
import contactoService from "../services/contacto.service.js";
import usuarioService from "../services/usuario.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

const apiGroq = process.env.APIGROQ;
const apiKeyGroq = process.env.APIKEYGROQ;
const apiKeyGroqTest = process.env.APIKEYGROQTEST;
const urlBaseServer = process.env.BASE_URL || "http://localhost:3000";

class Prompt {
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

      const requestBody = {
        model: "llama-3.3-70b-versatile",
        messages: mensajesValidos,
        tool_choice: "none", // Agregar esta línea
        tools: [], // Agregar esta línea
      };

      console.log("\n=== INFO DEL REQUEST ===");
      console.log("Mensajes a enviar:", mensajesValidos.length);
      console.log("Tamaño JSON:", JSON.stringify(requestBody).length, "bytes");

      const response = await fetch(apiGroq, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKeyGroqTest}`,
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
            mensajesEnviados: mensajesValidos.length,
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
      console.log(rawRespuesta);
      const htmlRespuesta =
        typeof rawRespuesta === "object"
          ? rawRespuesta
          : marked.parse(rawRespuesta);

      console.log(
        "Respuesta generada:",
        rawRespuesta.substring(0, 100) + "...\n"
      );

      function isValidJsonString(str) {
        try {
          const parsed = JSON.parse(str);
          return typeof parsed === "object" && parsed !== null;
        } catch (e) {
          return false;
        }
      }

      if (isValidJsonString(rawRespuesta)) {
        console.log(rawRespuesta);
        const parsedResponse = JSON.parse(rawRespuesta);
        console.log(parsedResponse.operation);
        switch (parsedResponse.operation) {
          case "POST":
            try {
              const infoContacto = await fetch(`${urlBaseServer}/api/guardar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsedResponse.contacts),
              });

              if (!infoContacto.ok) {
                throw new Error(
                  `Error al guardar contacto: ${infoContacto.statusText}`
                );
              }

              const resultado = await infoContacto.json();

              return res.status(200).json({
                mensaje: "Contacto guardado exitosamente",
                contacto: resultado,
                respuesta: rawRespuesta,
                raw: parsedResponse,
              });
            } catch (error) {
              console.error("Error al guardar contacto:", error);
              return res.status(500).json({
                error: "Error al procesar/guardar el contacto",
                detalles: error.message,
              });
            }

          case "GET":
            try {
              const infoContacto = await fetch(
                `${urlBaseServer}/api/obtener-contactos`,
                {
                  method: "GET",
                  headers: { "Content-Type": "application/json" },
                }
              );

              if (!infoContacto.ok) {
                throw new Error(
                  `Error al obtener contactos: ${infoContacto.statusText}`
                );
              }

              const resultado = await infoContacto.json();

              const respuestaReal = {
                operation: "GET",
                contacts: resultado.contacto || [], // ✅ Usar datos de la BD
                reason:
                  resultado.contacto && resultado.contacto.length > 0
                    ? "Contactos encontrados"
                    : "No hay contactos guardados",
              };

              return res.status(200).json({
                mensaje: "Contactos obtenidos exitosamente",
                respuesta: JSON.stringify(respuestaReal),
                raw: respuestaReal,
              });
            } catch (error) {
              console.error("Error al obtener los contactos:", error);
              return res.status(500).json({
                error: "Error al obtener los contactos",
                detalles: error.message,
              });
            }

          // Agregar estos casos en el switch de parsedResponse.operation

          case "PUT":
            try {
              const infoContacto = await fetch(
                `${urlBaseServer}/api/actualizar`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(parsedResponse.contacts),
                }
              );

              if (!infoContacto.ok) {
                throw new Error(
                  `Error al actualizar contacto: ${infoContacto.statusText}`
                );
              }

              const resultado = await infoContacto.json();

              return res.status(200).json({
                mensaje: "Contacto actualizado exitosamente",
                contacto: resultado,
                respuesta: rawRespuesta,
                raw: parsedResponse,
              });
            } catch (error) {
              console.error("Error al actualizar contacto:", error);
              return res.status(500).json({
                error: "Error al actualizar el contacto",
                detalles: error.message,
              });
            }

          case "DELETE":
            try {
              const infoContacto = await fetch(
                `${urlBaseServer}/api/eliminar`,
                {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(parsedResponse.contacts),
                }
              );

              if (!infoContacto.ok) {
                throw new Error(
                  `Error al eliminar contacto: ${infoContacto.statusText}`
                );
              }

              const resultado = await infoContacto.json();

              return res.status(200).json({
                mensaje: "Contacto eliminado exitosamente",
                resultado: resultado,
                respuesta: rawRespuesta,
                raw: parsedResponse,
              });
            } catch (error) {
              console.error("Error al eliminar contacto:", error);
              return res.status(500).json({
                error: "Error al eliminar el contacto",
                detalles: error.message,
              });
            }

          default:
            return res.status(400).json({
              error: "Operación no soportada",
              operation: parsedResponse.operation,
            });
        }
      }

      return res.status(200).json({
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

  async guardarContacto(req, res) {
    try {
      const contactoData = req.body;
      console.log("Datos recibidos:", contactoData);

      // Validar campos requeridos
      if (!contactoData || typeof contactoData !== "object") {
        return res.status(400).json({
          error: "Datos de contacto inválidos",
        });
      }

      // Llamar al servicio para guardar el contacto
      const nuevoContacto = await contactoService.guardarContacto(contactoData);

      return res.status(201).json({
        mensaje: "Contacto guardado correctamente",
        contacto: nuevoContacto,
      });
    } catch (error) {
      console.error("Error guardando contacto:", error);
      return res.status(500).json({
        error: "Error al guardar el contacto",
        detalles: error.message,
      });
    }
  }

  async obtenerContactos(req, res) {
    try {
      const contactosObtenidos = await contactoService.obtenerContactos();

      return res.status(200).json({
        mensaje: "Contactos obtenidos correctamente",
        contacto: contactosObtenidos,
      });
    } catch (error) {
      console.error("Error obteniendo contactos:", error);
      return res.status(500).json({
        error: "Error al obtener contactos",
        detalles: error.message,
      });
    }
  }

  async guardarHistorial(req, res) {
    try {
      const mensajes = Array.isArray(req.body) ? req.body : req.body.messages;
      const usuario_id = req.headers.usuario;
      const id_chat = req.body.id_chat || null;

      if (!mensajes || !Array.isArray(mensajes) || mensajes.length === 0) {
        return res.status(400).json({
          error: "No hay mensajes válidos para guardar",
        });
      }

      const titulo =
        mensajes.find((m) => m.role === "user")?.content?.slice(0, 50) ||
        "Nuevo chat";

      const historial = {
        titulo,
        historial: mensajes,
        usuario_id,
      };

      // ✅ Si ya existe un chat activo → actualizar
      if (id_chat) {
        const chatActualizado = await usuarioService.actualizarHistorial(
          id_chat,
          mensajes
        );

        return res.status(200).json({
          mensaje: "Historial actualizado correctamente",
          id_chat: chatActualizado.id_chat,
        });
      }

      // 🆕 Si no existe → crear nuevo
      const nuevoChat = await usuarioService.guardarHistorial(historial);

      return res.status(201).json({
        mensaje: "Nuevo historial creado correctamente",
        id_chat: nuevoChat.id_chat,
      });
    } catch (error) {
      console.error("Error guardando conversación:", error);
      return res.status(500).json({
        error: "Error al guardar la conversación",
        detalles: error.message,
      });
    }
  }

  async obtenerHistorial(req, res) {
    try {
      const usuario_id = req.headers.usuario;

      const contexto = await usuarioService.obtenerHistorialPorUsuario(
        usuario_id
      );

      return res.status(201).json({
        mensaje: "Historiales obtenidos correctamente",
        historiales: contexto,
      });
    } catch (error) {
      console.error("Error guardando conversacion:", error);
      return res.status(500).json({
        error: "Error al obtener el historial",
        detalles: error.message,
      });
    }
  }

  // Agregar estos métodos a tu clase Prompt existente

  async actualizarContacto(req, res) {
    try {
      const contactoData = req.body;
      console.log("Datos recibidos para actualizar:", contactoData);

      // Validar campos requeridos
      if (!contactoData || typeof contactoData !== "object") {
        return res.status(400).json({
          error: "Datos de contacto inválidos",
        });
      }

      // Llamar al servicio para actualizar el contacto
      const contactoActualizado = await contactoService.actualizarContacto(
        contactoData
      );

      return res.status(200).json({
        mensaje: "Contacto actualizado correctamente",
        contacto: contactoActualizado,
      });
    } catch (error) {
      console.error("Error actualizando contacto:", error);
      return res.status(500).json({
        error: "Error al actualizar el contacto",
        detalles: error.message,
      });
    }
  }

  async eliminarContacto(req, res) {
    try {
      const contactoData = req.body;
      console.log("Datos recibidos para eliminar:", contactoData);

      // Validar campos requeridos
      if (!contactoData || typeof contactoData !== "object") {
        return res.status(400).json({
          error: "Datos de contacto inválidos",
        });
      }

      // Llamar al servicio para eliminar el contacto
      const resultado = await contactoService.eliminarContacto(contactoData);

      return res.status(200).json({
        mensaje: "Contacto eliminado correctamente",
        resultado: resultado,
      });
    } catch (error) {
      console.error("Error eliminando contacto:", error);
      return res.status(500).json({
        error: "Error al eliminar el contacto",
        detalles: error.message,
      });
    }
  }

  async eliminarContexto(req, res) {
    try {
      const { chat_id } = req.body;

      console.log("Intentando eliminar chat:", chat_id); // ✅ Debug

      if (!chat_id) {
        return res.status(400).json({
          error: "chat_id es requerido",
        });
      }

      const resultado = await usuarioService.eliminarHistorial(chat_id);

      return res.status(200).json({
        mensaje: "Chat eliminado correctamente",
        resultado: resultado,
      });
    } catch (error) {
      console.error("Error eliminando chat:", error);
      return res.status(500).json({
        error: "Error al eliminar el chat",
        detalles: error.message,
      });
    }
  }
}

export default new Prompt();
