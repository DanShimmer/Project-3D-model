import express from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import {
  getAllUsers,
  getUserById,
  updateUser,
  toggleBlockUser,
  deleteUser,
  getUserModels,
  deleteModelByAdmin,
  getDashboardStats,
  createUser,
} from "../controllers/admin.controller";

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard
router.get("/stats", getDashboardStats);

// User management
router.get("/users", getAllUsers);
router.post("/users", createUser);
router.get("/users/:userId", getUserById);
router.put("/users/:userId", updateUser);
router.put("/users/:userId/toggle-block", toggleBlockUser);
router.delete("/users/:userId", deleteUser);

// User models management
router.get("/users/:userId/models", getUserModels);
router.delete("/models/:modelId", deleteModelByAdmin);

export default router;
