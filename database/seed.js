import "dotenv/config";
import { connectDB } from "../src/config/database.js";
import { seedDatabase } from "./seeders/seedDatabase.js";

async function main() {
  await connectDB();

  const result = await seedDatabase();

  console.log("Seed concluido com sucesso.");
  console.log(`Usuarios: ${result.users.length}`);
  console.log(`Pacientes: ${result.patients.length}`);
  console.log(`Consultas: ${result.appointments.length}`);
  console.log(`Orcamentos: ${result.budgets.length}`);
  console.log(`Pagamentos: ${result.payments.length}`);
}

main().catch((error) => {
  console.error("Falha ao executar seed:", error);
  process.exit(1);
});
