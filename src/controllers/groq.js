import { analisarFraseInglesService, conversarInglesService } from "../services/groq.js";

const analisarFrase = async (req, res) => {
  try {
    const { frase } = req.body;
    const resultado = await analisarFraseInglesService(frase);
    return res.status(200).json(resultado);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: error.message });
  }
};

const conversarIngles = async (req, res) => {
  try {
    const { contexto, mensagens } = req.body;
    const resposta = await conversarInglesService(contexto, mensagens);
    return res.status(200).json({ resposta });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: error.message });
  }
};

export { analisarFrase, conversarIngles };
