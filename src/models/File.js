import mongoose from "mongoose";
import { adaptModel } from "../config/dbAdapter.js";

const FileSchema = new mongoose.Schema(
  {
    medicalRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicalRecord",
      required: true,
    },
    fileType: {
      type: String,
      enum: ["Exame", "Radiografia", "Foto"],
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true },
);

FileSchema.index({ medicalRecord: 1, uploadedAt: -1 });

export default adaptModel(mongoose.model("File", FileSchema), "files");
