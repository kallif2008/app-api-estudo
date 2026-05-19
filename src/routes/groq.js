import { Router } from "express";
import { analisarFrase, conversarIngles } from "../controllers/groq.js";

const groqRouter = Router();

groqRouter.post("/ia/analisar-frase", analisarFrase);
groqRouter.post("/ia/conversar", conversarIngles);

export default groqRouter;
