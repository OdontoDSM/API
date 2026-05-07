import mongoose from "mongoose";

const uri = process.env.MONGO_URI;

export async function connectDB() {
  if (!uri) {
    throw new Error("Variavel de ambiente MONGO_URI nao definida.");
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(uri);
  console.log("Conectado ao MongoDB com sucesso.");
}