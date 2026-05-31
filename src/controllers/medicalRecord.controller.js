import MedicalRecord from "../models/MedicalRecord.js";
import Patient from "../models/Patient.js";
import File from "../models/File.js";
import fs from "fs/promises";
import path from "path";
import { uploadsDir } from "../middleware/upload.middleware.js";
import { serializeWithDecryptedCpf } from "../utils/cpfCrypto.js";
import { isValidDbId } from "../utils/idValidation.js";

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

export const createMedicalRecord = async (req, res) => {
  try {
    const { patient, appointmentHistory, clinicalNotes } = req.body;

    if (!patient) {
      return res.status(400).json({ error: "Campo obrigatorio: patient" });
    }

    if (!isValidDbId(patient)) {
      return res.status(400).json({ error: "ID de paciente invalido" });
    }

    const patientExists = await Patient.exists({ _id: patient });
    if (!patientExists) {
      return res.status(404).json({ error: "Paciente nao encontrado" });
    }

    const existing = await MedicalRecord.findOne({ patient });
    if (existing) {
      return res
        .status(409)
        .json({ error: "Este paciente ja possui prontuario" });
    }

    const record = await MedicalRecord.create({
      patient,
      appointmentHistory,
      clinicalNotes,
    });

    const populated = await record.populate("patient", "name cpf phone birthDate");
    return res.status(201).json(serializeWithDecryptedCpf(populated));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMedicalRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find()
      .sort({ updatedAt: -1 })
      .populate("patient", "name cpf phone");

    return res.status(200).json(serializeWithDecryptedCpf(records));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMedicalRecordById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de prontuario invalido" });
    }

    let record = await MedicalRecord.findById(id);

    if (record && typeof record.populate === "function") {
      record = await record.populate(
        "patient",
        "name cpf phone birthDate allergies medicalNotes anamnesis emergencyContact"
      );
    }

    if (!record) {
      return res.status(404).json({ error: "Prontuario nao encontrado" });
    }

    return res.status(200).json(serializeWithDecryptedCpf(record));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMedicalRecordByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!isValidDbId(patientId)) {
      return res.status(400).json({ error: "ID de paciente invalido" });
    }

    const record = await MedicalRecord.findOne({ patient: patientId }).populate(
      "patient",
      "name cpf phone birthDate allergies medicalNotes anamnesis emergencyContact"
    );

    if (!record) {
      return res.status(404).json({ error: "Prontuario nao encontrado para este paciente" });
    }

    return res.status(200).json(serializeWithDecryptedCpf(record));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de prontuario invalido" });
    }

    const { patient, ...updateData } = req.body;

    let record = await MedicalRecord.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (record && typeof record.populate === "function") {
      record = await record.populate("patient", "name cpf phone birthDate");
    }

    if (!record) {
      return res.status(404).json({ error: "Prontuario nao encontrado" });
    }

    return res.status(200).json(serializeWithDecryptedCpf(record));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de prontuario invalido" });
    }

    const record = await MedicalRecord.findById(id);
    if (!record) {
      return res.status(404).json({ error: "Prontuario nao encontrado" });
    }

    const files = await File.find({ medicalRecord: id }).select("_id fileUrl");

    for (const file of files) {
      const localFilePath = resolveUploadedFilePath(file.fileUrl);
      if (localFilePath) {
        await fs.unlink(localFilePath).catch(() => null);
      }

      await File.findByIdAndDelete(file._id);
    }

    await MedicalRecord.findByIdAndDelete(id);

    return res.status(200).json({ message: "Prontuario removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
