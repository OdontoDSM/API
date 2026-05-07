import mongoose from "mongoose";

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

export default mongoose.model("Treatment", TreatmentSchema);