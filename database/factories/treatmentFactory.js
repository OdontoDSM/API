import { randomInt, treatmentName } from "./random.js";

export function makeTreatment(overrides = {}) {
  const name = overrides.name ?? treatmentName();

  return {
    name,
    description: overrides.description ?? `Descricao fake para ${name.toLowerCase()}.`,
    basePrice: overrides.basePrice ?? randomInt(80, 1200),
    ...overrides,
  };
}
