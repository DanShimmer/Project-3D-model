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
  // Phase 2 — persisted modification state
  texturedModelUrl?: string;  // URL after texture applied
  riggedModelUrl?: string;    // URL after rig applied
  animatedModelUrl?: string;  // URL after animation applied
  animationId?: string;       // e.g. "walk", "dance"
  isTextured?: boolean;
  isRigged?: boolean;
  texturePrompt?: string;     // Texture prompt used
  textureStyle?: string;      // Texture style used
  rigConfig?: any;            // Rig configuration object
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
    // Phase 2 — persisted modification state
    texturedModelUrl: { type: String },
    riggedModelUrl: { type: String },
    animatedModelUrl: { type: String },
    animationId: { type: String },
    isTextured: { type: Boolean, default: false },
    isRigged: { type: Boolean, default: false },
    texturePrompt: { type: String },
    textureStyle: { type: String },
    rigConfig: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Index for faster queries
ModelSchema.index({ userId: 1, createdAt: -1 });
ModelSchema.index({ shareToken: 1 });

export default mongoose.model<IModel>("Model", ModelSchema);
