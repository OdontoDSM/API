import { Router } from "express";
import {
  createFile,
  getFiles,
  getFileById,
  deleteFile,
} from "../controllers/file.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createFileBodySchema,
  fileQuerySchema,
  idParamSchema,
} from "../validation/schemas.js";

const router = Router();

router.use(auth);

router.post("/", validate({ body: createFileBodySchema }), createFile);
router.get("/", validate({ query: fileQuerySchema }), getFiles);
router.get("/:id", validate({ params: idParamSchema }), getFileById);
router.delete("/:id", validate({ params: idParamSchema }), deleteFile);

export default router;
