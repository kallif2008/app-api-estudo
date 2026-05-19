import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import ffmpeg from "fluent-ffmpeg";
import { nodewhisper } from "nodejs-whisper";

if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

const normalizarSegmentos = (segments = []) =>
  segments
    .map((segmento) => {
      const rawText = segmento.text || "";
      const withoutBrackets = rawText.replace(/^\[|\]$/g, "");
      const normalized = withoutBrackets
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .trim()
        .toUpperCase();

      if (normalized === "MUSICA") {
        return;
      }

      return {
        frase: rawText.trim(),
        inicioAudio: Number(segmento.offsets.from ?? 0),
        fimAudio: Number(segmento.offsets.to ?? 0),
      };
    })
    .filter((v) => !!v);

const transcreverComWhisper = async (wavPath, modelName) => {
  await nodewhisper(path.resolve(wavPath), {
    modelName,
    autoDownloadModelName: modelName,
    verbose: false,
    whisperOptions: {
      outputInJsonFull: true,
    },
  });
};

const transcreverAudioComTimestamps = async (file) => {
  if (!file?.buffer) {
    throw new Error("Arquivo de audio invalido para transcricao");
  }

  const baseName = `audio-${Date.now()}-${randomUUID()}`;
  const inputPath = path.join(os.tmpdir(), baseName);
  const wavPath = `${inputPath}.wav`;
  const jsonPath = `${wavPath}.json`;

  try {
    await fs.promises.writeFile(inputPath, file.buffer);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFrequency(16000)
        .audioChannels(1)
        .format("wav")
        .on("end", resolve)
        .on("error", reject)
        .save(wavPath);
    });

    const configuredModel = process.env.WHISPER_MODEL || "base";

    try {
      await transcreverComWhisper(wavPath, configuredModel);
    } catch (error) {
      if (configuredModel === "tiny") {
        throw error;
      }

      await transcreverComWhisper(wavPath, "tiny");
    }

    if (!fs.existsSync(jsonPath)) {
      throw new Error("JSON de transcricao nao foi gerado");
    }

    const rawJson = await fs.promises.readFile(jsonPath, "utf-8");
    const data = JSON.parse(rawJson);

    return normalizarSegmentos(data.transcription);
  } finally {
    const arquivosTemporarios = [inputPath, wavPath, jsonPath];

    await Promise.all(
      arquivosTemporarios.map(async (arquivo) => {
        try {
          await fs.promises.unlink(arquivo);
        } catch {
          // Ignora erro de limpeza de arquivo temporario inexistente.
        }
      }),
    );
  }
};

export { transcreverAudioComTimestamps };
