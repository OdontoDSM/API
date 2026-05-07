import mongoose from "mongoose";
import Treatment from "../models/Treatment.js";

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

    if (!mongoose.isValidObjectId(id)) {
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

    if (!mongoose.isValidObjectId(id)) {
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

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de tratamento invalido" });
    }

    const treatment = await Treatment.findByIdAndDelete(id);
    if (!treatment) {
      return res.status(404).json({ error: "Tratamento nao encontrado" });
    }

    return res.status(200).json({ message: "Tratamento removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
