import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function normalizeCpf(cpf = "") {
    return String(cpf).replace(/\D/g, "").trim();
}

export async function register(req, res) {
    try {
        const name = req.body.name || req.body.nome;
        const cpf = normalizeCpf(req.body.cpf);
        const email = req.body.email;
        const password = req.body.password;
        const phone = req.body.phone || req.body.telefone;

        if (!name || !cpf || !email || !password) {
            return res.status(400).json({ error: "Campos obrigatorios: name, cpf, email e password" });
        }

        if (cpf.length !== 11) {
            return res.status(400).json({ error: "CPF invalido" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ error: "Email ja cadastrado" });
        }

        const existingCpf = await User.findOne({ cpf });
        if (existingCpf) {
            return res.status(409).json({ error: "CPF ja cadastrado" });
        }

        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: name.trim(),
            cpf,
            email: normalizedEmail,
            password: hash,
            phone,
            ativo: true,
        });

        const userObj = user.toObject();
        delete userObj.password;

        res.status(201).json(userObj);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function login(req, res){
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Campos obrigatorios: email e password" });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if(!user) return res.status(401).json({error: "Usuario nao encontrado"});

        // Compatibilidade com registros legados criados com senha em texto puro
        // (ex.: seeds antigos sem hash). Se bater, migra para hash no login.
        let valid = false;
        if (typeof user.password === "string") {
            if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$") || user.password.startsWith("$2y$")) {
                valid = await bcrypt.compare(password, user.password);
            } else {
                valid = password === user.password;
                if (valid) {
                    const migratedHash = await bcrypt.hash(password, 10);
                    await User.findOneAndUpdate({ _id: user._id }, { password: migratedHash });
                }
            }
        }

        if(!valid) return res.status(401).json({error: "Senha incorreta"});

        const token = jwt.sign(
            { id: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                cpf: user.cpf,
                email: user.email,
                phone: user.phone,
                isAdmin: user.isAdmin,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function forgotPassword(req, res) {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const cpf = normalizeCpf(req.body.cpf);
        const newPassword = req.body.newPassword;

        if (!email || !cpf || !newPassword) {
            return res.status(400).json({ error: "Campos obrigatorios: email, cpf e newPassword" });
        }

        if (cpf.length !== 11) {
            return res.status(400).json({ error: "CPF invalido" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "Usuario nao encontrado para este email" });
        }

        if (normalizeCpf(user.cpf) !== cpf) {
            return res.status(401).json({ error: "CPF nao confere com o usuario informado" });
        }

        const hash = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate(
            { _id: user._id },
            { password: hash },
            { new: false }
        );

        return res.status(200).json({ message: "Senha atualizada com sucesso" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}