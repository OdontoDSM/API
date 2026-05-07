import mongoose from "mongoose";

const BudgetSchema = new mongoose.Schema(
  {
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
    totalPrice: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Dinheiro", "Credito", "PIX", "Transferencia"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pendente", "Aprovado", "Recusado"],
      default: "Pendente",
      required: true,
    },
    createdDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Budget", BudgetSchema);