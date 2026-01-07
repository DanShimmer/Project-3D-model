import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model";
import Model from "../models/model.model";

// Admin credentials (hardcoded as per requirement)
const ADMIN_EMAIL = "phamdangquang79@gmail.com";
const ADMIN_PASSWORD = "Abc123!!";

// Initialize admin account on server start
export const initializeAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await User.create({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        isVerified: true,
        isAdmin: true,
        name: "Admin",
      });
      console.log("Admin account created successfully");
    } else if (!existingAdmin.isAdmin) {
      existingAdmin.isAdmin = true;
      await existingAdmin.save();
      console.log("Admin privileges granted to existing account");
    }
  } catch (error) {
    console.error("Error initializing admin:", error);
  }
};

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;
    
    const query: any = { isAdmin: false };
    
    // Search by email or name
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }
    
    // Filter by status
    if (status === "verified") {
      query.isVerified = true;
    } else if (status === "unverified") {
      query.isVerified = false;
    } else if (status === "blocked") {
      query.isBlocked = true;
    }
    
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password -otp -otpExpires")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    
    // Get model count for each user
    const usersWithModels = await Promise.all(
      users.map(async (user) => {
        const modelCount = await Model.countDocuments({ userId: user._id });
        return {
          ...user.toObject(),
          modelCount,
        };
      })
    );
    
    res.json({
      users: usersWithModels,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get single user details (admin only)
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select("-password -otp -otpExpires");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    
    const models = await Model.find({ userId }).sort({ createdAt: -1 });
    
    res.json({ user, models });
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Update user (admin only)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, email, isVerified } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    
    if (user.isAdmin) {
      return res.status(403).json({ msg: "Cannot modify admin account" });
    }
    
    // Check if email is being changed and if it's already in use
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ msg: "Email already in use" });
      }
      user.email = email;
    }
    
    if (name !== undefined) user.name = name;
    if (isVerified !== undefined) user.isVerified = isVerified;
    
    await user.save();
    
    res.json({
      msg: "User updated successfully",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Block/Unblock user (admin only)
export const toggleBlockUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    
    if (user.isAdmin) {
      return res.status(403).json({ msg: "Cannot block admin account" });
    }
    
    user.isBlocked = !user.isBlocked;
    await user.save();
    
    res.json({
      msg: user.isBlocked ? "User blocked successfully" : "User unblocked successfully",
      isBlocked: user.isBlocked,
    });
  } catch (error) {
    console.error("Error toggling block status:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Delete user (admin only)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    
    if (user.isAdmin) {
      return res.status(403).json({ msg: "Cannot delete admin account" });
    }
    
    // Delete all user's models
    await Model.deleteMany({ userId });
    
    // Delete user
    await User.findByIdAndDelete(userId);
    
    res.json({ msg: "User and all their models deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get user's models (admin only)
export const getUserModels = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const total = await Model.countDocuments({ userId });
    const models = await Model.find({ userId })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    
    res.json({
      models,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("Error getting user models:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Delete model (admin only)
export const deleteModelByAdmin = async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    
    const model = await Model.findByIdAndDelete(modelId);
    if (!model) {
      return res.status(404).json({ msg: "Model not found" });
    }
    
    res.json({ msg: "Model deleted successfully" });
  } catch (error) {
    console.error("Error deleting model:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get dashboard stats (admin only)
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments({ isAdmin: false });
    const verifiedUsers = await User.countDocuments({ isAdmin: false, isVerified: true });
    const blockedUsers = await User.countDocuments({ isAdmin: false, isBlocked: true });
    const totalModels = await Model.countDocuments();
    
    // Get recent users (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({
      isAdmin: false,
      createdAt: { $gte: weekAgo },
    });
    
    // Get recent models (last 7 days)
    const newModelsThisWeek = await Model.countDocuments({
      createdAt: { $gte: weekAgo },
    });
    
    res.json({
      totalUsers,
      verifiedUsers,
      blockedUsers,
      totalModels,
      newUsersThisWeek,
      newModelsThisWeek,
    });
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Create new user (admin only)
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ msg: "Email, password and role are required" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      email,
      password: hashedPassword,
      isVerified: true, // Admin-created users are auto-verified
      isAdmin: role === "admin",
      name: email.split("@")[0], // Default name from email
    });

    // Only return user data for non-admin users (admin users won't show in table)
    if (role === "admin") {
      return res.json({
        msg: "Admin account created successfully. This account can login via Admin Login.",
        isAdmin: true,
      });
    }

    res.json({
      msg: "User created successfully",
      user: {
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        isVerified: newUser.isVerified,
        isBlocked: newUser.isBlocked,
        isAdmin: newUser.isAdmin,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ msg: "Server error" });
  }
};
