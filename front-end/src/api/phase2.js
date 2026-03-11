/**
 * Phase 2 API - Advanced 3D Processing
 * Texturing, Rigging, Animation, Remeshing, Export
 * 
 * Real AI processing via backend proxy → AI service (port 8000)
 * No more demo mode fallbacks - shows real errors to user
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const PHASE2_BASE = `${API_BASE}/phase2`;

// Demo mode flag - DISABLED: use real AI backend
const DEMO_MODE = false;

const authHeaders = () => {
  const t = localStorage.getItem("pv_token") || localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// Helper to safely parse JSON response - returns real errors instead of demo fallback
const safeJsonResponse = async (res) => {
  try {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      throw new Error("Phase 2 service returned an unexpected response. Is the AI service running?");
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.msg || `Phase 2 API error (${res.status})`);
    }
    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Phase 2 service returned invalid data. Is the AI service running?");
    }
    throw error;
  }
};

/**
 * Check Phase 2 service health and GPU status
 */
export async function checkPhase2Health() {
  try {
    const res = await fetch(`${PHASE2_BASE}/health`);
    const data = await safeJsonResponse(res);
    console.log("Phase 2 health check:", data);
    return { ...data, ok: true };
  } catch (error) {
    console.error("Phase 2 health check error:", error);
    return { 
      ok: false, 
      phase2_enabled: false,
      error: error.message 
    };
  }
}

// ============================================
// TEXTURING API
// ============================================

/**
 * Apply AI texture to a 3D model
 * @param {string} modelPath - Path to the model
 * @param {string} prompt - Optional text prompt for texture style
 * @param {string} style - Texture style (realistic, cartoon, stylized)
 * @param {string[]} aiOptions - AI options (auto-color, shadows, depth, detail)
 */
export async function applyTexture(modelPath, prompt = null, style = "realistic", aiOptions = ["auto-color"]) {
  try {
    console.log("Applying AI texture:", { modelPath, style, prompt, aiOptions });
    const res = await fetch(`${PHASE2_BASE}/texture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ modelPath, prompt, style, aiOptions })
    });
    const result = await safeJsonResponse(res);
    console.log("Texture result:", result);
    return { ...result, ok: true };
  } catch (error) {
    console.error("Apply texture error:", error);
    return {
      ok: false,
      error: error.message
    };
  }
}

/**
 * Generate PBR maps (normal, roughness, metallic) from model
 * @param {string} modelPath - Path to the model
 */
export async function generatePBR(modelPath) {
  try {
    console.log("Generating PBR maps for:", modelPath);
    const res = await fetch(`${PHASE2_BASE}/pbr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ modelPath })
    });
    const result = await safeJsonResponse(res);
    console.log("PBR result:", result);
    return { ...result, ok: true };
  } catch (error) {
    console.error("Generate PBR error:", error);
    return {
      ok: false,
      error: error.message
    };
  }
}

// ============================================
// RIGGING API
// ============================================

/**
 * Apply auto-rigging to a 3D model
 * @param {string} modelPath - Path to the model
 * @param {string} characterType - "humanoid" or "quadruped"
 * @param {Array} markers - Optional marker positions for guided rigging
 */
export async function applyRig(modelPath, characterType = "humanoid", markers = []) {
  try {
    console.log("Applying rig:", { modelPath, characterType, markers: markers.length });
    const res = await fetch(`${PHASE2_BASE}/rig`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ modelPath, characterType, markers })
    });
    const result = await safeJsonResponse(res);
    console.log("Rig result:", result);
    return { ...result, ok: true };
  } catch (error) {
    console.error("Apply rig error:", error);
    return {
      ok: false,
      error: error.message
    };
  }
}

// ============================================
// ANIMATION API
// ============================================

/**
 * Get list of available animations
 */
export async function getAnimations() {
  try {
    const res = await fetch(`${PHASE2_BASE}/animations`, {
      headers: authHeaders()
    });
    const result = await safeJsonResponse(res);
    return { ...result, ok: true };
  } catch (error) {
    console.error("Get animations error:", error);
    return {
      ok: false,
      error: error.message,
      animations: []
    };
  }
}

/**
 * Apply animation to a rigged model
 * @param {string} modelPath - Path to the rigged model
 * @param {string} animationId - ID of animation to apply
 */
export async function applyAnimation(modelPath, animationId) {
  try {
    console.log("Applying animation:", { modelPath, animationId });
    const res = await fetch(`${PHASE2_BASE}/animate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ modelPath, animationId })
    });
    const result = await safeJsonResponse(res);
    return { ...result, ok: true };
  } catch (error) {
    console.error("Apply animation error:", error);
    return {
      ok: false,
      error: error.message
    };
  }
}

// ============================================
// REMESH API
// ============================================

/**
 * Remesh model with different topology
 * @param {string} modelPath - Path to the model
 * @param {string} topology - "triangle" or "quad"
 * @param {string} quality - "low", "medium", or "high"
 */
export async function remeshModel(modelPath, topology = "triangle", quality = "medium") {
  try {
    console.log("Remeshing model:", { modelPath, topology, quality });
    const res = await fetch(`${PHASE2_BASE}/remesh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ modelPath, topology, quality })
    });
    const result = await safeJsonResponse(res);
    console.log("Remesh result:", result);
    return { ...result, ok: true };
  } catch (error) {
    console.error("Remesh error:", error);
    return {
      ok: false,
      error: error.message
    };
  }
}

// ============================================
// EXPORT API
// ============================================

/**
 * Export model to specified format with optional rig and animation
 * @param {string} modelPath - Path to source model
 * @param {string} format - Target format (glb, obj, fbx, usdz, stl, 3mf, blend)
 * @param {object} options - Export options (include_rig, include_animation, etc.)
 */
export async function exportModel(modelPath, format = "glb", options = {}) {
  try {
    console.log("Exporting model:", { modelPath, format, options });
    const res = await fetch(`${PHASE2_BASE}/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ 
        modelPath, 
        format,
        include_rig: options.include_rig || false,
        include_animation: options.include_animation || null,
        include_textures: options.include_textures || false
      })
    });
    const result = await safeJsonResponse(res);
    return { ...result, ok: true };
  } catch (error) {
    console.error("Export error:", error);
    return {
      ok: false,
      error: error.message
    };
  }
}

// ============================================
// JOB STATUS
// ============================================

/**
 * Get Phase 2 job status
 * @param {string} jobId - Job ID to check
 */
export async function getPhase2JobStatus(jobId) {
  try {
    const res = await fetch(`${PHASE2_BASE}/job/${jobId}`, {
      headers: authHeaders()
    });
    return res.json();
  } catch (error) {
    console.error("Get job status error:", error);
    return { ok: false, error: error.message };
  }
}

// ============================================
// DOWNLOAD HELPER
// ============================================

/**
 * Download model file from server
 * @param {string} filePath - Path to file on server
 * @param {string} filename - Name for downloaded file
 */
export async function downloadModelFile(filePath, filename) {
  try {
    const res = await fetch(`${API_BASE.replace('/api', '')}${filePath}`, {
      headers: authHeaders()
    });
    
    if (!res.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    return { ok: true };
  } catch (error) {
    console.error("Download error:", error);
    return { ok: false, error: error.message };
  }
}
