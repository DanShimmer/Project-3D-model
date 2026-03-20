import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

// AI Service URL for Phase 2
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * Proxy all Phase 2 requests to the AI Service.
 * Auth is NOT required here — the user is already authenticated at the page level
 * (GeneratePage redirects to /login if not authenticated).
 * These routes are pure proxies to the local AI service for processing tasks.
 */

// Phase 2 Health Check (no auth required)
router.get("/health", async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/api/phase2/health`, {
      timeout: 5000
    });
    return res.json(response.data);
  } catch (error: any) {
    console.error("Phase 2 health check error:", error.message);
    return res.status(503).json({
      ok: false,
      error: "Phase 2 AI service unavailable",
      details: error.message
    });
  }
});

// Apply Texture
router.post("/texture", async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/phase2/texture`,
      req.body,
      { timeout: 300000, headers: { "Content-Type": "application/json" } }
    );
    return res.json(response.data);
  } catch (error: any) {
    console.error("Phase 2 texture error:", error.message);
    return res.status(error.response?.status || 500).json({
      ok: false,
      error: error.response?.data?.error || error.message
    });
  }
});

// Generate PBR Maps
router.post("/pbr", async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/phase2/pbr`,
      req.body,
      { timeout: 300000, headers: { "Content-Type": "application/json" } }
    );
    return res.json(response.data);
  } catch (error: any) {
    console.error("Phase 2 PBR error:", error.message);
    return res.status(error.response?.status || 500).json({
      ok: false,
      error: error.response?.data?.error || error.message
    });
  }
});

// Apply Rig
router.post("/rig", async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/phase2/rig`,
      req.body,
      { timeout: 300000, headers: { "Content-Type": "application/json" } }
    );
    return res.json(response.data);
  } catch (error: any) {
    console.error("Phase 2 rig error:", error.message);
    return res.status(error.response?.status || 500).json({
      ok: false,
      error: error.response?.data?.error || error.message
    });
  }
});

// Get Animations List
router.get("/animations", async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `${AI_SERVICE_URL}/api/phase2/animations`,
      { timeout: 10000 }
    );
    return res.json(response.data);
  } catch (error: any) {
    console.error("Phase 2 animations error:", error.message);
    return res.status(error.response?.status || 500).json({
      ok: false,
      error: error.response?.data?.error || error.message
    });
  }
});

// Apply Animation
router.post("/animate", async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/phase2/animate`,
      req.body,
      { timeout: 300000, headers: { "Content-Type": "application/json" } }
    );
    return res.json(response.data);
  } catch (error: any) {
    console.error("Phase 2 animate error:", error.message);
    return res.status(error.response?.status || 500).json({
      ok: false,
      error: error.response?.data?.error || error.message
    });
  }
});

// Remesh Model
router.post("/remesh", async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/phase2/remesh`,
      req.body,
      { timeout: 300000, headers: { "Content-Type": "application/json" } }
    );
    return res.json(response.data);
  } catch (error: any) {
    console.error("Phase 2 remesh error:", error.message);
    return res.status(error.response?.status || 500).json({
      ok: false,
      error: error.response?.data?.error || error.message
    });
  }
});

// Export Model
router.post("/export", async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/phase2/export`,
      req.body,
      {
        timeout: 300000,
        headers: { "Content-Type": "application/json" },
        responseType: "json"
      }
    );
    return res.json(response.data);
  } catch (error: any) {
    console.error("Phase 2 export error:", error.message);
    return res.status(error.response?.status || 500).json({
      ok: false,
      error: error.response?.data?.error || error.message
    });
  }
});

// Get Phase 2 Job Status
router.get("/job/:jobId", async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `${AI_SERVICE_URL}/api/phase2/job/${req.params.jobId}`,
      { timeout: 10000 }
    );
    return res.json(response.data);
  } catch (error: any) {
    console.error("Phase 2 job status error:", error.message);
    return res.status(error.response?.status || 500).json({
      ok: false,
      error: error.response?.data?.error || error.message
    });
  }
});

export default router;
