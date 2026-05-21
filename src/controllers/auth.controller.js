import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function register(req, res) {
    try {
        const name = req.body.name || req.body.nome;
        const email = req.body.email;
        const password = req.body.password;
        const phone = req.body.phone || req.body.telefone;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Campos obrigatorios: name, email e password" });
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
        });

        const userObj = user.toObject();
        delete userObj.password;

        return res.status(201).json(userObj);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Campos obrigatorios: email e password" });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });

        if (!user) {
            return res.status(401).json({ error: "Usuario nao encontrado" });
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(401).json({ error: "Senha incorreta" });
        }

        const token = jwt.sign(
            { id: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                isAdmin: user.isAdmin,
            },
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

export async function resetPassword(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Campos obrigatorios: email e password"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: "A senha deve ter pelo menos 6 caracteres"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({
                error: "Usuario nao encontrado"
            });
        }

        const hash = await bcrypt.hash(password, 10);

        user.password = hash;
        await user.save();

        return res.status(200).json({
            message: "Senha alterada com sucesso"
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}