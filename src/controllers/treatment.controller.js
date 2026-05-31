import Treatment from "../models/Treatment.js";
import Appointment from "../models/Appointments.js";
import Budget from "../models/Budget.js";
import Payment from "../models/Payment.js";
import { isValidDbId } from "../utils/idValidation.js";

export const createTreatment = async (req, res) => {
  try {
    const { name, description, basePrice } = req.body;

    if (!name || basePrice === undefined) {
      return res
        .status(400)
        .json({ error: "Campos obrigatorios: name e basePrice" });
    }

    if (typeof basePrice !== "number" || basePrice < 0) {
      return res
        .status(400)
        .json({ error: "basePrice deve ser um numero positivo" });
    }

    const treatment = await Treatment.create({ name: name.trim(), description, basePrice });
    return res.status(201).json(treatment);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getTreatments = async (req, res) => {
  try {
    const treatments = await Treatment.find().sort({ name: 1 });
    return res.status(200).json(treatments);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getTreatmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de tratamento invalido" });
    }

    const treatment = await Treatment.findById(id);
    if (!treatment) {
      return res.status(404).json({ error: "Tratamento nao encontrado" });
    }

    return res.status(200).json(treatment);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateTreatment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de tratamento invalido" });
    }

    if (req.body.basePrice !== undefined) {
      if (typeof req.body.basePrice !== "number" || req.body.basePrice < 0) {
        return res
          .status(400)
          .json({ error: "basePrice deve ser um numero positivo" });
      }
    }

    const treatment = await Treatment.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!treatment) {
      return res.status(404).json({ error: "Tratamento nao encontrado" });
    }

    return res.status(200).json(treatment);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteTreatment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de tratamento invalido" });
    }

    const treatment = await Treatment.findById(id);
    if (!treatment) {
      return res.status(404).json({ error: "Tratamento nao encontrado" });
    }

    const appointments = await Appointment.find({ treatment: id }).select("_id");
    const appointmentIds = appointments.map((item) => item._id);

    const budgetsByTreatment = await Budget.find({ treatment: id }).select("_id");
    const budgetsByAppointment = appointmentIds.length > 0
      ? await Budget.find({ appointment: { $in: appointmentIds } }).select("_id")
      : [];

    const budgetIds = [
      ...new Set(
        [...budgetsByTreatment, ...budgetsByAppointment].map((item) => String(item._id))
      ),
    ];

    for (const budgetId of budgetIds) {
      const payments = await Payment.find({ budget: budgetId }).select("_id isActive");

      for (const payment of payments) {
        if (payment?.isActive === false) continue;

        await Payment.findByIdAndUpdate(
          payment._id,
          { isActive: false },
          { new: true, runValidators: true }
        );
      }
    }

    if (budgetIds.length > 0) {
      await Budget.deleteMany({ _id: { $in: budgetIds } });
    }

    await Appointment.deleteMany({ treatment: id });
    await Treatment.findByIdAndDelete(id);

    return res.status(200).json({ message: "Tratamento removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
