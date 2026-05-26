import { Router } from "express";
import {
  createFile,
  uploadFile,
  getFiles,
  getFileById,
  downloadFile,
  deleteFile,
} from "../controllers/file.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { uploadPdf } from "../middleware/upload.middleware.js";
import {
  createFileBodySchema,
  createFileUploadBodySchema,
  fileQuerySchema,
  idParamSchema,
} from "../validation/schemas.js";

const router = Router();

router.use(auth);

router.post("/", validate({ body: createFileBodySchema }), createFile);
router.post(
  "/upload",
  uploadPdf.single("file"),
  validate({ body: createFileUploadBodySchema }),
  uploadFile
);
router.get("/", validate({ query: fileQuerySchema }), getFiles);
router.get("/:id", validate({ params: idParamSchema }), getFileById);
router.get("/:id/download", validate({ params: idParamSchema }), downloadFile);
router.delete("/:id", validate({ params: idParamSchema }), deleteFile);

export default router;
