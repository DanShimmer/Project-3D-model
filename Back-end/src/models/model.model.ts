import mongoose, { Schema, Document } from "mongoose";

export interface IModel extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: "text-to-3d" | "image-to-3d";
  prompt?: string;
  imageUrl?: string;
  modelUrl: string;
  thumbnailUrl?: string;
  modelType?: string; // Demo model type: robot, sword, car, cat
  variant?: number; // Selected variant (1-4)
  isPublic: boolean;
  isDemo?: boolean;
  shareToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ModelSchema = new Schema<IModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["text-to-3d", "image-to-3d"], required: true },
    prompt: { type: String },
    imageUrl: { type: String },
    modelUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    modelType: { type: String }, // Demo model type: robot, sword, car, cat
    variant: { type: Number, min: 1, max: 4 }, // Selected variant (1-4)
    isPublic: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
    shareToken: { type: String },
  },
  { timestamps: true }
);

// Index for faster queries
ModelSchema.index({ userId: 1, createdAt: -1 });
ModelSchema.index({ shareToken: 1 });

export default mongoose.model<IModel>("Model", ModelSchema);
