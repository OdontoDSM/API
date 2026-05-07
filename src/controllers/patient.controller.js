import Patient from "../models/Patient.js";
import mongoose from "mongoose";

function normalizePatientPayload(payload = {}) {
    const normalized = {
        ...payload,
        name: payload.name || payload.nome,
        phone: payload.phone || payload.telefone,
    };

    delete normalized.nome;
    delete normalized.telefone;

    return normalized;
}

export const createPatient = async (req, res) => {
    try {
        const patient = await Patient.create(normalizePatientPayload(req.body));
        res.status(201).json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const getPatients = async (req, res) => {
    try{
        const patients = await Patient.find().sort({ createdAt: -1 });
        res.status(200).json(patients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const getPatientById = async (req, res) => {
    try{
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: "ID de paciente invalido" });
        }

        const patient = await Patient.findById(req.params.id);
        if(!patient) return res.status(404).json({error: "Paciente não encontrado"});
        res.status(200).json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const updatePatient = async (req, res) => {
    try{
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: "ID de paciente invalido" });
        }

        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            normalizePatientPayload(req.body),
            { new: true, runValidators: true }
        );
        if(!patient) return res.status(404).json({error: "Paciente não encontrado"});
        res.status(200).json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const deletePatient = async (req, res) =>{
    try{
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: "ID de paciente invalido" });
        }

        const patient = await Patient.findByIdAndDelete(req.params.id);
        if(!patient) return res.status(404).json({error: "Paciente não encontrado"});
        res.status(200).json({message: "Paciente deletado com sucesso"});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}