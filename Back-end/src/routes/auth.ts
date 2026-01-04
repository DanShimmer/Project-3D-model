import express from "express";
import {
  signup,
  verifyOTP,
  login,
  loginRequestOTP,
  loginVerifyOTP,
  adminLogin,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  resendOTP,
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Public auth endpoints
router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/login-request-otp", loginRequestOTP);
router.post("/login-verify-otp", loginVerifyOTP);
router.post("/admin-login", adminLogin);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);
router.post("/resend-otp", resendOTP);

// Protected endpoints (require authentication)
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.put("/change-password", authMiddleware, changePassword);

export default router;
