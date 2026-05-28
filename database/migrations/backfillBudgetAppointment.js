import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../../src/config/database.js";
import { getDbType } from "../../src/config/database.js";
import Budget from "../../src/models/Budget.js";
import Payment from "../../src/models/Payment.js";
import Appointment from "../../src/models/Appointments.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const APPLY = process.argv.includes("--apply");

function toDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function pickAnchorDate(budget, paymentsByBudgetId) {
  const payments = paymentsByBudgetId.get(String(budget._id)) || [];

  if (payments.length > 0) {
    const latestPayment = payments.reduce((latest, current) => {
      const latestDate = toDate(latest.paymentDate) || new Date(0);
      const currentDate = toDate(current.paymentDate) || new Date(0);
      return currentDate > latestDate ? current : latest;
    }, payments[0]);

    const paymentDate = toDate(latestPayment.paymentDate);
    if (paymentDate) return paymentDate;
  }

  return toDate(budget.updatedAt) || toDate(budget.createdAt) || toDate(budget.createdDate);
}

function chooseAppointment(anchorDate, appointments) {
  if (!anchorDate || !appointments || appointments.length === 0) {
    return { appointmentId: null, reason: "no_candidates" };
  }

  const scored = appointments
    .map((appt) => {
      const apptDate = toDate(appt.dateTime);
      if (!apptDate) return null;
      return {
        appointmentId: String(appt._id),
        dateTime: apptDate,
        diffMs: Math.abs(apptDate.getTime() - anchorDate.getTime()),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.diffMs - b.diffMs);

  if (scored.length === 0) {
    return { appointmentId: null, reason: "invalid_candidate_dates" };
  }

  const sameDayCandidates = scored.filter((c) => sameDay(c.dateTime, anchorDate));

  if (sameDayCandidates.length === 1) {
    return { appointmentId: sameDayCandidates[0].appointmentId, reason: "same_day_unique" };
  }

  if (sameDayCandidates.length > 1) {
    const best = sameDayCandidates[0];
    const second = sameDayCandidates[1];

    if (second.diffMs - best.diffMs >= 2 * 60 * 60 * 1000) {
      return { appointmentId: best.appointmentId, reason: "same_day_closest_unique" };
    }

    return { appointmentId: null, reason: "ambiguous_same_day" };
  }

  const best = scored[0];
  const second = scored[1];

  if (best.diffMs > 7 * DAY_MS) {
    return { appointmentId: null, reason: "nearest_too_far" };
  }

  if (!second || second.diffMs - best.diffMs >= DAY_MS) {
    return { appointmentId: best.appointmentId, reason: "nearest_unique" };
  }

  return { appointmentId: null, reason: "ambiguous_nearest" };
}

async function main() {
  await connectDB();

  if (getDbType() !== "mongodb") {
    throw new Error("Esta migracao requer MongoDB ativo (nao suporta fallback SQLite).");
  }

  const budgets = await Budget.find({
    $or: [{ appointment: { $exists: false } }, { appointment: null }],
  })
    .select("_id patient appointment createdAt updatedAt createdDate")
    .lean();

  if (budgets.length === 0) {
    console.log("[BUDGET_APPOINTMENT_BACKFILL] Nenhum budget pendente de vinculo.");
    return;
  }

  const budgetIds = budgets.map((b) => b._id);
  const patientIds = [...new Set(budgets.map((b) => String(b.patient)).filter(Boolean))].map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  const [payments, appointments] = await Promise.all([
    Payment.find({ budget: { $in: budgetIds } })
      .select("_id budget paymentDate")
      .lean(),
    Appointment.find({ patient: { $in: patientIds } })
      .select("_id patient dateTime")
      .lean(),
  ]);

  const paymentsByBudgetId = new Map();
  for (const p of payments) {
    const key = String(p.budget);
    if (!paymentsByBudgetId.has(key)) paymentsByBudgetId.set(key, []);
    paymentsByBudgetId.get(key).push(p);
  }

  const appointmentsByPatientId = new Map();
  for (const appt of appointments) {
    const key = String(appt.patient);
    if (!appointmentsByPatientId.has(key)) appointmentsByPatientId.set(key, []);
    appointmentsByPatientId.get(key).push(appt);
  }

  const stats = {
    totalBudgetsWithoutAppointment: budgets.length,
    eligibleForUpdate: 0,
    updated: 0,
    skipped: {},
  };

  const preview = [];

  for (const budget of budgets) {
    const patientKey = String(budget.patient || "");
    const anchorDate = pickAnchorDate(budget, paymentsByBudgetId);
    const candidates = appointmentsByPatientId.get(patientKey) || [];
    const picked = chooseAppointment(anchorDate, candidates);

    if (!picked.appointmentId) {
      stats.skipped[picked.reason] = (stats.skipped[picked.reason] || 0) + 1;
      continue;
    }

    stats.eligibleForUpdate += 1;

    preview.push({
      budgetId: String(budget._id),
      patientId: patientKey,
      appointmentId: picked.appointmentId,
      reason: picked.reason,
      anchorDate: anchorDate ? anchorDate.toISOString() : null,
    });

    if (APPLY) {
      await Budget.updateOne(
        { _id: budget._id },
        { $set: { appointment: picked.appointmentId } }
      );
      stats.updated += 1;
    }
  }

  console.log("\n[BUDGET_APPOINTMENT_BACKFILL] RESUMO");
  console.log(`- dryRun: ${!APPLY}`);
  console.log(`- totalBudgetsWithoutAppointment: ${stats.totalBudgetsWithoutAppointment}`);
  console.log(`- eligibleForUpdate: ${stats.eligibleForUpdate}`);
  console.log(`- updated: ${stats.updated}`);
  console.log(`- skippedByReason: ${JSON.stringify(stats.skipped)}`);

  const sample = preview.slice(0, 20);
  if (sample.length > 0) {
    console.log("\n[BUDGET_APPOINTMENT_BACKFILL] PRIMEIROS ITENS");
    for (const item of sample) {
      console.log(
        `- budget=${item.budgetId} appointment=${item.appointmentId} reason=${item.reason} anchor=${item.anchorDate}`
      );
    }
  }

  if (!APPLY) {
    console.log(
      "\n[BUDGET_APPOINTMENT_BACKFILL] Execute novamente com --apply para persistir as atualizacoes."
    );
  }
}

main().catch((error) => {
  console.error("[BUDGET_APPOINTMENT_BACKFILL] falha:", error);
  process.exit(1);
});
