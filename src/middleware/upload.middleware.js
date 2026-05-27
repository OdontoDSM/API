import fs from "fs";
import path from "path";
import multer from "multer";
import mongoose from "mongoose";
import MedicalRecord from "../models/MedicalRecord.js";
import Patient from "../models/Patient.js";
import User from "../models/User.js";

const uploadsDir = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function slugifyPatientName(name = "") {
  const normalized = String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return normalized || "paciente";
}

function slugifyUserName(name = "") {
  const normalized = String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return normalized || "usuario";
}

function formatUploadDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const milli = String(date.getMilliseconds()).padStart(3, "0");

  return `${year}${month}${day}_${hour}${minute}${second}${milli}`;
}

async function resolvePatientNameFromRequest(req) {
  const medicalRecordId = req.body?.medicalRecord;

  if (!medicalRecordId || !mongoose.isValidObjectId(medicalRecordId)) {
    return "paciente";
  }

  const medicalRecord = await MedicalRecord.findById(medicalRecordId);
  if (!medicalRecord?.patient) {
    return "paciente";
  }

  const patientId = medicalRecord.patient._id || medicalRecord.patient;
  const patient = await Patient.findById(patientId);

  return slugifyPatientName(patient?.name);
}

async function resolveUserNameFromRequest(req) {
  const userId = req.params?.id || req.userId;

  if (!userId || !mongoose.isValidObjectId(userId)) {
    return "usuario";
  }

  const user = await User.findById(userId);
  return slugifyUserName(user?.name);
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    resolvePatientNameFromRequest(req)
      .then((patientSlug) => {
        const uploadDate = new Date();
        const year = String(uploadDate.getFullYear());
        const month = String(uploadDate.getMonth() + 1).padStart(2, "0");
        const destinationDir = path.join(uploadsDir, patientSlug, year, month);

        fs.mkdirSync(destinationDir, { recursive: true });

        req.uploadMeta = {
          patientSlug,
          uploadDate,
        };

        cb(null, destinationDir);
      })
      .catch((error) => cb(error));
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const patientSlug = req.uploadMeta?.patientSlug || "paciente";
    const uploadDate = req.uploadMeta?.uploadDate || new Date();
    const dateTime = formatUploadDateTime(uploadDate);

    cb(null, `${patientSlug}_${dateTime}${extension || ".bin"}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function fileFilter(_req, file, cb) {
  if (allowedMimeTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Tipo de arquivo nao suportado. Envie PDF, JPG, PNG ou WEBP."));
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const profilePhotoStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    resolveUserNameFromRequest(req)
      .then((userSlug) => {
        const destinationDir = path.join(uploadsDir, "profile_photo", userSlug);

        fs.mkdirSync(destinationDir, { recursive: true });

        req.uploadMeta = {
          userSlug,
          uploadDate: new Date(),
        };

        cb(null, destinationDir);
      })
      .catch((error) => cb(error));
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const userSlug = req.uploadMeta?.userSlug || "usuario";
    const uploadDate = req.uploadMeta?.uploadDate || new Date();
    const dateTime = formatUploadDateTime(uploadDate);

    cb(null, `${userSlug}_${dateTime}${extension}`);
  },
});

const allowedProfilePhotoMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function profilePhotoFilter(_req, file, cb) {
  if (allowedProfilePhotoMimeTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Tipo de imagem nao suportado. Envie JPG, PNG ou WEBP."));
}

export const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  fileFilter: profilePhotoFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export { uploadsDir };