import express from "express";
import Prompt from "../controller/ai.controller.js";

const router = express.Router();

router.post("/prompt", Prompt.enviarPrompt);
router.post("/guardar", Prompt.guardarContacto);
router.get("/obtener-contactos", Prompt.obtenerContactos);
//router.get("/chat-history", Prompt.getChatHistory);

export default router;
