import mongoose from "mongoose";
import MedicalRecord from "../models/MedicalRecord.js";
import Patient from "../models/Patient.js";

export const createMedicalRecord = async (req, res) => {
  try {
    const { patient, appointmentHistory, clinicalNotes } = req.body;

    if (!patient) {
      return res.status(400).json({ error: "Campo obrigatorio: patient" });
    }

    if (!mongoose.isValidObjectId(patient)) {
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
    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMedicalRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find()
      .sort({ updatedAt: -1 })
      .populate("patient", "name cpf phone");

    return res.status(200).json(records);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMedicalRecordById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de prontuario invalido" });
    }

    const record = await MedicalRecord.findById(id).populate(
      "patient",
      "name cpf phone birthDate allergies medicalNotes anamnesis emergencyContact"
    );

    if (!record) {
      return res.status(404).json({ error: "Prontuario nao encontrado" });
    }

    return res.status(200).json(record);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMedicalRecordByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({ error: "ID de paciente invalido" });
    }

    const record = await MedicalRecord.findOne({ patient: patientId }).populate(
      "patient",
      "name cpf phone birthDate allergies medicalNotes anamnesis emergencyContact"
    );

    if (!record) {
      return res.status(404).json({ error: "Prontuario nao encontrado para este paciente" });
    }

    return res.status(200).json(record);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de prontuario invalido" });
    }

    const { patient, ...updateData } = req.body;

    const record = await MedicalRecord.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("patient", "name cpf phone birthDate");

    if (!record) {
      return res.status(404).json({ error: "Prontuario nao encontrado" });
    }

    return res.status(200).json(record);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de prontuario invalido" });
    }

    const record = await MedicalRecord.findByIdAndDelete(id);
    if (!record) {
      return res.status(404).json({ error: "Prontuario nao encontrado" });
    }

    return res.status(200).json({ message: "Prontuario removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
