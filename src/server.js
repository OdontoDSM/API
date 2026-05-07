import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/database.js";

async function startServer() {
  try {
    await connectDB();
    app.listen(process.env.PORT, () => {
      console.log(`Servidor rodando na porta ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

startServer();