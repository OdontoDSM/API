import Patient from "../models/Patient.js";
import Appointment from "../models/Appointments.js";
import Budget from "../models/Budget.js";
import Payment from "../models/Payment.js";
import MedicalRecord from "../models/MedicalRecord.js";
import File from "../models/File.js";
import fs from "fs/promises";
import path from "path";
import { uploadsDir } from "../middleware/upload.middleware.js";
import {
    buildSecuredCpf,
    hashCpf,
    normalizeCpf,
    serializeWithDecryptedCpf,
} from "../utils/cpfCrypto.js";
import { isValidDbId } from "../utils/idValidation.js";

function resolveUploadedFilePath(fileUrl) {
    let pathname = fileUrl;

    try {
        pathname = new URL(fileUrl).pathname;
    } catch {
        pathname = fileUrl;
    }

    if (!pathname?.startsWith("/uploads/")) {
        return null;
    }

    const relativePath = decodeURIComponent(pathname.replace(/^\/uploads\//, ""));
    const absolutePath = path.resolve(uploadsDir, relativePath);
    const normalizedUploadsDir = path.resolve(uploadsDir);

    if (!absolutePath.startsWith(normalizedUploadsDir)) {
        return null;
    }

    return absolutePath;
}

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
        if (!isValidDbId(req.params.id)) {
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
        if (!isValidDbId(req.params.id)) {
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
        if (!isValidDbId(req.params.id)) {
            return res.status(400).json({ error: "ID de paciente invalido" });
        }

        const patient = await Patient.findById(req.params.id);
        if(!patient) return res.status(404).json({error: "Paciente não encontrado"});

        const patientId = req.params.id;

        const appointments = await Appointment.find({ patient: patientId }).select("_id");
        const appointmentIds = appointments.map((item) => item._id);

        const budgetsByPatient = await Budget.find({ patient: patientId }).select("_id");
        const budgetsByAppointment = appointmentIds.length > 0
            ? await Budget.find({ appointment: { $in: appointmentIds } }).select("_id")
            : [];

        const budgetIds = [
            ...new Set(
                [...budgetsByPatient, ...budgetsByAppointment]
                    .map((item) => String(item._id))
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

        const medicalRecords = await MedicalRecord.find({ patient: patientId }).select("_id");
        const medicalRecordIds = medicalRecords.map((item) => item._id);

        if (medicalRecordIds.length > 0) {
            const files = await File.find({ medicalRecord: { $in: medicalRecordIds } }).select("_id fileUrl");

            for (const file of files) {
                const localFilePath = resolveUploadedFilePath(file.fileUrl);
                if (localFilePath) {
                    await fs.unlink(localFilePath).catch(() => null);
                }

                await File.findByIdAndDelete(file._id);
            }

            await MedicalRecord.deleteMany({ _id: { $in: medicalRecordIds } });
        }

        await Appointment.deleteMany({ patient: patientId });
        await Patient.findByIdAndDelete(patientId);

        res.status(200).json({message: "Paciente deletado com sucesso"});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}