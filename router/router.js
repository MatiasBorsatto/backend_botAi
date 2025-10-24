import express from "express";
import Prompt from "../controller/ai.controller.js";
import authController from "../controller/auth.controller.js";

const router = express.Router();

//Manejo de rutas para registro / login de usuarios
router.post("/login", authController.login);
router.post("/register", authController.register);

//Manejo de rutas para logica de negocio en cuanto a interaccion con la ia
router.post("/prompt", Prompt.enviarPrompt);
router.post("/guardar", Prompt.guardarContacto);
router.get("/obtener-contactos", Prompt.obtenerContactos);

//router.get("/chat-history", Prompt.getChatHistory);

export default router;
