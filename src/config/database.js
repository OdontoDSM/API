import mongoose from "mongoose";
import { dbState } from "./dbState.js";

const ATLAS_URI = process.env.MONGO_URI;
const LOCAL_URI =
  process.env.MONGO_LOCAL_URI || "mongodb://localhost:27017/odontoCare";
const SQLITE_PATH = process.env.SQLITE_PATH || "./odontoCare.sqlite";

async function tryMongoConnect(uri, label) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    dbState.type = "mongodb";
    console.log(`[DB] Conectado ao MongoDB (${label}).`);
    return true;
  } catch (err) {
    console.warn(`[DB] MongoDB (${label}) indisponivel: ${err.message}`);
    // Garante que a conexão seja encerrada antes da próxima tentativa
    try {
      await mongoose.disconnect();
    } catch {
      // ignora erros de desconexão
    }
    return false;
  }
}

async function initSqlite() {
  try {
    const { default: Database } = await import("better-sqlite3");
    const db = new Database(SQLITE_PATH);
    dbState.type = "sqlite";
    dbState.sqlite = db;
    console.log(`[DB] Fallback: usando SQLite em "${SQLITE_PATH}".`);
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    console.error(
      `[DB] Fallback SQLite falhou: ${details}. Verifique se as dependencias da pasta API foram instaladas e se a versao do Node do ambiente e compativel com better-sqlite3.`
    );
    throw err;
  }
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  // 1. Tenta MongoDB Atlas
  if (ATLAS_URI) {
    if (await tryMongoConnect(ATLAS_URI, "Atlas")) return;
  } else {
    console.warn("[DB] MONGO_URI nao definida; pulando tentativa Atlas.");
  }

  // 2. Tenta MongoDB local
  if (await tryMongoConnect(LOCAL_URI, "local")) return;

  // 3. Fallback para SQLite
  console.warn("[DB] Nenhum MongoDB disponivel. Iniciando SQLite como fallback.");
  await initSqlite();
}

export function getDbType() {
  return dbState.type;
}