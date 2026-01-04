import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  textTo3D,
  imageTo3D,
  getJobStatus,
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

// Image to 3D
router.post("/image-to-3d", upload.single("image"), imageTo3D);

// Get job status
router.get("/job/:jobId", getJobStatus);

export default router;
