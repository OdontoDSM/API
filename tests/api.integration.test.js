import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {
  authRequest,
  initializeTestContext,
  loginAsAdmin,
  reseedDatabase,
  uniqueCpf,
  uniqueEmail,
} from "./helpers/testContext.js";

let app;
let token;

test.before(async () => {
  app = await initializeTestContext();
});

test.beforeEach(async () => {
  await reseedDatabase();
  token = await loginAsAdmin(app);
});

test("deve retornar 404 para rota inexistente", async () => {
  const response = await request(app).get("/api/rota-inexistente");
  assert.equal(response.status, 404);
});

test("deve bloquear rotas protegidas sem token", async () => {
  const response = await request(app).get("/api/users");
  assert.equal(response.status, 401);
  assert.equal(response.body.error, "Token ausente");
});

test("deve cobrir fluxo de auth", async () => {
  const authTest = await request(app).get("/api/auth/test");
  assert.equal(authTest.status, 200);

  const email = uniqueEmail("register");
  const cpf = uniqueCpf();

  const register = await request(app).post("/api/auth/register").send({
    name: "Usuario Teste Auth",
    cpf,
    email,
    password: "123456",
    phone: "11999999999",
  });
  assert.equal(register.status, 201);

  const login = await request(app).post("/api/auth/login").send({
    email,
    password: "123456",
  });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  assert.ok(login.body.refreshToken);

  const refresh = await request(app).post("/api/auth/refresh").send({
    refreshToken: login.body.refreshToken,
  });
  assert.equal(refresh.status, 200);
  assert.ok(refresh.body.token);

  const forgot = await request(app).post("/api/auth/forgot-password").send({
    email,
    cpf,
    newPassword: "654321",
  });
  assert.equal(forgot.status, 200);

  const loginWithNewPassword = await request(app).post("/api/auth/login").send({
    email,
    password: "654321",
  });
  assert.equal(loginWithNewPassword.status, 200);
});

test("deve cobrir CRUD de usuarios e upload de foto de perfil", async () => {
  const api = authRequest(app, token);

  const list = await api.get("/api/users");
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body));

  const create = await api.post("/api/users").send({
    name: "Usuario CRUD",
    cpf: uniqueCpf(),
    email: uniqueEmail("usercrud"),
    password: "123456",
    phone: "11988887777",
    isAdmin: false,
  });
  assert.equal(create.status, 201);
  const userId = create.body._id;
  assert.ok(userId);

  const getById = await api.get(`/api/users/${userId}`);
  assert.equal(getById.status, 200);

  const update = await api.put(`/api/users/${userId}`).send({
    name: "Usuario Atualizado",
    phone: "11900001111",
  });
  assert.equal(update.status, 200);
  assert.equal(update.body.name, "Usuario Atualizado");

  const upload = await api
    .put(`/api/users/${userId}/profile-photo`)
    .attach("photo", Buffer.from("fake-image"), {
      filename: "perfil.jpg",
      contentType: "image/jpeg",
    });
  assert.equal(upload.status, 200);
  assert.ok(upload.body.profilePhotoUrl);

  const remove = await api.delete(`/api/users/${userId}`);
  assert.equal(remove.status, 200);
});

test("deve cobrir CRUD de pacientes", async () => {
  const api = authRequest(app, token);

  const create = await api.post("/api/patients").send({
    name: "Paciente Teste",
    cpf: uniqueCpf(),
    birthDate: "1990-05-10",
    phone: "11977776666",
    address: "Rua Teste",
  });
  assert.equal(create.status, 201);
  const patientId = create.body._id;

  const list = await api.get("/api/patients");
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body));

  const getById = await api.get(`/api/patients/${patientId}`);
  assert.equal(getById.status, 200);

  const update = await api.put(`/api/patients/${patientId}`).send({
    address: "Rua Atualizada",
    allergies: "Nenhuma",
  });
  assert.equal(update.status, 200);

  const remove = await api.delete(`/api/patients/${patientId}`);
  assert.equal(remove.status, 200);
});

test("deve cobrir CRUD de tratamentos", async () => {
  const api = authRequest(app, token);

  const create = await api.post("/api/treatments").send({
    name: "Tratamento Integracao",
    description: "desc",
    basePrice: 350,
  });
  assert.equal(create.status, 201);
  const treatmentId = create.body._id;

  const list = await api.get("/api/treatments");
  assert.equal(list.status, 200);

  const getById = await api.get(`/api/treatments/${treatmentId}`);
  assert.equal(getById.status, 200);

  const update = await api.put(`/api/treatments/${treatmentId}`).send({
    basePrice: 420,
  });
  assert.equal(update.status, 200);
  assert.equal(update.body.basePrice, 420);

  const remove = await api.delete(`/api/treatments/${treatmentId}`);
  assert.equal(remove.status, 200);
});

