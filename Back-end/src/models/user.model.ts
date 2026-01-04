import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  isVerified: boolean;
  isAdmin: boolean;
  isBlocked: boolean;
  name?: string;
  avatar?: string;
  otp?: string;
  otpExpires?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    name: { type: String },
    avatar: { type: String },
    otp: { type: String },
    otpExpires: { type: Date },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
