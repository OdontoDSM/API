import mongoose from "mongoose";
import { adaptModel } from "../config/dbAdapter.js";

const TreatmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    basePrice: {
        type: Number,
        required: true,
    },
}, { timestamps: true });

export default adaptModel(mongoose.model("Treatment", TreatmentSchema), "treatments");