const API_URL = "http://localhost:5000/api/auth";

export const signup = async (email, password) =>
  fetch(`${API_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then(res => res.json());

export const login = async (email, password) =>
  fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then(res => res.json());

export const adminLogin = async (email, password) =>
  fetch(`${API_URL}/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then(res => res.json());

export const forgotPassword = async (email) =>
  fetch(`${API_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }).then(res => res.json());

export const verifyResetOTP = async (email, otp) =>
  fetch(`${API_URL}/verify-reset-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  }).then(res => res.json());

export const resetPassword = async (email, otp, newPassword) =>
  fetch(`${API_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, newPassword }),
  }).then(res => res.json());

export const verifyOTP = async (email, otp) =>
  fetch(`${API_URL}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  }).then(res => res.json());

export const resendOTP = async (email, type = "signup") =>
  fetch(`${API_URL}/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, type }),
  }).then(res => res.json());

export const getProfile = async (token) =>
  fetch(`${API_URL}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(res => res.json());

export const updateProfile = async (token, data) =>
  fetch(`${API_URL}/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  }).then(res => res.json());

export const changePassword = async (token, currentPassword, newPassword) =>
  fetch(`${API_URL}/change-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  }).then(res => res.json());
