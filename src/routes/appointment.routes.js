import { Router } from "express";
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
} from "../controllers/appointment.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  appointmentQuerySchema,
  createAppointmentBodySchema,
  idParamSchema,
  updateAppointmentBodySchema,
} from "../validation/schemas.js";

const router = Router();

router.use(auth);

router.post("/", validate({ body: createAppointmentBodySchema }), createAppointment);
router.get("/", validate({ query: appointmentQuerySchema }), getAppointments);
router.get("/:id", validate({ params: idParamSchema }), getAppointmentById);
router.put("/:id", validate({ params: idParamSchema, body: updateAppointmentBodySchema }), updateAppointment);
router.delete("/:id", validate({ params: idParamSchema }), deleteAppointment);

export default router;
