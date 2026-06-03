import { Router } from "express";
import { register, login, forgotPassword, refresh } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
	forgotPasswordBodySchema,
	loginBodySchema,
	refreshTokenBodySchema,
	registerBodySchema,
} from "../validation/schemas.js";

const router = Router();

router.get("/test", (req, res) => {
  res.json({ message: "Auth route is working!" });
});
router.post("/register", validate({ body: registerBodySchema }), register);
router.post("/login", validate({ body: loginBodySchema }), login);
router.post("/refresh", validate({ body: refreshTokenBodySchema }), refresh);
router.post("/forgot-password", validate({ body: forgotPasswordBodySchema }), forgotPassword);

export default router;