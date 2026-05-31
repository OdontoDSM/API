import mongoose from "mongoose";
import { adaptModel } from "../config/dbAdapter.js";

const AppointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  treatment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Treatment",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  room: {
    type: Number,
    required: true,
  },
  dateTime: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: [
      "Confirmado",
      "Cancelado",
      "Falta",
      "Concluido",
      "Aguardando confirmacao",
    ],
    default: "Aguardando confirmacao",
  },
  notes: {
    type: String,
  },
}, { timestamps: true });

AppointmentSchema.index({ patient: 1, dateTime: -1 });

export default adaptModel(mongoose.model("Appointment", AppointmentSchema), "appointments");