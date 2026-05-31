import Payment from "../models/Payment.js";
import Budget from "../models/Budget.js";
import { serializeWithDecryptedCpf } from "../utils/cpfCrypto.js";
import { isValidDbId } from "../utils/idValidation.js";

function toBudgetPaymentMethod(method) {
  if (method === "Cartao") return "Credito";
  return method;
}

export const createPayment = async (req, res) => {
  try {
    const { budget, amountPaid, discount, paymentMethod, installments, paymentDate, status } =
      req.body;

    if (!budget || amountPaid === undefined || !paymentMethod || !paymentDate) {
      return res.status(400).json({
        error: "Campos obrigatorios: budget, amountPaid, paymentMethod e paymentDate",
      });
    }

    if (!isValidDbId(budget)) {
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

    const parsedPaymentDate = new Date(paymentDate);
    if (Number.isNaN(parsedPaymentDate.getTime())) {
      return res.status(400).json({ error: "paymentDate invalida" });
    }

    const budgetDoc = await Budget.findById(budget);
    if (!budgetDoc) {
      return res.status(404).json({ error: "Orcamento nao encontrado" });
    }

    const existingPayment = await Payment.findOne({ budget });
    const allPayments = await Payment.find({ budget }).select("_id amountPaid discount");
    const existingId = existingPayment?._id ? String(existingPayment._id) : null;

    const alreadyPaid = allPayments
      .filter((p) => String(p._id) !== existingId)
      .reduce(
        (sum, p) => sum + (p.amountPaid - (p.discount ?? 0)),
      0
      );

    const netNew = amountPaid - discountValue;
    if (alreadyPaid + netNew > budgetDoc.totalPrice) {
      return res.status(400).json({
        error: `Valor total dos pagamentos (${alreadyPaid + netNew}) excede o totalPrice do orcamento (${budgetDoc.totalPrice})`,
      });
    }

    const budgetStatus = status === "Pago" ? "Aprovado" : "Pendente";
    await Budget.findByIdAndUpdate(
      budget,
      {
        status: budgetStatus,
        paymentMethod: toBudgetPaymentMethod(paymentMethod),
      },
      { new: true, runValidators: true }
    );

    const payload = {
      budget,
      amountPaid,
      discount: discountValue,
      paymentMethod,
      installments,
      paymentDate: parsedPaymentDate,
      status,
    };

    if (existingPayment) {
      let updatedPayment = await Payment.findByIdAndUpdate(existingPayment._id, payload, {
        new: true,
        runValidators: true,
      });

      if (updatedPayment && typeof updatedPayment.populate === "function") {
        updatedPayment = await updatedPayment.populate({
          path: "budget",
          select: "totalPrice paymentMethod status patient treatment appointment",
          populate: [
            { path: "patient", select: "name cpf" },
            { path: "treatment", select: "name" },
          ],
        });
      }

      return res.status(200).json(serializeWithDecryptedCpf(updatedPayment));
    }

    const payment = await Payment.create({
      ...payload,
    });

    const populated = await payment.populate({
      path: "budget",
      select: "totalPrice paymentMethod status patient treatment appointment",
      populate: [
        { path: "patient", select: "name cpf" },
        { path: "treatment", select: "name" },
      ],
    });

    return res.status(201).json(serializeWithDecryptedCpf(populated));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getPayments = async (req, res) => {
  try {
    const { budget, status } = req.query;
    const filter = { isActive: { $ne: false } };

    if (budget) {
      if (!isValidDbId(budget)) {
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
        select: "totalPrice paymentMethod status patient treatment appointment",
        populate: [
          { path: "patient", select: "name cpf" },
          { path: "treatment", select: "name" },
        ],
      });

    return res.status(200).json(serializeWithDecryptedCpf(payments));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de pagamento invalido" });
    }

    let payment = await Payment.findById(id);

    if (payment && payment.isActive === false) {
      return res.status(404).json({ error: "Pagamento nao encontrado" });
    }

    if (payment && typeof payment.populate === "function") {
      payment = await payment.populate({
        path: "budget",
        select: "totalPrice paymentMethod status patient treatment appointment",
        populate: [
          { path: "patient", select: "name cpf" },
          { path: "treatment", select: "name" },
        ],
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

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de pagamento invalido" });
    }

    const existingPayment = await Payment.findById(id);
    if (!existingPayment || existingPayment.isActive === false) {
      return res.status(404).json({ error: "Pagamento nao encontrado" });
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
        select: "totalPrice paymentMethod status patient treatment appointment",
        populate: [
          { path: "patient", select: "name cpf" },
          { path: "treatment", select: "name" },
        ],
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

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de pagamento invalido" });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ error: "Pagamento nao encontrado" });
    }

    if (payment.isActive === false) {
      return res.status(200).json({ message: "Pagamento ja estava inativo" });
    }

    await Payment.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true, runValidators: true }
    );

    return res.status(200).json({ message: "Pagamento desativado com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
