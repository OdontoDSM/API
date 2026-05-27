import mongoose from "mongoose";
import { adaptModel } from "../config/dbAdapter.js";

const PatientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    cpf: {
      type: String,
      required: true,
    },
    cpfHash: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    birthDate: {
      type: Date,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    insurance: {
      type: String,
    },
    medicalNotes: {
      type: String,
    },
    allergies: {
      type: String,
      required: true,
      default: "Nenhuma",
    },
    anamnesis: {
      type: String,
    },
    emergencyContact: {
      type: String,
    },
  },
  { timestamps: true },
);

export default adaptModel(mongoose.model("Patient", PatientSchema), "patients");
