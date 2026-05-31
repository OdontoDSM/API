import mongoose from "mongoose";
import { adaptModel } from "../config/dbAdapter.js";

const PaymentSchema = new mongoose.Schema(
  {
    budget: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Budget",
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["Dinheiro", "Cartao", "PIX", "Transferencia"],
      required: true,
    },
    installments: {
      type: Number,
      default: 1,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pago", "Pendente"],
      default: "Pendente",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true }
);

export default adaptModel(mongoose.model("Payment", PaymentSchema), "payments");