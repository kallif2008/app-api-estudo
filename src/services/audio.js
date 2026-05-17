import { Readable } from "node:stream";
import mongoose from "mongoose";
import { getBucket } from "../config/database.js";
import Audio from "../models/audio.js";

const salvarAudio = async (files) => {
  const arquivo = files?.[0];

  if (!arquivo?.buffer) {
    throw new Error("Arquivo de audio invalido");
  }

  const bucket = getBucket();

  const stream = Readable.from(arquivo.buffer);

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(arquivo.originalname, {
      contentType: arquivo.mimetype,
    });

    stream
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => resolve(uploadStream.id.toString()));
  });
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

const deletarAudioService = async (audioId) => {
  // 🔒 proteção absoluta
  if (!audioId || !mongoose.Types.ObjectId.isValid(audioId)) {
    return;
  }

  const db = mongoose.connection.db;
  const bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: "audios",
  });

  const objectId = new mongoose.Types.ObjectId(audioId);

  const files = await bucket.find({ _id: objectId }).toArray();

  if (!files || files.length === 0) {
    return;
  }

  await bucket.delete(objectId);

  return { message: "Áudio removido com sucesso" };
};

const atualizarAudio = async (idLicao, files) => {
  const audioRegistro = await Audio.findOne({ idLicao });

  if (audioRegistro) {
    await deletarAudioService(audioRegistro.idAudio);
  }

  const novoAudioId = await salvarAudio(files);

  if (!audioRegistro) {
    await Audio.create({
      idLicao,
      idAudio: novoAudioId,
    });
    return;
  }

  audioRegistro.idAudio = novoAudioId;
  await audioRegistro.save();
};

export { salvarAudio, streamAudioService, deletarAudioService, atualizarAudio };
