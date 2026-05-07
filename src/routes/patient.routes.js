import { Router } from "express";
import {
    createPatient,
    getPatients,
    getPatientById,
    updatePatient,
    deletePatient
} from "../controllers/patient.controller.js";

import {auth} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
    createPatientBodySchema,
    idParamSchema,
    updatePatientBodySchema,
} from "../validation/schemas.js";

const router = Router();
router.use(auth);

router.post("/", validate({ body: createPatientBodySchema }), createPatient);
router.get("/", getPatients);
router.get("/:id", validate({ params: idParamSchema }), getPatientById);
router.put("/:id", validate({ params: idParamSchema, body: updatePatientBodySchema }), updatePatient);
router.delete("/:id", validate({ params: idParamSchema }), deletePatient);

export default router;