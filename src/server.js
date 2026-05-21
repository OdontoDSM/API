import "dotenv/config";
import dns from "node:dns";
import app from "./app.js";
import { connectDB } from "./config/database.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

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