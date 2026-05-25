import { clinicalNotes } from "./random.js";

export function makeMedicalRecord({ patientId, overrides = {} }) {
  return {
    patient: patientId,
    appointmentHistory: overrides.appointmentHistory ?? "Historico fake de consultas gerado pelo seed.",
    clinicalNotes: overrides.clinicalNotes ?? clinicalNotes(),
    ...overrides,
  };
}
