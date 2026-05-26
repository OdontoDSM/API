import fs from "node:fs";
import path from "node:path";
import multer from "multer";

const uploadsDir = path.resolve(process.cwd(), "uploads", "files");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${safeOriginal}`);
  },
});

function pdfOnly(_req, file, cb) {
  const isPdfMime = file.mimetype === "application/pdf";
  const isPdfExt = file.originalname.toLowerCase().endsWith(".pdf");

  if (!isPdfMime && !isPdfExt) {
    return cb(new Error("Apenas arquivos PDF sao permitidos"));
  }

  return cb(null, true);
}

export const uploadPdf = multer({
  storage,
  fileFilter: pdfOnly,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
