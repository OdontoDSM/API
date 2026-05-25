import { appointmentNotes, appointmentStatus, futureDateBetween, randomInt } from "./random.js";

export function makeAppointment({ patientId, userId, overrides = {} }) {
  return {
    patient: patientId,
    user: userId,
    room: overrides.room ?? randomInt(1, 8),
    dateTime: overrides.dateTime ?? futureDateBetween(1, 45),
    status: overrides.status ?? appointmentStatus(),
    notes: overrides.notes ?? appointmentNotes(),
    ...overrides,
  };
}
