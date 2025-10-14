import express from "express";
import PromptGemini from "../controller/gemini.controller.js";
import PromptDeepseek from "../controller/deepseek.controller.js";

const router = express.Router();

//router.post("/gemini", PromptGemini.enviarPrompt);
router.post("/deepseek", PromptDeepseek.enviarPrompt);
router.post("/guardar", PromptDeepseek.guardarContacto);
//router.get("/chat-history", PromptDeepseek.getChatHistory);

export default router;
