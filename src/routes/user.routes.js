import { Router } from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateProfilePhoto,
  deleteUser,
} from "../controllers/user.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { uploadProfilePhoto } from "../middleware/upload.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createUserBodySchema,
  idParamSchema,
  updateUserBodySchema,
} from "../validation/schemas.js";

const router = Router();

router.use(auth);

router.post("/", validate({ body: createUserBodySchema }), createUser);
router.get("/", getUsers);
router.get("/:id", validate({ params: idParamSchema }), getUserById);
router.put("/:id", validate({ params: idParamSchema, body: updateUserBodySchema }), updateUser);
router.put("/:id/profile-photo", validate({ params: idParamSchema }), uploadProfilePhoto.single("photo"), updateProfilePhoto);
router.delete("/:id", validate({ params: idParamSchema }), deleteUser);

export default router;
