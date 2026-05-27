import { address, cpf, dateBetween, fullName, phoneNumber } from "./random.js";
import { buildSecuredCpf } from "../../src/utils/cpfCrypto.js";

export function makePatient(overrides = {}) {
  const name = overrides.name ?? fullName();
  const rawCpf = overrides.cpf ?? cpf();
  const hasCustomCpfHash = typeof overrides.cpfHash === "string" && overrides.cpfHash.length > 0;
  const securedCpf = hasCustomCpfHash
    ? { cpf: rawCpf, cpfHash: overrides.cpfHash }
    : buildSecuredCpf(rawCpf);

  return {
    name,
    cpf: securedCpf.cpf,
    cpfHash: securedCpf.cpfHash,
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
