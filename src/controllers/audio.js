import { streamAudioService } from "../services/audio.js";
import { atualizarAudio } from "../services/audio.js";

const streamAudio = async (req, res) => {
  try {
    console.log("aqui");

    await streamAudioService(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
};

const atualizarAudioController = async (req, res) => {
  const { idLicao } = req.params;
  const files = req.files;
  try {
    await atualizarAudio(idLicao, files);
    res.status(200).json({ message: "Áudio atualizado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar o áudio" });
  }
};

export { streamAudio, atualizarAudioController };
