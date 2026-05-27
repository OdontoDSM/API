import express from 'express';
import cors from 'cors';
import path from "path";
import authRoutes from "./routes/auth.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import treatmentRoutes from "./routes/treatment.routes.js";
import budgetRoutes from "./routes/budget.routes.js";
import medicalRecordRoutes from "./routes/medicalRecord.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import fileRoutes from "./routes/file.routes.js";
import userRoutes from "./routes/user.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/treatments", treatmentRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/users", userRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;