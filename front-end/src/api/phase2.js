/**
 * Phase 2 API - Advanced 3D Processing
 * Texturing, Rigging, Animation, Remeshing, Export
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const PHASE2_BASE = `${API_BASE}/phase2`;

const authHeaders = () => {
  const t = localStorage.getItem("pv_token") || localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/**
 * Check Phase 2 service health and GPU status
 */
export async function checkPhase2Health() {
  try {
    const res = await fetch(`${PHASE2_BASE}/health`);
    return res.json();
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
 */
export async function applyTexture(modelPath, prompt = null, style = "realistic") {
  try {
    const res = await fetch(`${PHASE2_BASE}/texture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ modelPath, prompt, style })
    });
    return res.json();
  } catch (error) {
    console.error("Apply texture error:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Generate PBR maps (normal, roughness, metallic) from model
 * @param {string} modelPath - Path to the model
 */
export async function generatePBR(modelPath) {
  try {
    const res = await fetch(`${PHASE2_BASE}/pbr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ modelPath })
    });
    return res.json();
  } catch (error) {
    console.error("Generate PBR error:", error);
    return { ok: false, error: error.message };
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
    const res = await fetch(`${PHASE2_BASE}/rig`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ modelPath, characterType, markers })
    });
    return res.json();
  } catch (error) {
    console.error("Apply rig error:", error);
    return { ok: false, error: error.message };
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
    return res.json();
  } catch (error) {
    console.error("Get animations error:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Apply animation to a rigged model
 * @param {string} modelPath - Path to the rigged model
 * @param {string} animationId - ID of animation to apply
 */
export async function applyAnimation(modelPath, animationId) {
  try {
    const res = await fetch(`${PHASE2_BASE}/animate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ modelPath, animationId })
    });
    return res.json();
  } catch (error) {
    console.error("Apply animation error:", error);
    return { ok: false, error: error.message };
  }
}

// ============================================
// REMESH API
// ============================================

/**
 * Remesh model with different topology
 * @param {string} modelPath - Path to the model
 * @param {string} topology - "triangle" or "quad"
 * @param {number} targetFaces - Optional target face count
 */
export async function remeshModel(modelPath, topology = "triangle", targetFaces = null) {
  try {
    const res = await fetch(`${PHASE2_BASE}/remesh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ modelPath, topology, targetFaces })
    });
    return res.json();
  } catch (error) {
    console.error("Remesh error:", error);
    return { ok: false, error: error.message };
  }
}

// ============================================
// EXPORT API
// ============================================

/**
 * Export model to specified format
 * @param {string} modelPath - Path to source model
 * @param {string} format - Target format (glb, obj, fbx, usdz, stl, 3mf, blend)
 */
export async function exportModel(modelPath, format = "glb") {
  try {
    const res = await fetch(`${PHASE2_BASE}/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ modelPath, format })
    });
    return res.json();
  } catch (error) {
    console.error("Export error:", error);
    return { ok: false, error: error.message };
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