test("deve cobrir CRUD de agendamentos", async () => {
  const api = authRequest(app, token);

  const patients = await api.get("/api/patients");
  const treatments = await api.get("/api/treatments");
  assert.equal(patients.status, 200);
  assert.equal(treatments.status, 200);

  const patientId = patients.body[0]._id;
  const treatmentId = treatments.body[0]._id;

  const create = await api.post("/api/appointments").send({
    patient: patientId,
    treatment: treatmentId,
    room: 99,
    dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: "Confirmado",
    notes: "Teste integracao",
  });
  assert.equal(create.status, 201);
  const appointmentId = create.body._id;

  const list = await api.get("/api/appointments");
  assert.equal(list.status, 200);

  const getById = await api.get(`/api/appointments/${appointmentId}`);
  assert.equal(getById.status, 200);

  const update = await api.put(`/api/appointments/${appointmentId}`).send({
    status: "Concluido",
  });
  assert.equal(update.status, 200);

  const remove = await api.delete(`/api/appointments/${appointmentId}`);
  assert.equal(remove.status, 200);
});

test("deve cobrir CRUD de orcamentos", async () => {
  const api = authRequest(app, token);
  const patients = await api.get("/api/patients");
  const treatments = await api.get("/api/treatments");

  const create = await api.post("/api/budgets").send({
    patient: patients.body[0]._id,
    treatment: treatments.body[0]._id,
    totalPrice: 500,
    paymentMethod: "PIX",
    status: "Pendente",
  });
  assert.equal(create.status, 201);
  const budgetId = create.body._id;

  const list = await api.get("/api/budgets");
  assert.equal(list.status, 200);

  const getById = await api.get(`/api/budgets/${budgetId}`);
  assert.equal(getById.status, 200);

  const update = await api.put(`/api/budgets/${budgetId}`).send({
    status: "Aprovado",
  });
  assert.equal(update.status, 200);

  const remove = await api.delete(`/api/budgets/${budgetId}`);
  assert.equal(remove.status, 200);
});

test("deve cobrir CRUD de prontuarios e busca por paciente", async () => {
  const api = authRequest(app, token);

  const createdPatient = await api.post("/api/patients").send({
    name: "Paciente Prontuario",
    cpf: uniqueCpf(),
    birthDate: "1991-07-07",
    phone: "11966665555",
  });
  assert.equal(createdPatient.status, 201);

  const create = await api.post("/api/medical-records").send({
    patient: createdPatient.body._id,
    appointmentHistory: "Historico inicial",
    clinicalNotes: "Notas iniciais",
  });
  assert.equal(create.status, 201);
  const recordId = create.body._id;

  const list = await api.get("/api/medical-records");
  assert.equal(list.status, 200);

  const byPatient = await api.get(`/api/medical-records/patient/${createdPatient.body._id}`);
  assert.equal(byPatient.status, 200);

  const getById = await api.get(`/api/medical-records/${recordId}`);
  assert.equal(getById.status, 200);

  const update = await api.put(`/api/medical-records/${recordId}`).send({
    clinicalNotes: "Notas atualizadas",
  });
  assert.equal(update.status, 200);

  const remove = await api.delete(`/api/medical-records/${recordId}`);
  assert.equal(remove.status, 200);
});

test("deve cobrir CRUD de pagamentos", async () => {
  const api = authRequest(app, token);
  const patients = await api.get("/api/patients");
  const treatments = await api.get("/api/treatments");

  const budget = await api.post("/api/budgets").send({
    patient: patients.body[0]._id,
    treatment: treatments.body[0]._id,
    totalPrice: 600,
    paymentMethod: "PIX",
    status: "Pendente",
  });
  assert.equal(budget.status, 201);

  const create = await api.post("/api/payments").send({
    budget: budget.body._id,
    amountPaid: 300,
    discount: 0,
    paymentMethod: "PIX",
    installments: 1,
    paymentDate: new Date().toISOString(),
    status: "Pendente",
  });
  assert.equal(create.status, 201);
  const paymentId = create.body._id;

  const list = await api.get("/api/payments");
  assert.equal(list.status, 200);

  const getById = await api.get(`/api/payments/${paymentId}`);
  assert.equal(getById.status, 200);

  const update = await api.put(`/api/payments/${paymentId}`).send({
    amountPaid: 250,
    status: "Pago",
  });
  assert.equal(update.status, 200);

  const remove = await api.delete(`/api/payments/${paymentId}`);
  assert.equal(remove.status, 200);
});

test("deve cobrir CRUD de arquivos com upload multipart", async () => {
  const api = authRequest(app, token);

  const createdPatient = await api.post("/api/patients").send({
    name: "Paciente Arquivo",
    cpf: uniqueCpf(),
    birthDate: "1988-03-12",
    phone: "11955554444",
  });
  assert.equal(createdPatient.status, 201);

  const record = await api.post("/api/medical-records").send({
    patient: createdPatient.body._id,
    appointmentHistory: "historico",
    clinicalNotes: "notas",
  });
  assert.equal(record.status, 201);

  const create = await api
    .post("/api/files")
    .field("medicalRecord", record.body._id)
    .field("fileType", "Exame")
    .attach("file", Buffer.from("fake-pdf"), {
      filename: "exame.pdf",
      contentType: "application/pdf",
    });

  assert.equal(create.status, 201);
  const fileId = create.body._id;

  const list = await api.get("/api/files");
  assert.equal(list.status, 200);

  const getById = await api.get(`/api/files/${fileId}`);
  assert.equal(getById.status, 200);

  const remove = await api.delete(`/api/files/${fileId}`);
  assert.equal(remove.status, 200);
});
