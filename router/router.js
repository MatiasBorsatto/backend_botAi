import express from "express";
import Prompt from "../controller/ai.controller.js";
import authController from "../controller/auth.controller.js";
import aiController from "../controller/ai.controller.js";
import { verificarToken } from "../middleware/verificarLogin.js";

const router = express.Router();

//Manejo de rutas para registro / login de usuarios
router.post("/login", authController.login);
router.post("/register", authController.register);

//Manejo de rutas para logica de negocio en cuanto a interaccion con la ia
router.post("/prompt", Prompt.enviarPrompt);

//CRUD Contactos
router.post("/guardar", Prompt.guardarContacto);
router.get("/obtener-contactos", Prompt.obtenerContactos);
router.put("/actualizar", Prompt.actualizarContacto);
router.delete("/eliminar", Prompt.eliminarContacto);

router.post("/guardar-contexto", aiController.guardarHistorial);
router.get("/obtener-contexto", aiController.obtenerHistorial);
router.delete("/borrar-contexto", aiController.eliminarContexto);

export default router;
