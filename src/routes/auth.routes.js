import { Router } from "express";
import { register, login, resetPassword } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { loginBodySchema, registerBodySchema } from "../validation/schemas.js";

const router = Router();

router.post("/register", validate({ body: registerBodySchema }), register);
router.post("/login", validate({ body: loginBodySchema }), login);
router.put("/reset-password", resetPassword);

export default router;