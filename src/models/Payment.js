import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

export default mongoose.model("Payment", PaymentSchema);