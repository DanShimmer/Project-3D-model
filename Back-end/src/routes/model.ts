import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getMyModels,
  getModelById,
  createModel,
  updateModel,
  deleteModel,
  shareModel,
  unshareModel,
  getSharedModel,
  duplicateModel,
} from "../controllers/model.controller";

const router = express.Router();

// Public endpoint for shared models
router.get("/shared/:shareToken", getSharedModel);

// Protected endpoints (require authentication)
router.use(authMiddleware);

router.get("/", getMyModels);
router.get("/:modelId", getModelById);
router.post("/", createModel);
router.put("/:modelId", updateModel);
router.delete("/:modelId", deleteModel);
router.post("/:modelId/share", shareModel);
router.delete("/:modelId/share", unshareModel);
router.post("/:modelId/duplicate", duplicateModel);

export default router;
