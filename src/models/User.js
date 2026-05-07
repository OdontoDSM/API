import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        alias: "nome"
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
    isAdmin: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export default mongoose.model("User", UserSchema);