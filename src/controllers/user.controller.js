import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import User from "../models/User.js";
import { uploadsDir } from "../middleware/upload.middleware.js";
import { isValidDbId } from "../utils/idValidation.js";
import {
  buildSecuredCpf,
  hashCpf,
  normalizeCpf,
  serializeWithDecryptedCpf,
} from "../utils/cpfCrypto.js";

function normalizeUserPayload(payload = {}) {
  const normalized = {
    ...payload,
    name: payload.name || payload.nome,
    cpf: payload.cpf,
    phone: payload.phone || payload.telefone,
  };

  delete normalized.nome;
  delete normalized.telefone;

  return normalized;
}

function sanitizeUser(userDoc) {
  if (!userDoc) return null;
  const user = typeof userDoc.toObject === "function" ? userDoc.toObject() : userDoc;
  delete user.password;
  return serializeWithDecryptedCpf(user);
}

function buildPublicUploadUrl(req, uploadedFile) {
  const absolutePath = uploadedFile.path || "";
  const relativePath = path
    .relative(uploadsDir, absolutePath)
    .split(path.sep)
    .join("/");

  return `${req.protocol}://${req.get("host")}/uploads/${relativePath}`;
}

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

export const createUser = async (req, res) => {
  try {
    const payload = normalizeUserPayload(req.body);
    const { name, email, password, phone, isAdmin } = payload;
    const cpf = normalizeCpf(payload.cpf);

    if (!name || !cpf || !email || !password) {
      return res
        .status(400)
        .json({ error: "Campos obrigatorios: name, cpf, email e password" });
    }

    if (cpf.length !== 11) {
      return res.status(400).json({ error: "CPF invalido" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: "Email ja cadastrado" });
    }

    const cpfHash = hashCpf(cpf);
    let existingCpf = await User.findOne({ cpfHash });
    if (!existingCpf) {
      existingCpf = await User.findOne({ cpf });
    }
    if (existingCpf) {
      return res.status(409).json({ error: "CPF ja cadastrado" });
    }

    const securedCpf = buildSecuredCpf(cpf);

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      cpf: securedCpf.cpf,
      cpfHash: securedCpf.cpfHash,
      email: normalizedEmail,
      password: hash,
      phone,
      isAdmin,
      ativo: true,
    });

    return res.status(201).json(sanitizeUser(user));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === "true" ? {} : { ativo: true };

    const users = await User.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(users.map(sanitizeUser));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de usuario invalido" });
    }

    const user = await User.findOne({ _id: id, ativo: true });
    if (!user) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    return res.status(200).json(sanitizeUser(user));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de usuario invalido" });
    }

    const payload = normalizeUserPayload(req.body);

    if (payload.cpf !== undefined) {
      const cpf = normalizeCpf(payload.cpf);
      if (cpf.length !== 11) {
        return res.status(400).json({ error: "CPF invalido" });
      }

      const cpfHash = hashCpf(cpf);

      let existingCpf = await User.findOne({
        cpfHash,
        _id: { $ne: id },
      });

      if (!existingCpf) {
        existingCpf = await User.findOne({
          cpf,
          _id: { $ne: id },
        });
      }

      if (existingCpf) {
        return res.status(409).json({ error: "CPF ja cadastrado" });
      }

      const securedCpf = buildSecuredCpf(cpf);
      payload.cpf = securedCpf.cpf;
      payload.cpfHash = securedCpf.cpfHash;
    }

    if (payload.email) {
      payload.email = payload.email.trim().toLowerCase();
      const existingUser = await User.findOne({
        email: payload.email,
        _id: { $ne: id },
      });
      if (existingUser) {
        return res.status(409).json({ error: "Email ja cadastrado" });
      }
    }

    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    const user = await User.findOneAndUpdate(
      { _id: id, ativo: true },
      payload,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    return res.status(200).json(sanitizeUser(user));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de usuario invalido" });
    }

    const user = await User.findOneAndUpdate(
      { _id: id, ativo: true },
      { ativo: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    return res.status(200).json({ message: "Usuario desativado com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateProfilePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const uploadedFile = req.file;

    if (!isValidDbId(id)) {
      return res.status(400).json({ error: "ID de usuario invalido" });
    }

    if (!uploadedFile) {
      return res.status(400).json({ error: "Arquivo de foto obrigatorio" });
    }

    const user = await User.findOne({ _id: id, ativo: true });
    if (!user) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const previousPhotoPath = resolveUploadedFilePath(user.profilePhotoUrl);
    user.profilePhotoUrl = buildPublicUploadUrl(req, uploadedFile);
    await user.save();

    if (previousPhotoPath) {
      await fs.unlink(previousPhotoPath).catch(() => null);
    }

    return res.status(200).json(sanitizeUser(user));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
