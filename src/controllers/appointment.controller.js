import mongoose from "mongoose";
import Appointment from "../models/Appointments.js";
import Patient from "../models/Patient.js";
import User from "../models/User.js";
import { serializeWithDecryptedCpf } from "../utils/cpfCrypto.js";

function isValidObjectId(value) {
  return mongoose.isValidObjectId(value);
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

export const createAppointment = async (req, res) => {
  try {
    const { patient, room, dateTime, status, notes } = req.body;
    const user = req.body.user || req.userId;

    if (!patient || room === undefined || !dateTime) {
      return res
        .status(400)
        .json({ error: "Campos obrigatorios: patient, room e dateTime" });
    }

    if (!isValidObjectId(patient)) {
      return res.status(400).json({ error: "ID de paciente invalido" });
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

    const [patientExists, userExists] = await Promise.all([
      Patient.exists({ _id: patient }),
      User.exists({ _id: user }),
    ]);

    if (!patientExists) {
      return res.status(404).json({ error: "Paciente nao encontrado" });
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
      user,
      room: roomNumber,
      dateTime: parsedDateTime,
      status,
      notes,
    });

    const populated = await appointment.populate([
      { path: "patient", select: "name cpf phone" },
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
    const { patient, user, room, status, startDate, endDate } = query;

    const filter = {};

    if (patient) {
      if (!isValidObjectId(patient)) {
        return res.status(400).json({ error: "ID de paciente invalido" });
      }
      filter.patient = patient;
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

    if (req.body.user && !isValidObjectId(req.body.user)) {
      return res.status(400).json({ error: "ID de usuario invalido" });
    }

    if (req.body.patient) {
      const patientExists = await Patient.exists({ _id: req.body.patient });
      if (!patientExists) {
        return res.status(404).json({ error: "Paciente nao encontrado" });
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

    if (updated && typeof updated.populate === "function") {
      updated = await updated.populate([
        { path: "patient", select: "name cpf phone" },
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

    return res.status(200).json({ message: "Agendamento removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
