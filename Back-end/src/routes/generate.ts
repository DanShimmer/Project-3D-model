import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  textTo3D,
  textTo3DBatch,
  imageTo3D,
  getJobStatus,
  getBatchStatus,
  applyHunyuanTexture,
  checkAIHealth
} from "../controllers/generate.controller";

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: PNG, JPG, JPEG, WEBP"));
    }
  }
});

// Public endpoint - check AI service health
router.get("/health", checkAIHealth);

// Protected endpoints - require authentication
router.use(authMiddleware);

// Text to 3D
router.post("/text-to-3d", textTo3D);

// Text to 3D Batch (4 variants)
router.post("/text-to-3d-batch", textTo3DBatch);

// Image to 3D
router.post("/image-to-3d", upload.single("image"), imageTo3D);

// Get job status
router.get("/job/:jobId", getJobStatus);

// Get batch job status (polling endpoint for async batch generation)
router.get("/batch-status/:jobId", getBatchStatus);

// Apply Hunyuan3D texture to selected variant
router.post("/apply-texture", applyHunyuanTexture);

export default router;
