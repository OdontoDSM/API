import mongoose from "mongoose";

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

export default mongoose.model("MedicalRecord", MedicalRecordsSchema);
