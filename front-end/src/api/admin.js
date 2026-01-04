const API_URL = "http://localhost:5000/api/admin";

const getToken = () => localStorage.getItem("pv_token");

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// Dashboard stats
export const getDashboardStats = async () =>
  fetch(`${API_URL}/stats`, {
    headers: authHeaders(),
  }).then(res => res.json());

// Users
export const getAllUsers = async (page = 1, limit = 10, search = "", status = "all") => {
  const params = new URLSearchParams({ page, limit, search, status });
  return fetch(`${API_URL}/users?${params}`, {
    headers: authHeaders(),
  }).then(res => res.json());
};

export const getUserById = async (userId) =>
  fetch(`${API_URL}/users/${userId}`, {
    headers: authHeaders(),
  }).then(res => res.json());

export const updateUser = async (userId, data) =>
  fetch(`${API_URL}/users/${userId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const toggleBlockUser = async (userId) =>
  fetch(`${API_URL}/users/${userId}/toggle-block`, {
    method: "PUT",
    headers: authHeaders(),
  }).then(res => res.json());

export const deleteUser = async (userId) =>
  fetch(`${API_URL}/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(res => res.json());

// User models
export const getUserModels = async (userId, page = 1, limit = 10) => {
  const params = new URLSearchParams({ page, limit });
  return fetch(`${API_URL}/users/${userId}/models?${params}`, {
    headers: authHeaders(),
  }).then(res => res.json());
};

export const deleteModelByAdmin = async (modelId) =>
  fetch(`${API_URL}/models/${modelId}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(res => res.json());
