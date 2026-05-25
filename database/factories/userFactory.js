import { boolean, emailFromName, fullName, phoneNumber } from "./random.js";

export function makeUser(overrides = {}) {
  const name = overrides.name ?? fullName();

  return {
    name,
    email: overrides.email ?? emailFromName(name),
    password: overrides.password ?? "123456",
    phone: overrides.phone ?? phoneNumber(),
    isAdmin: overrides.isAdmin ?? boolean(0.2),
    ativo: overrides.ativo ?? true,
    ...overrides,
  };
}
