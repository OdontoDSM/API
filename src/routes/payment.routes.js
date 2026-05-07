import { Router } from "express";
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} from "../controllers/payment.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createPaymentBodySchema,
  idParamSchema,
  paymentQuerySchema,
  updatePaymentBodySchema,
} from "../validation/schemas.js";

const router = Router();

router.use(auth);

router.post("/", validate({ body: createPaymentBodySchema }), createPayment);
router.get("/", validate({ query: paymentQuerySchema }), getPayments);
router.get("/:id", validate({ params: idParamSchema }), getPaymentById);
router.put("/:id", validate({ params: idParamSchema, body: updatePaymentBodySchema }), updatePayment);
router.delete("/:id", validate({ params: idParamSchema }), deletePayment);

export default router;
