import { address, cpf, dateBetween, fullName, phoneNumber } from "./random.js";

export function makePatient(overrides = {}) {
  const name = overrides.name ?? fullName();

  return {
    name,
    cpf: overrides.cpf ?? cpf(),
    birthDate: overrides.birthDate ?? dateBetween(40 * 365, 20 * 365),
    phone: overrides.phone ?? phoneNumber(),
    address: overrides.address ?? address(),
    insurance: overrides.insurance ?? "Particular",
    medicalNotes: overrides.medicalNotes ?? "",
    allergies: overrides.allergies ?? "Nenhuma",
    anamnesis: overrides.anamnesis ?? "Sem restricoes relevantes.",
    emergencyContact: overrides.emergencyContact ?? phoneNumber(),
    ...overrides,
  };
}
