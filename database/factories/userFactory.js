import { boolean, cpf, emailFromName, fullName, phoneNumber } from "./random.js";
import { buildSecuredCpf } from "../../src/utils/cpfCrypto.js";

export function makeUser(overrides = {}) {
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
    email: overrides.email ?? emailFromName(name),
    password: overrides.password ?? "123456",
    phone: overrides.phone ?? phoneNumber(),
    isAdmin: overrides.isAdmin ?? boolean(0.2),
    ativo: overrides.ativo ?? true,
    ...overrides,
  };
}
