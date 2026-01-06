import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { generateOTP } from "../utils/generateOTP";
import { sendEmail } from "../utils/sendEmail";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Admin credentials
const ADMIN_EMAIL = "phamdangquang79@gmail.com";
const ADMIN_PASSWORD = "Abc123!!";

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const user = await User.create({
      email,
      password: hashed,
      otp,
      otpExpires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    await sendEmail(email, "Your OTP Code", `Your OTP is: ${otp}`);
    res.json({ msg: "Signup success, check email for OTP" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.otp !== otp || (user.otpExpires && user.otpExpires < new Date())) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ msg: "Account verified successfully" });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ msg: "User not found" });
    if (!user.isVerified) return res.status(400).json({ msg: "Please verify your email first" });
    if (user.isBlocked) return res.status(403).json({ msg: "Your account has been blocked. Contact support." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Invalid password" });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.json({
      msg: "Login success",
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Login with OTP - Step 1: Request OTP
export const loginRequestOTP = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ msg: "User not found" });
    
    // Prevent admin accounts from logging in via user login
    if (user.isAdmin) {
      return res.status(403).json({ msg: "Admin accounts must use the Admin Login" });
    }
    
    if (!user.isVerified) return res.status(400).json({ msg: "Please verify your email first" });
    if (user.isBlocked) return res.status(403).json({ msg: "Your account has been blocked. Contact support." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Invalid password" });

    // Generate and save OTP (valid for 10 minutes)
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send OTP email
    await sendEmail(email, "Login Verification Code", `Your login verification code is: ${otp}\n\nThis code expires in 10 minutes.`);

    res.json({ msg: "OTP sent to your email" });
  } catch (err) {
    console.error("Login request OTP error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Login with OTP - Step 2: Verify OTP and complete login
export const loginVerifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.otp !== otp || (user.otpExpires && user.otpExpires < new Date())) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.json({
      msg: "Login success",
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("Login verify OTP error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Admin login
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Verify admin credentials
    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ msg: "Admin access denied" });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      // Create admin account if it doesn't exist
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      const newAdmin = await User.create({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        isVerified: true,
        isAdmin: true,
        name: "Admin",
      });
      
      // Verify password matches
      if (password !== ADMIN_PASSWORD) {
        return res.status(400).json({ msg: "Invalid admin credentials" });
      }
      
      const token = jwt.sign(
        { id: newAdmin._id, isAdmin: true },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      return res.json({
        msg: "Admin login success",
        token,
        user: {
          _id: newAdmin._id,
          email: newAdmin.email,
          name: newAdmin.name,
          isAdmin: true,
        },
      });
    }
    
    if (!user.isAdmin) {
      return res.status(403).json({ msg: "Admin access denied" });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Invalid admin credentials" });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, isAdmin: true },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.json({
      msg: "Admin login success",
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: true,
      },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    await sendEmail(email, "Reset Password OTP", `Your OTP for password reset is: ${otp}`);
    res.json({ msg: "OTP sent to email" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Verify OTP for password reset (separate from signup verification)
export const verifyResetOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.otp !== otp || (user.otpExpires && user.otpExpires < new Date())) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    res.json({ msg: "OTP verified", valid: true });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.otp !== otp || (user.otpExpires && user.otpExpires < new Date())) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ msg: "Password reset successful" });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
};

// Resend OTP
export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email, type } = req.body; // type: 'signup' | 'reset'
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ msg: "User not found" });
    
    if (type === 'signup' && user.isVerified) {
      return res.status(400).json({ msg: "Email already verified" });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    const subject = type === 'signup' ? "Your OTP Code" : "Reset Password OTP";
    const message = type === 'signup' 
      ? `Your verification OTP is: ${otp}`
      : `Your password reset OTP is: ${otp}`;
    
    await sendEmail(email, subject, message);
    res.json({ msg: "OTP resent successfully" });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    res.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { name, avatar } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();

    res.json({
      msg: "Profile updated successfully",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
};

// Change password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ msg: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ msg: "Password changed successfully" });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
};
