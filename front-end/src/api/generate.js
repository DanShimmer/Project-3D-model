const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const authHeaders = () => {
  const t = localStorage.getItem("pv_token") || localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/**
 * Text -> 3D Generation
 * @param {string} prompt - Text description of the 3D model
 * @param {string} mode - "fast" (SD 1.5) or "quality" (SDXL)
 */
export async function genTextTo3D(prompt, mode = "fast") {
  try {
    const res = await fetch(`${API_BASE}/generate/text-to-3d`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        ...authHeaders() 
      },
      body: JSON.stringify({ prompt, mode }),
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      return { ok: false, msg: data.msg || "Generation failed" };
    }
    
    return data;
  } catch (error) {
    console.error("Text-to-3D error:", error);
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
    
    const res = await fetch(`${API_BASE}/generate/image-to-3d`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: form,
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      return { ok: false, msg: data.msg || "Generation failed" };
    }
    
    return data;
  } catch (error) {
    console.error("Image-to-3D error:", error);
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

