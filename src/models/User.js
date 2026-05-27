import mongoose from "mongoose";
import { adaptModel } from "../config/dbAdapter.js";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        alias: "nome"
    },
    cpf: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        trim: true,
        alias: "telefone"
    },
    profilePhotoUrl: {
        type: String,
        trim: true,
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    ativo: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default adaptModel(mongoose.model("User", UserSchema), "users");