import { Router } from "express";
import {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
} from "../controllers/budget.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  budgetQuerySchema,
  createBudgetBodySchema,
  idParamSchema,
  updateBudgetBodySchema,
} from "../validation/schemas.js";

const router = Router();

router.use(auth);

router.post("/", validate({ body: createBudgetBodySchema }), createBudget);
router.get("/", validate({ query: budgetQuerySchema }), getBudgets);
router.get("/:id", validate({ params: idParamSchema }), getBudgetById);
router.put("/:id", validate({ params: idParamSchema, body: updateBudgetBodySchema }), updateBudget);
router.delete("/:id", validate({ params: idParamSchema }), deleteBudget);

export default router;
