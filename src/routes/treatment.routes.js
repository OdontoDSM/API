import { Router } from "express";
import {
  createTreatment,
  getTreatments,
  getTreatmentById,
  updateTreatment,
  deleteTreatment,
} from "../controllers/treatment.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createTreatmentBodySchema,
  idParamSchema,
  updateTreatmentBodySchema,
} from "../validation/schemas.js";

const router = Router();

router.use(auth);

router.post("/", validate({ body: createTreatmentBodySchema }), createTreatment);
router.get("/", getTreatments);
router.get("/:id", validate({ params: idParamSchema }), getTreatmentById);
router.put("/:id", validate({ params: idParamSchema, body: updateTreatmentBodySchema }), updateTreatment);
router.delete("/:id", validate({ params: idParamSchema }), deleteTreatment);

export default router;
