import mongoose from "mongoose";
import fs from "node:fs/promises";
import path from "node:path";
import File from "../models/File.js";
import MedicalRecord from "../models/MedicalRecord.js";

const uploadsRoot = path.resolve(process.cwd(), "uploads");

function toPosixPath(value) {
  return value.replace(/\\/g, "/");
}

async function safeUnlink(storagePath) {
  if (!storagePath) return;

  const absolute = path.resolve(process.cwd(), storagePath);
  if (!absolute.startsWith(uploadsRoot)) return;

  try {
    await fs.unlink(absolute);
  } catch {
    // Arquivo pode ja nao existir; nao bloqueia o fluxo de delecao do registro
  }
}

export const createFile = async (req, res) => {
  try {
    const { medicalRecord, fileType, fileUrl } = req.body;

    if (!medicalRecord || !fileType || !fileUrl) {
      return res
        .status(400)
        .json({ error: "Campos obrigatorios: medicalRecord, fileType e fileUrl" });
    }

    if (!mongoose.isValidObjectId(medicalRecord)) {
      return res.status(400).json({ error: "ID de prontuario invalido" });
    }

    const recordExists = await MedicalRecord.exists({ _id: medicalRecord });
    if (!recordExists) {
      return res.status(404).json({ error: "Prontuario nao encontrado" });
    }

    const file = await File.create({ medicalRecord, fileType, fileUrl });

    const populated = await file.populate({
      path: "medicalRecord",
      select: "patient",
      populate: { path: "patient", select: "name cpf" },
    });

    return res.status(201).json(populated);
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

    return res.status(200).json(files);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const uploadFile = async (req, res) => {
  try {
    const { medicalRecord, fileType } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Arquivo PDF nao enviado" });
    }

    if (!mongoose.isValidObjectId(medicalRecord)) {
      return res.status(400).json({ error: "ID de prontuario invalido" });
    }

    const recordExists = await MedicalRecord.exists({ _id: medicalRecord });
    if (!recordExists) {
      await safeUnlink(req.file.path);
      return res.status(404).json({ error: "Prontuario nao encontrado" });
    }

    const relativeStoragePath = toPosixPath(path.relative(process.cwd(), req.file.path));

    let file = await File.create({
      medicalRecord,
      fileType,
      fileUrl: "",
      storagePath: relativeStoragePath,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      uploadedBy: req.userId,
    });

    const downloadUrl = `/api/files/${file._id}/download`;
    file = await File.findByIdAndUpdate(
      file._id,
      { fileUrl: downloadUrl },
      { new: true, runValidators: true }
    );

    if (file && typeof file.populate === "function") {
      file = await file.populate({
        path: "medicalRecord",
        select: "patient",
        populate: { path: "patient", select: "name cpf" },
      });
    }

    return res.status(201).json(file);
  } catch (error) {
    if (req.file?.path) {
      await safeUnlink(req.file.path);
    }
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

    return res.status(200).json(file);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de arquivo invalido" });
    }

    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ error: "Arquivo nao encontrado" });
    }

    if (!file.storagePath) {
      return res.status(400).json({ error: "Arquivo sem armazenamento local no servidor" });
    }

    const absolute = path.resolve(process.cwd(), file.storagePath);
    if (!absolute.startsWith(uploadsRoot)) {
      return res.status(400).json({ error: "Caminho de arquivo invalido" });
    }

    await fs.access(absolute);

    res.setHeader("Content-Type", file.mimeType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${(file.originalName || "documento.pdf").replace(/"/g, "")}"`
    );
    return res.sendFile(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return res.status(404).json({ error: "Arquivo fisico nao encontrado no servidor" });
    }
    return res.status(500).json({ error: error.message });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de arquivo invalido" });
    }

    const current = await File.findById(id);
    const file = await File.findByIdAndDelete(id);
    if (!file) {
      return res.status(404).json({ error: "Arquivo nao encontrado" });
    }

    await safeUnlink(current?.storagePath);

    return res.status(200).json({ message: "Arquivo removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
