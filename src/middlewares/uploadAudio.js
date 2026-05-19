import multer from "multer";

const uploadAudio = multer({
  storage: multer.memoryStorage(),

  fileFilter: (req, file, cb) => {
    const tipos = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/wave",
      "audio/ogg",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
      "audio/flac",
      "audio/x-wav",
    ];
    if (!tipos.includes(file.mimetype)) {
      return cb(new Error("Formato de áudio inválido"), false);
    }
    cb(null, true);
  },
});

export default uploadAudio;
