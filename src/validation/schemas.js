import { z } from "zod";
const objectIdSchema = z
  .string()
  .trim()
  .min(1, "ID invalido")
  .refine((value) => value.length > 0, "ID invalido");

const statusAppointment = [
  "Confirmado",
  "Cancelado",
  "Falta",
  "Concluido",
  "Aguardando confirmacao",
];

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const patientIdParamSchema = z.object({
  patientId: objectIdSchema,
});

export const registerBodySchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    nome: z.string().trim().min(2).optional(),
    cpf: z.string().trim().min(11),
    email: z.string().trim().email(),
    password: z.string().min(6),
    phone: z.string().trim().optional(),
    telefone: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.name || data.nome), {
    message: "Informe name ou nome",
    path: ["name"],
  });

export const loginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const forgotPasswordBodySchema = z.object({
  email: z.string().trim().email(),
  cpf: z.string().trim().min(11),
  newPassword: z.string().min(6),
});

export const createUserBodySchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    nome: z.string().trim().min(2).optional(),
    cpf: z.string().trim().min(11),
    email: z.string().trim().email(),
    password: z.string().min(6),
    phone: z.string().trim().optional(),
    telefone: z.string().trim().optional(),
    isAdmin: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.name || data.nome), {
    message: "Informe name ou nome",
    path: ["name"],
  });

export const updateUserBodySchema = z.object({
  name: z.string().trim().min(2).optional(),
  nome: z.string().trim().min(2).optional(),
  cpf: z.string().trim().min(11).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
  isAdmin: z.boolean().optional(),
  ativo: z.boolean().optional(),
});

export const createPatientBodySchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    nome: z.string().trim().min(2).optional(),
    cpf: z.string().trim().min(11),
    birthDate: z.coerce.date(),
    phone: z.string().trim().min(8).optional(),
    telefone: z.string().trim().min(8).optional(),
    address: z.string().trim().optional(),
    insurance: z.string().trim().optional(),
    medicalNotes: z.string().trim().optional(),
    allergies: z.string().trim().optional(),
    anamnesis: z.string().trim().optional(),
    emergencyContact: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.name || data.nome), {
    message: "Informe name ou nome",
    path: ["name"],
  })
  .refine((data) => Boolean(data.phone || data.telefone), {
    message: "Informe phone ou telefone",
    path: ["phone"],
  });

export const updatePatientBodySchema = z.object({
  name: z.string().trim().min(2).optional(),
  nome: z.string().trim().min(2).optional(),
  cpf: z.string().trim().min(11).optional(),
  birthDate: z.coerce.date().optional(),
  phone: z.string().trim().min(8).optional(),
  telefone: z.string().trim().min(8).optional(),
  address: z.string().trim().optional(),
  insurance: z.string().trim().optional(),
  medicalNotes: z.string().trim().optional(),
  allergies: z.string().trim().optional(),
  anamnesis: z.string().trim().optional(),
  emergencyContact: z.string().trim().optional(),
});

export const createAppointmentBodySchema = z.object({
  patient: objectIdSchema,
  treatment: objectIdSchema,
  user: objectIdSchema.optional(),
  room: z.coerce.number().int().positive(),
  dateTime: z.coerce.date(),
  status: z.enum(statusAppointment).optional(),
  notes: z.string().trim().optional(),
});

export const updateAppointmentBodySchema = z.object({
  patient: objectIdSchema.optional(),
  treatment: objectIdSchema.optional(),
  user: objectIdSchema.optional(),
  room: z.coerce.number().int().positive().optional(),
  dateTime: z.coerce.date().optional(),
  status: z.enum(statusAppointment).optional(),
  notes: z.string().trim().optional(),
});

export const appointmentQuerySchema = z.object({
  patient: objectIdSchema.optional(),
  treatment: objectIdSchema.optional(),
  user: objectIdSchema.optional(),
  room: z.coerce.number().int().positive().optional(),
  status: z.enum(statusAppointment).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const createTreatmentBodySchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  basePrice: z.coerce.number().min(0),
});

export const updateTreatmentBodySchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().optional(),
  basePrice: z.coerce.number().min(0).optional(),
});

export const createBudgetBodySchema = z.object({
  patient: objectIdSchema,
  treatment: objectIdSchema,
  appointment: objectIdSchema.optional(),
  totalPrice: z.coerce.number().min(0),
  paymentMethod: z.enum(["Dinheiro", "Credito", "PIX", "Transferencia"]),
  status: z.enum(["Pendente", "Aprovado", "Recusado"]).optional(),
});

export const updateBudgetBodySchema = z.object({
  patient: objectIdSchema.optional(),
  treatment: objectIdSchema.optional(),
  appointment: objectIdSchema.optional(),
  totalPrice: z.coerce.number().min(0).optional(),
  paymentMethod: z.enum(["Dinheiro", "Credito", "PIX", "Transferencia"]).optional(),
  status: z.enum(["Pendente", "Aprovado", "Recusado"]).optional(),
});

export const budgetQuerySchema = z.object({
  patient: objectIdSchema.optional(),
  appointment: objectIdSchema.optional(),
  status: z.enum(["Pendente", "Aprovado", "Recusado"]).optional(),
});

export const createMedicalRecordBodySchema = z.object({
  patient: objectIdSchema,
  appointmentHistory: z.string().trim().optional(),
  clinicalNotes: z.string().trim().optional(),
});

export const updateMedicalRecordBodySchema = z.object({
  appointmentHistory: z.string().trim().optional(),
  clinicalNotes: z.string().trim().optional(),
});

export const createPaymentBodySchema = z.object({
  budget: objectIdSchema,
  amountPaid: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  paymentMethod: z.enum(["Dinheiro", "Cartao", "PIX", "Transferencia"]),
  installments: z.coerce.number().int().min(1).optional(),
  paymentDate: z.coerce.date(),
  status: z.enum(["Pago", "Pendente"]).optional(),
});

export const updatePaymentBodySchema = z.object({
  budget: objectIdSchema.optional(),
  amountPaid: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
  paymentMethod: z.enum(["Dinheiro", "Cartao", "PIX", "Transferencia"]).optional(),
  installments: z.coerce.number().int().min(1).optional(),
  paymentDate: z.coerce.date().optional(),
  status: z.enum(["Pago", "Pendente"]).optional(),
});

export const paymentQuerySchema = z.object({
  budget: objectIdSchema.optional(),
  status: z.enum(["Pago", "Pendente"]).optional(),
});

export const createFileBodySchema = z.object({
  medicalRecord: objectIdSchema,
  fileType: z.enum(["Exame", "Radiografia", "Foto"]),
  fileUrl: z.string().trim().min(1),
});

export const fileQuerySchema = z.object({
  medicalRecord: objectIdSchema.optional(),
  fileType: z.enum(["Exame", "Radiografia", "Foto"]).optional(),
});
