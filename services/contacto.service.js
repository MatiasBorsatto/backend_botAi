import Contacto from "../models/contacto.model.js";
import { Op } from "sequelize";

class ContactoService {
  async guardarContacto(datos) {
    try {
      // Validación básica de datos
      if (!datos || !Array.isArray(datos)) {
        throw new Error("Se espera un array de contactos");
      }

      // Procesar cada contacto en el array
      const resultados = await Promise.all(
        datos.map(async (contacto) => {
          // Validar campos requeridos
          if (!contacto.name || !contacto.email) {
            throw new Error("Nombre y email son campos requeridos");
          }

          // Crear el contacto usando build y save por separado
          const nuevoContacto = Contacto.build({
            name: contacto.name,
            email: contacto.email,
            phone: contacto.phone || null,
          });

          // Validar antes de guardar
          await nuevoContacto.validate();

          // Guardar el contacto
          return await nuevoContacto.save();
        })
      );

      if (!resultados || resultados.length === 0) {
        throw new Error("No se pudo crear ningún contacto");
      }

      return resultados;
    } catch (error) {
      console.error("Error en ContactoService.guardarContacto:", error);
      throw error;
    }
  }

  async obtenerContactos() {
    try {
      return await Contacto.findAll();
    } catch (error) {
      console.error("Error en ContactoService.obtenerContactos:", error);
      throw error;
    }
  }

  async actualizarContacto(datos) {
    try {
      if (!datos || !Array.isArray(datos)) {
        throw new Error("Se espera un array de contactos");
      }

      const resultados = await Promise.all(
        datos.map(async (contacto) => {
          if (!contacto.name) {
            throw new Error(
              "El nombre es requerido para identificar el contacto"
            );
          }

          // Buscar el contacto por nombre
          const contactoExistente = await Contacto.findOne({
            where: { name: { [Op.iLike]: contacto.name } },
          });

          if (!contactoExistente) {
            throw new Error(`Contacto "${contacto.name}" no encontrado`);
          }

          // Actualizar solo los campos proporcionados
          const camposActualizar = {};
          if (contacto.email) camposActualizar.email = contacto.email;
          if (contacto.phone !== undefined)
            camposActualizar.phone = contacto.phone;

          await contactoExistente.update(camposActualizar);

          return contactoExistente;
        })
      );

      return resultados;
    } catch (error) {
      console.error("Error en ContactoService.actualizarContacto:", error);
      throw error;
    }
  }

  async eliminarContacto(datos) {
    try {
      if (!datos || !Array.isArray(datos)) {
        throw new Error("Se espera un array de contactos");
      }

      const resultados = await Promise.all(
        datos.map(async (contacto) => {
          if (!contacto.name) {
            throw new Error("El nombre es requerido para eliminar el contacto");
          }

          // Buscar el contacto por nombre
          const contactoExistente = await Contacto.findOne({
            where: { name: { [Op.iLike]: contacto.name } },
          });

          if (!contactoExistente) {
            throw new Error(`Contacto "${contacto.name}" no encontrado`);
          }

          const nombreEliminado = contactoExistente.name;
          await contactoExistente.destroy();

          return {
            nombre: nombreEliminado,
            mensaje: "Contacto eliminado exitosamente",
          };
        })
      );

      return resultados;
    } catch (error) {
      console.error("Error en ContactoService.eliminarContacto:", error);
      throw error;
    }
  }
}

export default new ContactoService();
