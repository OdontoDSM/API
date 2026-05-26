import { Router } from "express";
import { register, login, forgotPassword } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
	forgotPasswordBodySchema,
	loginBodySchema,
	registerBodySchema,
} from "../validation/schemas.js";

const router = Router();

router.post("/register", validate({ body: registerBodySchema }), register);
router.post("/login", validate({ body: loginBodySchema }), login);
router.post("/forgot-password", validate({ body: forgotPasswordBodySchema }), forgotPassword);

export default router;