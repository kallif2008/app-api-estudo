import Frases from "../models/frases.js";
import { salvarAudio, deletarAudioService } from "./audio.js";
import { parseTextoParaFrases } from "../utils/parse.js";
import Audio from "../models/audio.js";
import { translate } from "@vitalets/google-translate-api";
import { transcreverAudioComTimestamps } from "./transcricaoAudio.js";

const criarFraseService = async (body, files) => {
  let totalCriadas = 0;

  if (files?.length > 0) {
    const audioId = await salvarAudio(files);

    await Audio.create({
      idLicao: body.idLicao,
      idAudio: audioId,
    });

    const { segmentos } = await transcreverAudioComTimestamps(files[0]);

    if (segmentos.length > 0) {
      for (const segmento of segmentos) {
        await Frases.create({
          idLicao: body.idLicao,
          frase: segmento.frase,
          inicioAudio: segmento.inicioAudio,
          fimAudio: segmento.fimAudio,
        });

        totalCriadas += 1;
      }

      return totalCriadas > 0;
    }
  }

  const frases = parseTextoParaFrases(body.frase);

  for (const frase of frases) {
    await Frases.create({
      idLicao: body.idLicao,
      frase,
      inicioAudio: 0,
      fimAudio: 0,
    });

    totalCriadas += 1;
  }

  return totalCriadas > 0;
};

const listarFrasesPorLicaoService = async (idLicao) => {
  const frases = await Frases.find({ idLicao }).sort({ createdAt: 1 });
  const audio = await Audio.findOne({ idLicao });

  return {
    frases,
    audioUrl: audio ? `${process.env.API_URL}/audios/${audio.idAudio}` : null,
  };
};

const deletarFraseService = async (fraseId) => {
  const fraseExistente = await Frases.findById(fraseId);

  if (!fraseExistente) {
    throw new Error("Frase não encontrada");
  }

  const audioId = fraseExistente.audio;
  await deletarAudioService(audioId);

  await Frases.findByIdAndDelete(fraseId);

  return { message: "Frase removida com sucesso" };
};

const atualizarFraseService = async (fraseId, data) => {
  const fraseExistente = await Frases.findById(fraseId);

  if (data.traducao === "" || !data.traducao) {
    data.traducao = (await translate(data.frase, { to: data.idioma })).text;
  }

  if (!fraseExistente) {
    throw new Error("Frase não encontrada");
  }

  return Frases.findByIdAndUpdate(fraseId, data, { new: true });
};

export {
  criarFraseService,
  listarFrasesPorLicaoService,
  deletarFraseService,
  atualizarFraseService,
};
