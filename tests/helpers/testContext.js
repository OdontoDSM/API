import request from "supertest";

let appInstance;
let seedDatabaseFn;

export async function initializeTestContext() {
  if (appInstance && seedDatabaseFn) {
    return appInstance;
  }

  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
  process.env.CPF_ENCRYPTION_KEY = process.env.CPF_ENCRYPTION_KEY || "test-cpf-secret";
  process.env.SQLITE_PATH = process.env.SQLITE_PATH || "./database.test.sqlite";
  process.env.PORT = process.env.PORT || "3000";

  const [{ connectDB }, { seedDatabase }, appModule] = await Promise.all([
    import("../../src/config/database.js"),
    import("../../database/seeders/seedDatabase.js"),
    import("../../src/app.js"),
  ]);

  await connectDB();
  seedDatabaseFn = seedDatabase;
  appInstance = appModule.default;

  return appInstance;
}

export async function reseedDatabase() {
  if (!seedDatabaseFn) {
    await initializeTestContext();
  }

  await seedDatabaseFn();
}

export async function loginAsAdmin(app) {
  const response = await request(app).post("/api/auth/login").send({
    email: "admin@admin.com",
    password: "123456",
  });

  if (response.status !== 200 || !response.body?.token) {
    throw new Error(`Falha ao autenticar admin para testes. status=${response.status}`);
  }

  return response.body.token;
}

export function authRequest(app, token) {
  return {
    get: (url) => request(app).get(url).set("Authorization", `Bearer ${token}`),
    post: (url) => request(app).post(url).set("Authorization", `Bearer ${token}`),
    put: (url) => request(app).put(url).set("Authorization", `Bearer ${token}`),
    delete: (url) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
  };
}

export function uniqueEmail(prefix = "test") {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

export function uniqueCpf() {
  const base = String(Date.now()).slice(-9);
  const suffix = String(Math.floor(Math.random() * 90) + 10);
  return `${base}${suffix}`;
}
