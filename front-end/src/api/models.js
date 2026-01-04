const API_URL = "http://localhost:5000/api/models";

const getToken = () => localStorage.getItem("pv_token");

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// Get all models for logged-in user
export const getMyModels = async (page = 1, limit = 12, type = "all") => {
  const params = new URLSearchParams({ page, limit, type });
  return fetch(`${API_URL}?${params}`, {
    headers: authHeaders(),
  }).then(res => res.json());
};

// Get single model
export const getModelById = async (modelId) =>
  fetch(`${API_URL}/${modelId}`, {
    headers: authHeaders(),
  }).then(res => res.json());

// Create new model
export const createModel = async (data) =>
  fetch(API_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

// Update model
export const updateModel = async (modelId, data) =>
  fetch(`${API_URL}/${modelId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

// Delete model
export const deleteModel = async (modelId) =>
  fetch(`${API_URL}/${modelId}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(res => res.json());

// Share model
export const shareModel = async (modelId) =>
  fetch(`${API_URL}/${modelId}/share`, {
    method: "POST",
    headers: authHeaders(),
  }).then(res => res.json());

// Revoke share
export const unshareModel = async (modelId) =>
  fetch(`${API_URL}/${modelId}/share`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(res => res.json());

// Get shared model (public)
export const getSharedModel = async (shareToken) =>
  fetch(`${API_URL}/shared/${shareToken}`).then(res => res.json());

// Duplicate model
export const duplicateModel = async (modelId) =>
  fetch(`${API_URL}/${modelId}/duplicate`, {
    method: "POST",
    headers: authHeaders(),
  }).then(res => res.json());
