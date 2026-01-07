import { Request, Response } from "express";
import crypto from "crypto";
import Model from "../models/model.model";

// Get all models for logged-in user
export const getMyModels = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 12, type = "all" } = req.query;
    
    const query: any = { userId };
    
    if (type === "text-to-3d" || type === "image-to-3d") {
      query.type = type;
    }
    
    const total = await Model.countDocuments(query);
    const models = await Model.find(query)
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
    console.error("Error getting models:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get single model by ID
export const getModelById = async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const userId = req.user._id;
    
    const model = await Model.findOne({ _id: modelId, userId });
    if (!model) {
      return res.status(404).json({ msg: "Model not found" });
    }
    
    res.json({ model });
  } catch (error) {
    console.error("Error getting model:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Create new model (after generation)
export const createModel = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { name, type, prompt, imageUrl, modelUrl, thumbnailUrl } = req.body;
    
    if (!name || !type || !modelUrl) {
      return res.status(400).json({ msg: "Missing required fields" });
    }
    
    const model = await Model.create({
      userId,
      name,
      type,
      prompt,
      imageUrl,
      modelUrl,
      thumbnailUrl,
      isPublic: false,
    });
    
    res.status(201).json({
      msg: "Model saved successfully",
      model,
    });
  } catch (error) {
    console.error("Error creating model:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Update model (name, prompt, regenerate)
export const updateModel = async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const userId = req.user._id;
    const { name, prompt, imageUrl, modelUrl, thumbnailUrl, isPublic } = req.body;
    
    const model = await Model.findOne({ _id: modelId, userId });
    if (!model) {
      return res.status(404).json({ msg: "Model not found" });
    }
    
    if (name !== undefined) model.name = name;
    if (prompt !== undefined) model.prompt = prompt;
    if (imageUrl !== undefined) model.imageUrl = imageUrl;
    if (modelUrl !== undefined) model.modelUrl = modelUrl;
    if (thumbnailUrl !== undefined) model.thumbnailUrl = thumbnailUrl;
    if (isPublic !== undefined) model.isPublic = isPublic;
    
    // Handle modelType for demo models
    const { modelType } = req.body;
    if (modelType !== undefined) (model as any).modelType = modelType;
    
    await model.save();
    
    res.json({
      msg: "Model updated successfully",
      model,
    });
  } catch (error) {
    console.error("Error updating model:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Delete model
export const deleteModel = async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const userId = req.user._id;
    
    const model = await Model.findOneAndDelete({ _id: modelId, userId });
    if (!model) {
      return res.status(404).json({ msg: "Model not found" });
    }
    
    res.json({ msg: "Model deleted successfully" });
  } catch (error) {
    console.error("Error deleting model:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Generate share link
export const shareModel = async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const userId = req.user._id;
    
    const model = await Model.findOne({ _id: modelId, userId });
    if (!model) {
      return res.status(404).json({ msg: "Model not found" });
    }
    
    // Generate unique share token if not exists
    if (!model.shareToken) {
      model.shareToken = crypto.randomBytes(16).toString("hex");
      model.isPublic = true;
      await model.save();
    }
    
    res.json({
      msg: "Share link generated",
      shareToken: model.shareToken,
      shareUrl: `/share/${model.shareToken}`,
    });
  } catch (error) {
    console.error("Error sharing model:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Revoke share link
export const unshareModel = async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const userId = req.user._id;
    
    const model = await Model.findOne({ _id: modelId, userId });
    if (!model) {
      return res.status(404).json({ msg: "Model not found" });
    }
    
    model.shareToken = undefined;
    model.isPublic = false;
    await model.save();
    
    res.json({ msg: "Share link revoked" });
  } catch (error) {
    console.error("Error unsharing model:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get shared model by token (public endpoint)
export const getSharedModel = async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;
    
    const model = await Model.findOne({ shareToken, isPublic: true });
    if (!model) {
      return res.status(404).json({ msg: "Model not found or not shared" });
    }
    
    res.json({
      model: {
        _id: model._id,
        name: model.name,
        type: model.type,
        prompt: model.prompt,
        modelUrl: model.modelUrl,
        thumbnailUrl: model.thumbnailUrl,
        createdAt: model.createdAt,
      },
    });
  } catch (error) {
    console.error("Error getting shared model:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Duplicate model
export const duplicateModel = async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const userId = req.user._id;
    
    const originalModel = await Model.findOne({ _id: modelId, userId });
    if (!originalModel) {
      return res.status(404).json({ msg: "Model not found" });
    }
    
    const duplicatedModel = await Model.create({
      userId,
      name: `${originalModel.name} (Copy)`,
      type: originalModel.type,
      prompt: originalModel.prompt,
      imageUrl: originalModel.imageUrl,
      modelUrl: originalModel.modelUrl,
      thumbnailUrl: originalModel.thumbnailUrl,
      isPublic: false,
    });
    
    res.status(201).json({
      msg: "Model duplicated successfully",
      model: duplicatedModel,
    });
  } catch (error) {
    console.error("Error duplicating model:", error);
    res.status(500).json({ msg: "Server error" });
  }
};
