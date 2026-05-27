import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import Budget from "../models/Budget.js";
import { serializeWithDecryptedCpf } from "../utils/cpfCrypto.js";

export const createPayment = async (req, res) => {
  try {
    const { budget, amountPaid, discount, paymentMethod, installments, paymentDate, status } =
      req.body;

    if (!budget || amountPaid === undefined || !paymentMethod || !paymentDate) {
      return res.status(400).json({
        error: "Campos obrigatorios: budget, amountPaid, paymentMethod e paymentDate",
      });
    }

    if (!mongoose.isValidObjectId(budget)) {
      return res.status(400).json({ error: "ID de orcamento invalido" });
    }

    if (typeof amountPaid !== "number" || amountPaid < 0) {
      return res
        .status(400)
        .json({ error: "amountPaid deve ser um numero positivo" });
    }

    const discountValue = discount ?? 0;
    if (typeof discountValue !== "number" || discountValue < 0) {
      return res
        .status(400)
        .json({ error: "discount deve ser um numero positivo" });
    }

    const budgetDoc = await Budget.findById(budget);
    if (!budgetDoc) {
      return res.status(404).json({ error: "Orcamento nao encontrado" });
    }

    const existingPayments = await Payment.find({ budget }).select("amountPaid discount");
    const alreadyPaid = existingPayments.reduce(
      (sum, p) => sum + (p.amountPaid - (p.discount ?? 0)),
      0
    );

    const netNew = amountPaid - discountValue;
    if (alreadyPaid + netNew > budgetDoc.totalPrice) {
      return res.status(400).json({
        error: `Valor total dos pagamentos (${alreadyPaid + netNew}) excede o totalPrice do orcamento (${budgetDoc.totalPrice})`,
      });
    }

    const payment = await Payment.create({
      budget,
      amountPaid,
      discount: discountValue,
      paymentMethod,
      installments,
      paymentDate: new Date(paymentDate),
      status,
    });

    const populated = await payment.populate({
      path: "budget",
      select: "totalPrice paymentMethod status",
      populate: { path: "patient", select: "name cpf" },
    });

    return res.status(201).json(serializeWithDecryptedCpf(populated));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getPayments = async (req, res) => {
  try {
    const { budget, status } = req.query;
    const filter = {};

    if (budget) {
      if (!mongoose.isValidObjectId(budget)) {
        return res.status(400).json({ error: "ID de orcamento invalido" });
      }
      filter.budget = budget;
    }

    if (status) {
      filter.status = status;
    }

    const payments = await Payment.find(filter)
      .sort({ paymentDate: -1 })
      .populate({
        path: "budget",
        select: "totalPrice paymentMethod status",
        populate: { path: "patient", select: "name cpf" },
      });

    return res.status(200).json(serializeWithDecryptedCpf(payments));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de pagamento invalido" });
    }

    let payment = await Payment.findById(id);

    if (payment && typeof payment.populate === "function") {
      payment = await payment.populate({
        path: "budget",
        select: "totalPrice paymentMethod status",
        populate: { path: "patient", select: "name cpf" },
      });
    }

    if (!payment) {
      return res.status(404).json({ error: "Pagamento nao encontrado" });
    }

    return res.status(200).json(serializeWithDecryptedCpf(payment));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de pagamento invalido" });
    }

    if (req.body.amountPaid !== undefined) {
      if (typeof req.body.amountPaid !== "number" || req.body.amountPaid < 0) {
        return res
          .status(400)
          .json({ error: "amountPaid deve ser um numero positivo" });
      }
    }

    let payment = await Payment.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (payment && typeof payment.populate === "function") {
      payment = await payment.populate({
        path: "budget",
        select: "totalPrice paymentMethod status",
        populate: { path: "patient", select: "name cpf" },
      });
    }

    if (!payment) {
      return res.status(404).json({ error: "Pagamento nao encontrado" });
    }

    return res.status(200).json(serializeWithDecryptedCpf(payment));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de pagamento invalido" });
    }

    const payment = await Payment.findByIdAndDelete(id);
    if (!payment) {
      return res.status(404).json({ error: "Pagamento nao encontrado" });
    }

    return res.status(200).json({ message: "Pagamento removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
