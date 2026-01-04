import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to verify JWT token
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ msg: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select("-password -otp -otpExpires");
    
    if (!user) {
      return res.status(401).json({ msg: "User not found" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ msg: "Account is blocked" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ msg: "Invalid token" });
  }
};

// Middleware to check if user is admin
export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ msg: "Admin access required" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ msg: "Server error" });
  }
};
