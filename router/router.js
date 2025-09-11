import express from "express";
import Prompt from "../controller/ia.controller.js";

const router = express.Router();

router.post("/", Prompt.enviarPrompt);

export default router;
