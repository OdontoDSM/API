import { boolean, paymentMethod, randomInt } from "./random.js";

export function makeBudget({ patientId, treatmentId, overrides = {} }) {
  return {
    patient: patientId,
    treatment: treatmentId,
    totalPrice: overrides.totalPrice ?? randomInt(150, 2500),
    paymentMethod: overrides.paymentMethod ?? paymentMethod(),
    status: overrides.status ?? (boolean(0.6) ? "Aprovado" : "Pendente"),
    ...overrides,
  };
}
