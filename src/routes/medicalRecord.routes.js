import { Router } from "express";
import {
  createMedicalRecord,
  getMedicalRecords,
  getMedicalRecordById,
  getMedicalRecordByPatient,
  updateMedicalRecord,
  deleteMedicalRecord,
} from "../controllers/medicalRecord.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createMedicalRecordBodySchema,
  idParamSchema,
  patientIdParamSchema,
  updateMedicalRecordBodySchema,
} from "../validation/schemas.js";

const router = Router();

router.use(auth);

router.post("/", validate({ body: createMedicalRecordBodySchema }), createMedicalRecord);
router.get("/", getMedicalRecords);
router.get("/patient/:patientId", validate({ params: patientIdParamSchema }), getMedicalRecordByPatient);
router.get("/:id", validate({ params: idParamSchema }), getMedicalRecordById);
router.put("/:id", validate({ params: idParamSchema, body: updateMedicalRecordBodySchema }), updateMedicalRecord);
router.delete("/:id", validate({ params: idParamSchema }), deleteMedicalRecord);

export default router;
