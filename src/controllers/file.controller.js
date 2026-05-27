import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import File from "../models/File.js";
import MedicalRecord from "../models/MedicalRecord.js";
import { uploadsDir } from "../middleware/upload.middleware.js";
import { serializeWithDecryptedCpf } from "../utils/cpfCrypto.js";

function buildPublicFileUrl(req, uploadedFile) {
  const absolutePath = uploadedFile.path
    || path.join(uploadedFile.destination || uploadsDir, uploadedFile.filename);

  const relativePath = path
    .relative(uploadsDir, absolutePath)
    .split(path.sep)
    .join("/");

  return `${req.protocol}://${req.get("host")}/uploads/${relativePath}`;
}

function resolveUploadedFilePath(fileUrl) {
  let pathname = fileUrl;

  try {
    pathname = new URL(fileUrl).pathname;
  } catch {
    pathname = fileUrl;
  }

  if (!pathname?.startsWith("/uploads/")) {
    return null;
  }

  const relativePath = decodeURIComponent(pathname.replace(/^\/uploads\//, ""));
  const absolutePath = path.resolve(uploadsDir, relativePath);
  const normalizedUploadsDir = path.resolve(uploadsDir);

  if (!absolutePath.startsWith(normalizedUploadsDir)) {
    return null;
  }

  return absolutePath;
}

export const createFile = async (req, res) => {
  try {
    const { medicalRecord, fileType } = req.body;
    const uploadedFile = req.file;
    const fileUrl = uploadedFile
      ? buildPublicFileUrl(req, uploadedFile)
      : req.body.fileUrl;

    if (!medicalRecord || !fileType || !fileUrl) {
      return res
        .status(400)
        .json({ error: "Campos obrigatorios: medicalRecord, fileType e arquivo/fileUrl" });
    }

    if (!mongoose.isValidObjectId(medicalRecord)) {
      return res.status(400).json({ error: "ID de prontuario invalido" });
    }

    if (!["Exame", "Radiografia", "Foto"].includes(fileType)) {
      return res.status(400).json({ error: "Tipo de arquivo invalido" });
    }

    const recordExists = await MedicalRecord.exists({ _id: medicalRecord });
    if (!recordExists) {
      return res.status(404).json({ error: "Prontuario nao encontrado" });
    }

    const file = await File.create({
      medicalRecord,
      fileType,
      fileUrl,
      fileName: uploadedFile?.filename || uploadedFile?.originalname,
      mimeType: uploadedFile?.mimetype,
      fileSize: uploadedFile?.size,
    });

    const populated = await file.populate({
      path: "medicalRecord",
      select: "patient",
      populate: { path: "patient", select: "name cpf" },
    });

    return res.status(201).json(serializeWithDecryptedCpf(populated));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getFiles = async (req, res) => {
  try {
    const { medicalRecord, fileType } = req.query;
    const filter = {};

    if (medicalRecord) {
      if (!mongoose.isValidObjectId(medicalRecord)) {
        return res.status(400).json({ error: "ID de prontuario invalido" });
      }
      filter.medicalRecord = medicalRecord;
    }

    if (fileType) {
      filter.fileType = fileType;
    }

    const files = await File.find(filter)
      .sort({ uploadedAt: -1 })
      .populate({
        path: "medicalRecord",
        select: "patient",
        populate: { path: "patient", select: "name cpf" },
      });

    return res.status(200).json(serializeWithDecryptedCpf(files));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getFileById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de arquivo invalido" });
    }

    let file = await File.findById(id);

    if (file && typeof file.populate === "function") {
      file = await file.populate({
        path: "medicalRecord",
        select: "patient",
        populate: { path: "patient", select: "name cpf" },
      });
    }

    if (!file) {
      return res.status(404).json({ error: "Arquivo nao encontrado" });
    }

    return res.status(200).json(serializeWithDecryptedCpf(file));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de arquivo invalido" });
    }

    const file = await File.findByIdAndDelete(id);
    if (!file) {
      return res.status(404).json({ error: "Arquivo nao encontrado" });
    }

    const localFilePath = resolveUploadedFilePath(file.fileUrl);
    if (localFilePath) {
      await fs.unlink(localFilePath).catch(() => null);
    }

    return res.status(200).json({ message: "Arquivo removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
