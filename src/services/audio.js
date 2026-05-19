import { Readable } from "node:stream";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import ffmpeg from "fluent-ffmpeg";
import { getBucket } from "../config/database.js";
import { transcreverAudioComTimestamps } from "./transcricaoAudio.js";
import Frases from "../models/frases.js";

if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

const comprimirAudio = async (inputPath) => {
  const outputPath = path.join(os.tmpdir(), `audio-comp-${Date.now()}-${randomUUID()}.mp3`);

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioBitrate(64)
      .audioChannels(1)
      .audioFrequency(44100)
      .format("mp3")
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });

  return outputPath;
};

const salvarAudio = async (files, idLicao) => {
  const arquivo = files?.[0];

  if (!arquivo?.buffer) {
    throw new Error("Arquivo de audio invalido");
  }

  const tempInput = path.join(os.tmpdir(), `audio-in-${Date.now()}-${randomUUID()}`);

  try {
    await fs.promises.writeFile(tempInput, arquivo.buffer);

    const compressedPath = await comprimirAudio(tempInput);
    const compressedBuffer = await fs.promises.readFile(compressedPath);

    try { await fs.promises.unlink(compressedPath); } catch {}

    const bucket = getBucket();
    const stream = Readable.from(compressedBuffer);

    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream("audio.mp3", {
        contentType: "audio/mpeg",
        metadata: { idLicao },
      });

      stream
        .pipe(uploadStream)
        .on("error", reject)
        .on("finish", () => resolve(uploadStream.id.toString()));
    });
  } finally {
    try { await fs.promises.unlink(tempInput); } catch {}
  }
};

const streamAudioService = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.sendStatus(400);
    }

    const audioId = new mongoose.Types.ObjectId(id);
    const db = mongoose.connection.db;

    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: "audios",
    });

    const file = await db.collection("audios.files").findOne({ _id: audioId });

    if (!file) return res.sendStatus(404);

    const fileSize = file.length;
    const range = req.headers.range;

    let downloadStream;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = Number(parts[0]);
      const end = parts[1] ? Number(parts[1]) : fileSize - 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": file.contentType || "audio/mpeg",
      });

      downloadStream = bucket.openDownloadStream(audioId, {
        start,
        end: end + 1,
      });
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": file.contentType || "audio/mpeg",
      });

      downloadStream = bucket.openDownloadStream(audioId);
    }

    downloadStream.on("error", (err) => {
      console.error(err);
      if (!res.headersSent) res.sendStatus(500);
    });

    downloadStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

const deletarAudioService = async (idLicao) => {
  if (!idLicao) return;

  const db = mongoose.connection.db;

  const file = await db.collection("audios.files").findOne(
    { "metadata.idLicao": idLicao },
    { projection: { _id: 1 } }
  );

  if (!file) return;

  const bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: "audios",
  });

  await bucket.delete(file._id);
};

const atualizarAudio = async (idLicao, files) => {
  await deletarAudioService(idLicao);

  await salvarAudio(files, idLicao);

  await Frases.deleteMany({ idLicao });

  const segmentos = await transcreverAudioComTimestamps(files[0]);

  if (segmentos.length > 0) {
    const frases = segmentos.map((segmento) => ({
      idLicao,
      frase: segmento.frase,
      inicioAudio: segmento.inicioAudio,
      fimAudio: segmento.fimAudio,
    }));

    await Frases.insertMany(frases);

    return frases.length > 0;
  }
};

export { salvarAudio, streamAudioService, deletarAudioService, atualizarAudio };
