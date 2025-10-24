import Usuario from "../models/usuario.model.js";

class ContactoService {
  async login(email) {
    try {
      return await Usuario.findOne({ where: { email } });
    } catch (error) {
      console.error("Error al loguearse:", error);
      throw error;
    }
  }

  async register(datos) {
    try {
      return await Usuario.create(datos);
    } catch (error) {
      console.error("Error al crear usuario:", error);
      throw error;
    }
  }
}

export default new ContactoService();
