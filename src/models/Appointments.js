import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
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

export default mongoose.model("Appointment", AppointmentSchema);