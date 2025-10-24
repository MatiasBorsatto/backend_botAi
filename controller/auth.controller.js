import authService from "../services/auth.service.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

class AuthController {
  async login(req, res) {
    const { email, password } = req.body;

    try {
      // Buscar usuario
      const usuario = await authService.login(email);

      if (!usuario) {
        return res.status(401).json({ error: "El usuario no existe" });
      }

      // Comparar contraseña
      const match = await bcrypt.compare(password, usuario.password_hash);

      if (!match) {
        return res.status(401).json({ error: "Contraseña incorrecta" });
      }

      // Generar token
      const token = jwt.sign(
        { id: usuario.id, email: usuario.email },
        JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );

      // Responder con token
      res.json({ message: "Login correcto!", token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error en el servidor" });
    }
  }

  async register(req, res) {
    try {
      const { email, password } = req.body;

      // Verificar si el email ya existe
      const usuarioExistente = await authService.login(email);
      if (usuarioExistente) {
        return res.status(409).json({
          error: "El email ya se encuentra registrado. Intente con otro.",
        });
      }

      // Hashear la contraseña
      const password_hash = await bcrypt.hash(password, 10);

      // Registrar usuario nuevo
      const nuevoUsuario = await authService.register({
        email,
        password_hash,
      });

      return res.status(201).json({
        mensaje: "Usuario registrado correctamente",
        usuario: {
          id: nuevoUsuario.id,
          email: nuevoUsuario.email,
        },
      });
    } catch (error) {
      console.error("Error registrando usuario:", error);
      return res.status(500).json({
        error: "Error interno al registrar el usuario",
        detalles: error.message,
      });
    }
  }
}

export default new AuthController();
