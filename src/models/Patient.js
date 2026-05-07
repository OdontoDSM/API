import mongoose from "mongoose";

const PatientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    cpf: {
      type: String,
      required: true,
      unique: true,
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

export default mongoose.model("Patient", PatientSchema);
