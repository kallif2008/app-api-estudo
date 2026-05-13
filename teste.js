import express from "express";
import multer from "multer";
import cors from "cors";
import { nodewhisper } from "nodejs-whisper";
import ffmpeg from "fluent-ffmpeg";
import fs from "node:fs";
import path from "node:path";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  let inputPath = null;
  let wavPath = null;
  let jsonPath = null;

  try {
    if (!req.file)
      return res.status(400).json({ error: "Nenhum arquivo recebido" });

    inputPath = req.file.path;
    wavPath = `${inputPath}.wav`;
    jsonPath = `${wavPath}.json`;

    console.log("📁 Recebido:", req.file.originalname);

    // 1. Converter para WAV
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFrequency(16000)
        .audioChannels(1)
        .format("wav")
        .on("end", resolve)
        .on("error", reject)
        .save(wavPath);
    });

    console.log("✅ WAV criado");

    // 2. Chamar whisper-cli diretamente (sem depender do retorno da lib)
    const absoluteWavPath = path.resolve(wavPath);

    await nodewhisper(absoluteWavPath, {
      modelName: "base",
      autoDownloadModelName: "base",
      verbose: false,
      whisperOptions: {
        outputInJsonFull: true,
        language: "pt",
      },
    });

    console.log("✅ Whisper terminou");

    // 3. Ler o arquivo JSON que foi gerado
    if (!fs.existsSync(jsonPath)) {
      throw new Error("JSON não foi gerado pelo Whisper");
    }

    const rawJson = fs.readFileSync(jsonPath, "utf-8");
    const data = JSON.parse(rawJson);
    console.log("data", data.transcription);

    const responseData = {
      success: true,
      text: data.transcription || "",
      segments: data.segments || [],
    };

    console.log(
      "✅ Transcrição enviada com sucesso! Segmentos:",
      responseData.segments.length,
    );

    res.json(responseData);
  } catch (error) {
    console.error("❌ Erro:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Erro interno" });
    }
  } finally {
    // Limpeza
    setTimeout(() => {
      [inputPath, wavPath, jsonPath].forEach((p) => {
        if (p && fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch (_) {}
        }
      });
    }, 2000);
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
