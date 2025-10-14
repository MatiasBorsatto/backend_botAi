import Contacto from "../models/contacto.model.js";

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
}

export default new ContactoService();
