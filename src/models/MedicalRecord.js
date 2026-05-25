import mongoose from "mongoose";
import { adaptModel } from "../config/dbAdapter.js";

const MedicalRecordsSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      unique: true,
    },
    appointmentHistory: {
      type: String,
    },
    clinicalNotes: {
      type: String,
    },
  },
  { timestamps: true },
);

export default adaptModel(mongoose.model("MedicalRecord", MedicalRecordsSchema), "medicalrecords");
