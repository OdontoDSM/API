import Appointment from "../../src/models/Appointments.js";
import Budget from "../../src/models/Budget.js";
import File from "../../src/models/File.js";
import MedicalRecord from "../../src/models/MedicalRecord.js";
import Patient from "../../src/models/Patient.js";
import Payment from "../../src/models/Payment.js";
import Treatment from "../../src/models/Treatment.js";
import User from "../../src/models/User.js";
import { clearDatabase } from "./clearDatabase.js";
import { makeAppointment } from "../factories/appointmentFactory.js";
import { makeBudget } from "../factories/budgetFactory.js";
import { makeFile } from "../factories/fileFactory.js";
import { makeMedicalRecord } from "../factories/medicalRecordFactory.js";
import { makePatient } from "../factories/patientFactory.js";
import { makePayment } from "../factories/paymentFactory.js";
import { makeTreatment } from "../factories/treatmentFactory.js";
import { makeUser } from "../factories/userFactory.js";

const defaultCounts = {
  users: 6,
  patients: 12,
  treatments: 8,
  appointments: 18,
  budgets: 10,
  payments: 8,
  medicalRecords: 12,
  files: 14,
};

function selectRandom(array, index) {
  return array[index % array.length];
}

export async function seedDatabase(options = {}) {
  const counts = { ...defaultCounts, ...options };

  await clearDatabase();

  const users = await User.insertMany([
    makeUser({ name: "Admin OdontoCare", email: "admin@admin.com", password: "123456", isAdmin: true }),
    ...Array.from({ length: counts.users - 1 }, (_, index) =>
      makeUser({
        password: "123456",
        isAdmin: index % 4 === 0,
      })
    ),
  ]);

  const patients = await Patient.insertMany(
    Array.from({ length: counts.patients }, () => makePatient())
  );

  const treatments = await Treatment.insertMany(
    Array.from({ length: counts.treatments }, () => makeTreatment())
  );

  const medicalRecords = await MedicalRecord.insertMany(
    patients.map((patient, index) =>
      makeMedicalRecord({
        patientId: patient._id,
        overrides: {
          appointmentHistory: `Historico fake do paciente ${index + 1}.`,
        },
      })
    )
  );

  const appointments = [];
  for (let index = 0; index < counts.appointments; index += 1) {
    const patient = selectRandom(patients, index);
    const user = selectRandom(users, index + 1);

    appointments.push(
      makeAppointment({
        patientId: patient._id,
        userId: user._id,
        overrides: {
          room: (index % 6) + 1,
        },
      })
    );
  }

  const appointmentDocs = await Appointment.insertMany(appointments);

  const budgets = await Budget.insertMany(
    Array.from({ length: counts.budgets }, (_, index) => {
      const patient = selectRandom(patients, index);
      const treatment = selectRandom(treatments, index + 2);

      return makeBudget({
        patientId: patient._id,
        treatmentId: treatment._id,
        overrides: {
          totalPrice: treatment.basePrice + (index % 3) * 100,
        },
      });
    })
  );

  const payments = await Payment.insertMany(
    Array.from({ length: Math.min(counts.payments, budgets.length) }, (_, index) => {
      const budget = budgets[index];
      return makePayment({
        budgetId: budget._id,
        amountPaid: budget.totalPrice,
        overrides: {
          status: index % 3 === 0 ? "Pendente" : "Pago",
        },
      });
    })
  );

  const files = await File.insertMany(
    Array.from({ length: counts.files }, (_, index) => {
      const record = selectRandom(medicalRecords, index);

      return makeFile({
        medicalRecordId: record._id,
        overrides: {
          fileUrl: `https://example.com/uploads/record-${index + 1}.jpg`,
        },
      });
    })
  );

  return {
    users,
    patients,
    treatments,
    appointments: appointmentDocs,
    budgets,
    payments,
    medicalRecords,
    files,
  };
}
