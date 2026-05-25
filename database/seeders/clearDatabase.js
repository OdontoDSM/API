import Appointment from "../../src/models/Appointments.js";
import Budget from "../../src/models/Budget.js";
import File from "../../src/models/File.js";
import MedicalRecord from "../../src/models/MedicalRecord.js";
import Patient from "../../src/models/Patient.js";
import Payment from "../../src/models/Payment.js";
import Treatment from "../../src/models/Treatment.js";
import User from "../../src/models/User.js";

export async function clearDatabase() {
  await Promise.all([
    Appointment.deleteMany({}),
    Budget.deleteMany({}),
    File.deleteMany({}),
    MedicalRecord.deleteMany({}),
    Patient.deleteMany({}),
    Payment.deleteMany({}),
    Treatment.deleteMany({}),
    User.deleteMany({}),
  ]);
}
