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
 * Text -> 3D Batch Generation (4 variants) — ASYNC with polling
 * Submits job, then polls for progress. Calls onProgress callback with status updates.
 * 
 * @param {string} prompt - Text description of the 3D model
 * @param {string} mode - "fast" (SD 1.5) or "quality" (SDXL) 
 * @param {number} numVariants - Number of variants to generate (1-4)
 * @param {object} options - { onProgress: (status) => void, pollInterval: ms, abortSignal }
 * @returns {Promise<object>} Final result with all variants
 */
export async function genTextTo3DBatch(prompt, mode = "fast", numVariants = 4, options = {}) {
  const { onProgress, pollInterval = 3000, abortSignal } = options;

  try {
    // Step 1: Submit batch job (returns immediately with jobId)
    const submitRes = await fetch(`${API_BASE}/generate/text-to-3d-batch`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        ...authHeaders() 
      },
      body: JSON.stringify({ prompt, mode, num_variants: numVariants }),
      signal: abortSignal,
    });
    
    const submitData = await submitRes.json();
    
    if (!submitRes.ok || !submitData.ok) {
      return { ok: false, msg: submitData.msg || "Failed to start batch generation" };
    }

    const jobId = submitData.jobId;
    console.log(`🚀 Batch job started: ${jobId}`);

    // Notify initial status
    if (onProgress) {
      onProgress({
        status: 'processing',
        progress: 0,
        step: 'Starting batch generation...',
        variants_completed: 0,
        total_variants: submitData.total_variants || numVariants,
        variants: []
      });
    }

    // Step 2: Poll for status until completed or failed
    return await new Promise((resolve, reject) => {
      let lastVariantsCompleted = 0;
      
      const poll = async () => {
        try {
          // Check if aborted
          if (abortSignal?.aborted) {
            resolve({ ok: false, msg: "Generation cancelled by user" });
            return;
          }

          const statusRes = await fetch(`${API_BASE}/generate/batch-status/${jobId}`, {
            headers: { ...authHeaders() },
            signal: abortSignal,
          });
          
          const status = await statusRes.json();
          
          if (!status.ok) {
            resolve({ ok: false, msg: status.msg || "Status check failed" });
            return;
          }

          // Notify progress
          if (onProgress) {
            onProgress(status);
          }

          // Log new variants as they complete
          if (status.variants_completed > lastVariantsCompleted) {
            console.log(`✅ Variant ${status.variants_completed}/${status.total_variants} completed`);
            lastVariantsCompleted = status.variants_completed;
          }

          if (status.status === 'completed') {
            console.log(`🎉 Batch job ${jobId} completed with ${status.variants?.length || 0} variants`);
            resolve({
              ok: true,
              jobId,
              modelId: status.modelId,
              variants: status.variants || [],
              elapsed: status.elapsed
            });
            return;
          }

          if (status.status === 'failed') {
            resolve({ ok: false, msg: status.error || "Batch generation failed" });
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);

        } catch (err) {
          if (err.name === 'AbortError') {
            resolve({ ok: false, msg: "Generation cancelled by user" });
          } else {
            console.error("Polling error:", err);
            // Retry on transient errors
            setTimeout(poll, pollInterval * 2);
          }
        }
      };

      // Start polling
      setTimeout(poll, pollInterval);
    });

  } catch (error) {
    console.error("Text-to-3D Batch error:", error);
    if (error.name === "AbortError") {
      return { ok: false, msg: "Generation cancelled by user" };
    }
    return { ok: false, msg: error.message || "Network error" };
  }
}

/**
 * Get batch job status (for external polling)
 * @param {string} jobId - Job ID to check
 */
export async function getBatchStatus(jobId) {
  try {
    const res = await fetch(`${API_BASE}/generate/batch-status/${jobId}`, {
      headers: { ...authHeaders() },
    });
    return res.json();
  } catch (error) {
    console.error("Get batch status error:", error);
    return { ok: false, msg: error.message };
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

/**
 * Apply Hunyuan3D-Paint texture to a selected shape-only model
 * @param {string} modelPath - AI-service relative path (e.g. "/outputs/xxx_v0.glb")
 * @param {string} [preprocessedImage] - Optional preprocessed image path for texture guidance
 * @returns {Promise<{ok: boolean, texturedModelUrl?: string, elapsed?: number, msg?: string}>}
 */
export async function applyModelTexture(modelPath, preprocessedImage = null) {
  try {
    const body = { modelPath };
    if (preprocessedImage) body.preprocessedImage = preprocessedImage;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 min timeout
    
    const res = await fetch(`${API_BASE}/generate/apply-texture`, {
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
      return { ok: false, msg: data.msg || "Texture application failed" };
    }
    
    return data;
  } catch (error) {
    console.error("Apply texture error:", error);
    if (error.name === "AbortError") {
      return { ok: false, msg: "Texture generation timed out." };
    }
    return { ok: false, msg: error.message || "Network error" };
  }
}
