const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const authHeaders = () => {
  const t = localStorage.getItem("pv_token") || localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/**
 * Text -> 3D Generation
 * @param {string} prompt - Text description of the 3D model
 * @param {string} mode - "fast" (SD 1.5) or "quality" (SDXL)
 * @param {number} [seed] - Optional seed for reproducible generation
 */
export async function genTextTo3D(prompt, mode = "fast", seed = undefined) {
  try {
    // 15 minute timeout - SDXL first-run downloads large models
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900000);

    const body = { prompt, mode };
    if (seed !== undefined) body.seed = seed;

    const res = await fetch(`${API_BASE}/generate/text-to-3d`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        ...authHeaders() 
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const data = await res.json();
    
    if (!res.ok) {
      return { ok: false, msg: data.msg || "Generation failed" };
    }
    
    return data;
  } catch (error) {
    console.error("Text-to-3D error:", error);
    if (error.name === "AbortError") {
      return { ok: false, msg: "Generation timed out. The AI model may still be downloading. Please try again." };
    }
    return { ok: false, msg: error.message || "Network error" };
  }
}

/**
 * Text -> 3D Batch Generation (4 variants)
 * @param {string} prompt - Text description of the 3D model
 * @param {string} mode - "fast" (SD 1.5) or "quality" (SDXL) 
 * @param {number} numVariants - Number of variants to generate (1-4)
 */
export async function genTextTo3DBatch(prompt, mode = "fast", numVariants = 4) {
  try {
    // 30 minute timeout for batch generation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800000);

    const res = await fetch(`${API_BASE}/generate/text-to-3d-batch`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        ...authHeaders() 
      },
      body: JSON.stringify({ prompt, mode, num_variants: numVariants }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const data = await res.json();
    
    if (!res.ok) {
      return { ok: false, msg: data.msg || "Batch generation failed" };
    }
    
    return data;
  } catch (error) {
    console.error("Text-to-3D Batch error:", error);
    if (error.name === "AbortError") {
      return { ok: false, msg: "Batch generation timed out. Please try again with fewer variants." };
    }
    return { ok: false, msg: error.message || "Network error" };
  }
}

/**
 * Image -> 3D Generation
 * @param {File} file - Image file to convert
 */
export async function genImageTo3D(file) {
  try {
    const form = new FormData();
    form.append("image", file);
    
    // 15 minute timeout - first-run downloads large models
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900000);

    const res = await fetch(`${API_BASE}/generate/image-to-3d`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: form,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const data = await res.json();
    
    if (!res.ok) {
      return { ok: false, msg: data.msg || "Generation failed" };
    }
    
    return data;
  } catch (error) {
    console.error("Image-to-3D error:", error);
    if (error.name === "AbortError") {
      return { ok: false, msg: "Generation timed out. The AI model may still be downloading. Please try again." };
    }
    return { ok: false, msg: error.message || "Network error" };
  }
}

/**
 * Get job status
 * @param {string} jobId - Job ID to check
 */
export async function getJobStatus(jobId) {
  try {
    const res = await fetch(`${API_BASE}/generate/job/${jobId}`, {
      headers: { ...authHeaders() },
    });
    return res.json();
  } catch (error) {
    console.error("Get job status error:", error);
    return { ok: false, msg: error.message };
  }
}

/**
 * Check AI Service health
 */
export async function checkAIHealth() {
  try {
    const res = await fetch(`${API_BASE}/generate/health`);
    return res.json();
  } catch (error) {
    return { ok: false, aiService: { status: "unavailable" } };
  }
}

/**
 * Update model with modelType
 * @param {string} modelId - Model ID to update
 * @param {string} modelType - Type of demo model (robot, sword, car, cat)
 */
export async function updateModelType(modelId, modelType) {
  try {
    const res = await fetch(`${API_BASE}/models/${modelId}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json", 
        ...authHeaders() 
      },
      body: JSON.stringify({ modelType }),
    });
    return res.json();
  } catch (error) {
    console.error("Update model type error:", error);
    return { ok: false, msg: error.message };
  }
}

/**
 * Update model with modelType and variant
 * @param {string} modelId - Model ID to update
 * @param {string} modelType - Type of demo model (robot, sword, car, cat)
 * @param {number} variant - Selected variant number (1-4)
 */
export async function updateModelVariant(modelId, modelType, variant) {
  try {
    const res = await fetch(`${API_BASE}/models/${modelId}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json", 
        ...authHeaders() 
      },
      body: JSON.stringify({ modelType, variant }),
    });
    return res.json();
  } catch (error) {
    console.error("Update model variant error:", error);
    return { ok: false, msg: error.message };
  }
}
