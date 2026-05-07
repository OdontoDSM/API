import mongoose from "mongoose";
import File from "../models/File.js";
import MedicalRecord from "../models/MedicalRecord.js";

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

export const getFileById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de arquivo invalido" });
    }

    const file = await File.findById(id).populate({
      path: "medicalRecord",
      select: "patient",
      populate: { path: "patient", select: "name cpf" },
    });

    if (!file) {
      return res.status(404).json({ error: "Arquivo nao encontrado" });
    }

    return res.status(200).json(file);
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

    return res.status(200).json({ message: "Arquivo removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
