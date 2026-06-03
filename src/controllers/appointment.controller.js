import Appointment from "../models/Appointments.js";
import Budget from "../models/Budget.js";
import Payment from "../models/Payment.js";
import Patient from "../models/Patient.js";
import Treatment from "../models/Treatment.js";
import User from "../models/User.js";
import { serializeWithDecryptedCpf } from "../utils/cpfCrypto.js";
import { isValidDbId } from "../utils/idValidation.js";

function isValidObjectId(value) {
  return isValidDbId(value);
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function hasRoomConflict({ room, dateTime, ignoreId }) {
  const filter = {
    room,
    dateTime,
    status: { $ne: "Cancelado" },
  };

  if (ignoreId) {
    filter._id = { $ne: ignoreId };
  }

  const conflict = await Appointment.findOne(filter).select("_id");
  return Boolean(conflict);
}

function getEntityId(value) {
  if (!value) return null;
  if (typeof value === "object") return value._id || value.id || null;
  return value;
}

async function syncPendingBudgetFromAppointment(appointmentDoc) {
  if (!appointmentDoc || appointmentDoc.status !== "Concluido") {
    return;
  }

  const appointmentId = getEntityId(appointmentDoc._id || appointmentDoc.id);
  const patientId = getEntityId(appointmentDoc.patient);
  const treatmentId = getEntityId(appointmentDoc.treatment);

  if (!appointmentId || !patientId || !treatmentId) {
    return;
  }

  const treatmentDoc = await Treatment.findById(treatmentId).select("basePrice");
  const totalPrice = Number(treatmentDoc?.basePrice ?? 0);

  const payload = {
    patient: patientId,
    treatment: treatmentId,
    appointment: appointmentId,
    totalPrice: Number.isFinite(totalPrice) && totalPrice >= 0 ? totalPrice : 0,
  };

  const existingBudget = await Budget.findOne({ appointment: appointmentId }).select("_id");

  if (existingBudget?._id) {
    await Budget.findByIdAndUpdate(existingBudget._id, payload, {
      new: true,
      runValidators: true,
    });
    return;
  }

  await Budget.create({
    ...payload,
    paymentMethod: "PIX",
    status: "Pendente",
  });
}

async function syncPendingBudgetSafely(appointmentDoc) {
  try {
    await syncPendingBudgetFromAppointment(appointmentDoc);
  } catch (error) {
    console.warn("[appointment] Falha ao sincronizar orçamento pendente:", error?.message || error);
  }
}

export const createAppointment = async (req, res) => {
  try {
    const { patient, treatment, room, dateTime, status, notes } = req.body;
    const user = req.body.user || req.userId;

    if (!patient || !treatment || room === undefined || !dateTime) {
      return res
        .status(400)
        .json({ error: "Campos obrigatorios: patient, treatment, room e dateTime" });
    }

    if (!isValidObjectId(patient)) {
      return res.status(400).json({ error: "ID de paciente invalido" });
    }

    if (!isValidObjectId(treatment)) {
      return res.status(400).json({ error: "ID de tratamento invalido" });
    }

    if (!isValidObjectId(user)) {
      return res.status(400).json({ error: "ID de usuario invalido" });
    }

    const roomNumber = Number(room);
    if (!Number.isInteger(roomNumber) || roomNumber <= 0) {
      return res.status(400).json({ error: "Sala deve ser um numero inteiro positivo" });
    }

    const parsedDateTime = parseDate(dateTime);
    if (!parsedDateTime) {
      return res.status(400).json({ error: "dateTime invalido" });
    }

    const [patientExists, treatmentExists, userExists] = await Promise.all([
      Patient.exists({ _id: patient }),
      Treatment.exists({ _id: treatment }),
      User.exists({ _id: user }),
    ]);

    if (!patientExists) {
      return res.status(404).json({ error: "Paciente nao encontrado" });
    }

    if (!treatmentExists) {
      return res.status(404).json({ error: "Tratamento nao encontrado" });
    }

    if (!userExists) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const conflict = await hasRoomConflict({
      room: roomNumber,
      dateTime: parsedDateTime,
    });

    if (conflict) {
      return res
        .status(409)
        .json({ error: "Ja existe agendamento para esta sala neste horario" });
    }

    const appointment = await Appointment.create({
      patient,
      treatment,
      user,
      room: roomNumber,
      dateTime: parsedDateTime,
      status,
      notes,
    });

    await syncPendingBudgetSafely(appointment);

    const populated = await appointment.populate([
      { path: "patient", select: "name cpf phone" },
      { path: "treatment", select: "name description basePrice" },
      { path: "user", select: "name email" },
    ]);

    return res.status(201).json(serializeWithDecryptedCpf(populated));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAppointments = async (req, res) => {
  try {
    const query = req.validatedQuery ?? req.query;
    const { patient, treatment, user, room, status, startDate, endDate } = query;

    const filter = {};

    if (patient) {
      if (!isValidObjectId(patient)) {
        return res.status(400).json({ error: "ID de paciente invalido" });
      }
      filter.patient = patient;
    }
    if (treatment) {
      if (!isValidObjectId(treatment)) {
        return res.status(400).json({ error: "ID de tratamento invalido" });
      }
      filter.treatment = treatment;
    }

    if (user) {
      if (!isValidObjectId(user)) {
        return res.status(400).json({ error: "ID de usuario invalido" });
      }
      filter.user = user;
    }

    if (room !== undefined) {
      const roomNumber = Number(room);
      if (!Number.isInteger(roomNumber) || roomNumber <= 0) {
        return res.status(400).json({ error: "Sala invalida" });
      }
      filter.room = roomNumber;
    }

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.dateTime = {};

      if (startDate) {
        const parsedStart = parseDate(startDate);
        if (!parsedStart) {
          return res.status(400).json({ error: "startDate invalida" });
        }
        filter.dateTime.$gte = parsedStart;
      }

      if (endDate) {
        const parsedEnd = parseDate(endDate);
        if (!parsedEnd) {
          return res.status(400).json({ error: "endDate invalida" });
        }
        filter.dateTime.$lte = parsedEnd;
      }
    }

    const appointments = await Appointment.find(filter)
      .sort({ dateTime: 1 })
      .populate("patient", "name cpf phone")
      .populate("treatment", "name description basePrice")
      .populate("user", "name email");

    return res.status(200).json(serializeWithDecryptedCpf(appointments));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de agendamento invalido" });
    }

    let appointment = await Appointment.findById(id);

    if (appointment && typeof appointment.populate === "function") {
      appointment = await appointment.populate([
        { path: "patient", select: "name cpf phone" },
        { path: "treatment", select: "name description basePrice" },
        { path: "user", select: "name email" },
      ]);
    }

    if (!appointment) {
      return res.status(404).json({ error: "Agendamento nao encontrado" });
    }

    return res.status(200).json(serializeWithDecryptedCpf(appointment));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de agendamento invalido" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ error: "Agendamento nao encontrado" });
    }

    const nextRoom = req.body.room !== undefined ? Number(req.body.room) : appointment.room;
    const nextDateTime = req.body.dateTime ? parseDate(req.body.dateTime) : appointment.dateTime;
    const nextStatus = req.body.status || appointment.status;

    if (!Number.isInteger(nextRoom) || nextRoom <= 0) {
      return res.status(400).json({ error: "Sala deve ser um numero inteiro positivo" });
    }

    if (!nextDateTime) {
      return res.status(400).json({ error: "dateTime invalido" });
    }

    if (req.body.patient && !isValidObjectId(req.body.patient)) {
      return res.status(400).json({ error: "ID de paciente invalido" });
    }
    if (req.body.treatment && !isValidObjectId(req.body.treatment)) {
      return res.status(400).json({ error: "ID de tratamento invalido" });
    }

    if (req.body.user && !isValidObjectId(req.body.user)) {
      return res.status(400).json({ error: "ID de usuario invalido" });
    }

    if (req.body.patient) {
      const patientExists = await Patient.exists({ _id: req.body.patient });
      if (!patientExists) {
        return res.status(404).json({ error: "Paciente nao encontrado" });
      }
    }
    
    if (req.body.treatment) {
      const treatmentExists = await Treatment.exists({ _id: req.body.treatment });
      if (!treatmentExists) {
        return res.status(404).json({ error: "Tratamento nao encontrado" });
      }
    }

    if (req.body.user) {
      const userExists = await User.exists({ _id: req.body.user });
      if (!userExists) {
        return res.status(404).json({ error: "Usuario nao encontrado" });
      }
    }

    if (nextStatus !== "Cancelado") {
      const conflict = await hasRoomConflict({
        room: nextRoom,
        dateTime: nextDateTime,
        ignoreId: id,
      });

      if (conflict) {
        return res
          .status(409)
          .json({ error: "Ja existe agendamento para esta sala neste horario" });
      }
    }

    let updated = await Appointment.findByIdAndUpdate(
      id,
      {
        ...req.body,
        room: nextRoom,
        dateTime: nextDateTime,
      },
      { new: true, runValidators: true }
    );

    await syncPendingBudgetSafely(updated);

    if (updated && typeof updated.populate === "function") {
      updated = await updated.populate([
        { path: "patient", select: "name cpf phone" },
        { path: "treatment", select: "name description basePrice" },
        { path: "user", select: "name email" },
      ]);
    }

    return res.status(200).json(serializeWithDecryptedCpf(updated));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "ID de agendamento invalido" });
    }

    const appointment = await Appointment.findByIdAndDelete(id);

    if (!appointment) {
      return res.status(404).json({ error: "Agendamento nao encontrado" });
    }

    const relatedBudgets = await Budget.find({ appointment: id }).select("_id");

    for (const budget of relatedBudgets) {
      const payments = await Payment.find({ budget: budget._id }).select("_id isActive");

      for (const payment of payments) {
        if (payment?.isActive === false) {
          continue;
        }

        await Payment.findByIdAndUpdate(
          payment._id,
          { isActive: false },
          { new: true, runValidators: true }
        );
      }
    }

    await Budget.deleteMany({ appointment: id });

    return res.status(200).json({ message: "Agendamento removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
