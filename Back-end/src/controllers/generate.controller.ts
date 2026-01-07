import { Request, Response } from "express";
import axios from "axios";
import FormData from "form-data";
import { v4 as uuidv4 } from "uuid";
import Model from "../models/model.model";

// Define multer file type
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

// Use type intersection instead of extending Request
type MulterRequest = Request & {
  file?: MulterFile;
};

// AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// Demo mode - set to true to bypass AI service and return instant demo results
// Enable this when AI service is too slow (CPU-only) or crashes due to low memory
const DEMO_MODE = process.env.DEMO_MODE === "true" || true;

interface GenerateJob {
  jobId: string;
  userId: string;
  type: "text-to-3d" | "image-to-3d";
  status: "pending" | "processing" | "completed" | "failed";
  prompt?: string;
  mode?: string;
  modelUrl?: string;
  imageUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// In-memory job tracking (for simple setup - use Redis in production)
const jobs: Map<string, GenerateJob> = new Map();

/**
 * Text to 3D Generation
 * POST /api/generate/text-to-3d
 */
export const textTo3D = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    
    if (!userId) {
      return res.status(401).json({ ok: false, msg: "Authentication required" });
    }
    
    const { prompt, mode = "fast" } = req.body;

    // Validation
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ ok: false, msg: "Prompt is required" });
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      return res.status(400).json({ ok: false, msg: "Prompt cannot be empty" });
    }

    if (trimmedPrompt.length > 500) {
      return res.status(400).json({ ok: false, msg: "Prompt too long (max 500 characters)" });
    }

    if (!["fast", "quality"].includes(mode)) {
      return res.status(400).json({ ok: false, msg: "Mode must be 'fast' or 'quality'" });
    }

    // Create job
    const jobId = uuidv4();
    const job: GenerateJob = {
      jobId,
      userId,
      type: "text-to-3d",
      status: "pending",
      prompt: trimmedPrompt,
      mode,
      createdAt: new Date()
    };
    jobs.set(jobId, job);

    console.log(`📝 Text-to-3D Job created: ${jobId}`);

    // Demo mode - bypass AI service and return instant demo results
    if (DEMO_MODE) {
      console.log(`🎭 Demo mode: Generating instant demo result`);
      
      job.status = "completed";
      job.modelUrl = "/demo/model.glb"; // Demo model URL
      job.imageUrl = "/demo/preview.png"; // Demo preview URL  
      job.completedAt = new Date();

      // Save to database
      const newModel = new Model({
        userId,
        name: `${trimmedPrompt.slice(0, 50)}${trimmedPrompt.length > 50 ? '...' : ''}`,
        type: "text-to-3d",
        prompt: trimmedPrompt,
        mode,
        modelUrl: job.modelUrl,
        thumbnailUrl: job.imageUrl,
        isPublic: false,
        isDemo: true // Mark as demo model
      });
      await newModel.save();

      return res.json({
        ok: true,
        jobId,
        isDemo: true,
        model: {
          _id: newModel._id,
          name: newModel.name,
          type: newModel.type,
          prompt: newModel.prompt,
          modelUrl: newModel.modelUrl,
          thumbnailUrl: newModel.thumbnailUrl,
          isDemo: true,
          createdAt: newModel.createdAt
        }
      });
    }

    // Call AI Service (only when DEMO_MODE is false)
    job.status = "processing";
    
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/text-to-3d`, {
        prompt: trimmedPrompt,
        mode,
        jobId
      }, {
        timeout: 300000 // 5 minutes timeout
      });

      if (response.data.ok) {
        job.status = "completed";
        job.modelUrl = `${AI_SERVICE_URL}${response.data.modelPath}`;
        job.imageUrl = `${AI_SERVICE_URL}${response.data.imageUrl}`;
        job.completedAt = new Date();

        // Save to database
        const newModel = new Model({
          userId,
          name: `${trimmedPrompt.slice(0, 50)}...`,
          type: "text-to-3d",
          prompt: trimmedPrompt,
          mode,
          modelUrl: job.modelUrl,
          thumbnailUrl: job.imageUrl,
          isPublic: false
        });
        await newModel.save();

        return res.json({
          ok: true,
          jobId,
          model: {
            _id: newModel._id,
            name: newModel.name,
            type: newModel.type,
            prompt: newModel.prompt,
            modelUrl: newModel.modelUrl,
            thumbnailUrl: newModel.thumbnailUrl,
            createdAt: newModel.createdAt
          }
        });
      } else {
        throw new Error(response.data.error || "AI Service error");
      }

    } catch (aiError: any) {
      job.status = "failed";
      job.error = aiError.message;
      
      console.error(`❌ Text-to-3D failed: ${aiError.message}`);
      
      if (aiError.code === "ECONNREFUSED") {
        return res.status(503).json({ 
          ok: false, 
          msg: "AI Service is not available. Please try again later." 
        });
      }
      
      return res.status(500).json({ 
        ok: false, 
        msg: aiError.response?.data?.error || aiError.message || "Generation failed" 
      });
    }

  } catch (error: any) {
    console.error("Text-to-3D error:", error);
    return res.status(500).json({ ok: false, msg: error.message || "Server error" });
  }
};

/**
 * Image to 3D Generation
 * POST /api/generate/image-to-3d
 */
export const imageTo3D = async (req: MulterRequest, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    
    if (!userId) {
      return res.status(401).json({ ok: false, msg: "Authentication required" });
    }

    // Check for file
    if (!req.file) {
      return res.status(400).json({ ok: false, msg: "Image file is required" });
    }

    const file = req.file;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        ok: false, 
        msg: "Invalid file type. Allowed: PNG, JPG, JPEG, WEBP" 
      });
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      return res.status(400).json({ ok: false, msg: "File too large (max 20MB)" });
    }

    // Create job
    const jobId = uuidv4();
    const job: GenerateJob = {
      jobId,
      userId,
      type: "image-to-3d",
      status: "pending",
      createdAt: new Date()
    };
    jobs.set(jobId, job);

    console.log(`🖼️ Image-to-3D Job created: ${jobId}`);

    // Demo mode - bypass AI service and return instant demo results
    if (DEMO_MODE) {
      console.log(`🎭 Demo mode: Generating instant demo result for image`);
      
      job.status = "completed";
      job.modelUrl = "/demo/model.glb"; // Demo model URL
      job.imageUrl = "/demo/preview.png"; // Demo preview URL  
      job.completedAt = new Date();

      // Save to database
      const newModel = new Model({
        userId,
        name: `Image to 3D - ${file.originalname}`,
        type: "image-to-3d",
        modelUrl: job.modelUrl,
        thumbnailUrl: job.imageUrl,
        isPublic: false,
        isDemo: true // Mark as demo model
      });
      await newModel.save();

      return res.json({
        ok: true,
        jobId,
        isDemo: true,
        model: {
          _id: newModel._id,
          name: newModel.name,
          type: newModel.type,
          modelUrl: newModel.modelUrl,
          thumbnailUrl: newModel.thumbnailUrl,
          isDemo: true,
          createdAt: newModel.createdAt
        }
      });
    }

    // Prepare form data for AI Service (only when DEMO_MODE is false)
    const formData = new FormData();
    formData.append("image", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });
    formData.append("jobId", jobId);

    // Call AI Service
    job.status = "processing";

    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/image-to-3d`, formData, {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 300000, // 5 minutes timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      if (response.data.ok) {
        job.status = "completed";
        job.modelUrl = `${AI_SERVICE_URL}${response.data.modelPath}`;
        job.imageUrl = `${AI_SERVICE_URL}${response.data.preprocessedImage}`;
        job.completedAt = new Date();

        // Save to database
        const newModel = new Model({
          userId,
          name: `Image to 3D - ${new Date().toLocaleDateString()}`,
          type: "image-to-3d",
          imageUrl: job.imageUrl,
          modelUrl: job.modelUrl,
          thumbnailUrl: job.imageUrl,
          isPublic: false
        });
        await newModel.save();

        return res.json({
          ok: true,
          jobId,
          model: {
            _id: newModel._id,
            name: newModel.name,
            type: newModel.type,
            modelUrl: newModel.modelUrl,
            thumbnailUrl: newModel.thumbnailUrl,
            createdAt: newModel.createdAt
          }
        });
      } else {
        throw new Error(response.data.error || "AI Service error");
      }

    } catch (aiError: any) {
      job.status = "failed";
      job.error = aiError.message;
      
      console.error(`❌ Image-to-3D failed: ${aiError.message}`);
      
      if (aiError.code === "ECONNREFUSED") {
        return res.status(503).json({ 
          ok: false, 
          msg: "AI Service is not available. Please try again later." 
        });
      }
      
      return res.status(500).json({ 
        ok: false, 
        msg: aiError.response?.data?.error || aiError.message || "Generation failed" 
      });
    }

  } catch (error: any) {
    console.error("Image-to-3D error:", error);
    return res.status(500).json({ ok: false, msg: error.message || "Server error" });
  }
};

/**
 * Get Job Status
 * GET /api/generate/job/:jobId
 */
export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).userId;

    const job = jobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({ ok: false, msg: "Job not found" });
    }

    // Check ownership
    if (job.userId !== userId) {
      return res.status(403).json({ ok: false, msg: "Access denied" });
    }

    // Also check AI Service for latest status
    if (job.status === "processing") {
      try {
        const aiResponse = await axios.get(`${AI_SERVICE_URL}/api/job/${jobId}`);
        if (aiResponse.data.ok) {
          return res.json({
            ok: true,
            job: {
              ...job,
              aiStatus: aiResponse.data
            }
          });
        }
      } catch {
        // AI Service might not have the job, that's ok
      }
    }

    return res.json({ ok: true, job });

  } catch (error: any) {
    console.error("Get job status error:", error);
    return res.status(500).json({ ok: false, msg: error.message || "Server error" });
  }
};

/**
 * Check AI Service Health
 * GET /api/generate/health
 */
export const checkAIHealth = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, {
      timeout: 5000
    });
    
    return res.json({
      ok: true,
      aiService: response.data
    });
  } catch (error: any) {
    return res.json({
      ok: false,
      aiService: {
        status: "unavailable",
        error: error.message
      }
    });
  }
};
