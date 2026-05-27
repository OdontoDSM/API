import Patient from "../models/Patient.js";
import mongoose from "mongoose";
import {
    buildSecuredCpf,
    hashCpf,
    normalizeCpf,
    serializeWithDecryptedCpf,
} from "../utils/cpfCrypto.js";

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
        const payload = normalizePatientPayload(req.body);
        const cpf = normalizeCpf(payload.cpf);

        if (!cpf || cpf.length !== 11) {
            return res.status(400).json({ error: "CPF invalido" });
        }

        const cpfHash = hashCpf(cpf);
        let existingCpf = await Patient.findOne({ cpfHash });
        if (!existingCpf) {
            existingCpf = await Patient.findOne({ cpf });
        }

        if (existingCpf) {
            return res.status(409).json({ error: "CPF ja cadastrado" });
        }

        const securedCpf = buildSecuredCpf(cpf);
        const patient = await Patient.create({
            ...payload,
            cpf: securedCpf.cpf,
            cpfHash: securedCpf.cpfHash,
        });

        res.status(201).json(serializeWithDecryptedCpf(patient));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const getPatients = async (req, res) => {
    try{
        const patients = await Patient.find().sort({ createdAt: -1 });
        res.status(200).json(serializeWithDecryptedCpf(patients));
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
        res.status(200).json(serializeWithDecryptedCpf(patient));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const updatePatient = async (req, res) => {
    try{
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: "ID de paciente invalido" });
        }

        const payload = normalizePatientPayload(req.body);

        if (payload.cpf !== undefined) {
            const cpf = normalizeCpf(payload.cpf);
            if (!cpf || cpf.length !== 11) {
                return res.status(400).json({ error: "CPF invalido" });
            }

            const cpfHash = hashCpf(cpf);
            let existingCpf = await Patient.findOne({
                cpfHash,
                _id: { $ne: req.params.id },
            });

            if (!existingCpf) {
                existingCpf = await Patient.findOne({
                    cpf,
                    _id: { $ne: req.params.id },
                });
            }

            if (existingCpf) {
                return res.status(409).json({ error: "CPF ja cadastrado" });
            }

            const securedCpf = buildSecuredCpf(cpf);
            payload.cpf = securedCpf.cpf;
            payload.cpfHash = securedCpf.cpfHash;
        }

        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            payload,
            { new: true, runValidators: true }
        );
        if(!patient) return res.status(404).json({error: "Paciente não encontrado"});
        res.status(200).json(serializeWithDecryptedCpf(patient));
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