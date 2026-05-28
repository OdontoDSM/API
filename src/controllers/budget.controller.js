import mongoose from "mongoose";
import Budget from "../models/Budget.js";
import Patient from "../models/Patient.js";
import Treatment from "../models/Treatment.js";
import { serializeWithDecryptedCpf } from "../utils/cpfCrypto.js";

export const createBudget = async (req, res) => {
  try {
    const { patient, treatment, appointment, totalPrice, paymentMethod, status } = req.body;

    if (!patient || !treatment || totalPrice === undefined || !paymentMethod) {
      return res.status(400).json({
        error:
          "Campos obrigatorios: patient, treatment, totalPrice e paymentMethod",
      });
    }

    if (!mongoose.isValidObjectId(patient)) {
      return res.status(400).json({ error: "ID de paciente invalido" });
    }

    if (!mongoose.isValidObjectId(treatment)) {
      return res.status(400).json({ error: "ID de tratamento invalido" });
    }

    if (appointment && !mongoose.isValidObjectId(appointment)) {
      return res.status(400).json({ error: "ID de agendamento invalido" });
    }

    if (typeof totalPrice !== "number" || totalPrice < 0) {
      return res
        .status(400)
        .json({ error: "totalPrice deve ser um numero positivo" });
    }

    const [patientExists, treatmentExists] = await Promise.all([
      Patient.exists({ _id: patient }),
      Treatment.exists({ _id: treatment }),
    ]);

    if (!patientExists) {
      return res.status(404).json({ error: "Paciente nao encontrado" });
    }

    if (!treatmentExists) {
      return res.status(404).json({ error: "Tratamento nao encontrado" });
    }

    const budget = await Budget.create({
      patient,
      treatment,
      appointment,
      totalPrice,
      paymentMethod,
      status,
    });

    const populated = await budget.populate([
      { path: "patient", select: "name cpf phone" },
      { path: "treatment", select: "name basePrice" },
    ]);

    return res.status(201).json(serializeWithDecryptedCpf(populated));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getBudgets = async (req, res) => {
  try {
    const { patient, appointment, status } = req.query;
    const filter = {};

    if (patient) {
      if (!mongoose.isValidObjectId(patient)) {
        return res.status(400).json({ error: "ID de paciente invalido" });
      }
      filter.patient = patient;
    }

    if (status) {
      filter.status = status;
    }

    if (appointment) {
      if (!mongoose.isValidObjectId(appointment)) {
        return res.status(400).json({ error: "ID de agendamento invalido" });
      }
      filter.appointment = appointment;
    }

    const budgets = await Budget.find(filter)
      .sort({ createdAt: -1 })
      .populate("patient", "name cpf phone")
      .populate("treatment", "name basePrice");

    return res.status(200).json(serializeWithDecryptedCpf(budgets));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getBudgetById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de orcamento invalido" });
    }

    let budget = await Budget.findById(id);

    if (budget && typeof budget.populate === "function") {
      budget = await budget.populate([
        { path: "patient", select: "name cpf phone" },
        { path: "treatment", select: "name basePrice description" },
      ]);
    }

    if (!budget) {
      return res.status(404).json({ error: "Orcamento nao encontrado" });
    }

    return res.status(200).json(serializeWithDecryptedCpf(budget));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de orcamento invalido" });
    }

    if (req.body.patient && !mongoose.isValidObjectId(req.body.patient)) {
      return res.status(400).json({ error: "ID de paciente invalido" });
    }

    if (req.body.treatment && !mongoose.isValidObjectId(req.body.treatment)) {
      return res.status(400).json({ error: "ID de tratamento invalido" });
    }

    if (req.body.totalPrice !== undefined) {
      if (typeof req.body.totalPrice !== "number" || req.body.totalPrice < 0) {
        return res
          .status(400)
          .json({ error: "totalPrice deve ser um numero positivo" });
      }
    }

    let budget = await Budget.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (budget && typeof budget.populate === "function") {
      budget = await budget.populate([
        { path: "patient", select: "name cpf phone" },
        { path: "treatment", select: "name basePrice" },
      ]);
    }

    if (!budget) {
      return res.status(404).json({ error: "Orcamento nao encontrado" });
    }

    return res.status(200).json(serializeWithDecryptedCpf(budget));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de orcamento invalido" });
    }

    const budget = await Budget.findByIdAndDelete(id);
    if (!budget) {
      return res.status(404).json({ error: "Orcamento nao encontrado" });
    }

    return res.status(200).json({ message: "Orcamento removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
