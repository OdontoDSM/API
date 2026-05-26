import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

function normalizeUserPayload(payload = {}) {
  const normalized = {
    ...payload,
    name: payload.name || payload.nome,
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
  return user;
}

export const createUser = async (req, res) => {
  try {
    const payload = normalizeUserPayload(req.body);
    const { name, email, password, phone, isAdmin } = payload;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Campos obrigatorios: name, email e password" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: "Email ja cadastrado" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
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

    if (!mongoose.isValidObjectId(id)) {
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

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de usuario invalido" });
    }

    const payload = normalizeUserPayload(req.body);

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

    if (!mongoose.isValidObjectId(id)) {
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
