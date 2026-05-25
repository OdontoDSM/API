import { boolean, paymentMethod, randomInt, dateBetween } from "./random.js";

export function makePayment({ budgetId, amountPaid, overrides = {} }) {
  return {
    budget: budgetId,
    amountPaid: overrides.amountPaid ?? amountPaid ?? randomInt(100, 2500),
    discount: overrides.discount ?? randomInt(0, 250),
    paymentMethod: overrides.paymentMethod ?? paymentMethod(),
    installments: overrides.installments ?? randomInt(1, 6),
    paymentDate: overrides.paymentDate ?? dateBetween(60, 0),
    status: overrides.status ?? (boolean(0.75) ? "Pago" : "Pendente"),
    ...overrides,
  };
}
