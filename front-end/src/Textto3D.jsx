import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { LucideFolder, LucideImage, LucideBox, LucideDownload, LucideSettings, LucideShare2 } from "lucide-react";

// API URL (set to your backend endpoint)
const API_URL = "http://localhost:5000/api";

// Token helpers
const getToken = () => localStorage.getItem("pv_token");
const setToken = (t) => localStorage.setItem("pv_token", t);
const clearToken = () => localStorage.removeItem("pv_token");

export default function TextTo3D() {
  const [prompt, setPrompt] = useState("");
  const [modelUrl, setModelUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auth state
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState("login"); // login | signup | forgot | otp
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [msg, setMsg] = useState("");

  // Generate model (calls backend)
  const handleGenerate = async () => {
    if (!getToken()) {
      setShowAuth(true);
      setMode("login");
      return;
    }
    if (!prompt.trim()) {
      setMsg("Please enter a description before generating.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/generate/text-to-3d`,
        { prompt },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setModelUrl(res.data.modelUrl || "/demo-model.glb");
      setMsg("Model generated successfully!");
    } catch (err) {
      setMsg(err.response?.data?.msg || "Generate failed");
    } finally {
      setLoading(false);
    }
  };

  // Auth handlers
  const handleAuth = async () => {
    try {
      let res;
      if (mode === "login") {
        res = await axios.post(`${API_URL}/auth/login`, {
          email: form.email,
          password: form.password,
        });
        setToken(res.data.token);
        setMsg("Login successful!");
        setShowAuth(false);
      } else if (mode === "signup") {
        res = await axios.post(`${API_URL}/auth/signup`, {
          email: form.email,
          password: form.password,
        });
        setMsg("Signup successful! Check email for OTP.");
        setMode("otp");
      } else if (mode === "otp") {
        res = await axios.post(`${API_URL}/auth/verify-otp`, {
          email: form.email,
          otp: form.otp,
        });
        setMsg("Email verified! Please login.");
        setMode("login");
      } else if (mode === "forgot") {
        res = await axios.post(`${API_URL}/auth/forgot-password`, {
          email: form.email,
        });
        setMsg("OTP sent to your email for password reset.");
        setMode("otp");
      }
    } catch (err) {
      setMsg(err.response?.data?.msg || "Error");
    }
  };

  const toolbarButtons = [
    { icon: LucideFolder, label: "Files" },
    { icon: LucideImage, label: "Templates" },
    { icon: LucideBox, label: "Models" },
    { icon: LucideShare2, label: "Share" },
    { icon: LucideSettings, label: "Settings" }
  ];

  const modelPresets = [
    "Character model with realistic textures",
    "Sci-fi vehicle with glowing parts",
    "Fantasy environment with vegetation",
    "Modern architectural structure"
  ];

  return (
    <div className="min-h-screen bg-[#04060A] text-white flex">
      {/* Left toolbar */}
      <div className="w-16 bg-gray-900/50 border-r border-gray-800/30 flex flex-col items-center py-4 gap-6">
        {toolbarButtons.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
            title={label}
          >
            <Icon size={24} />
          </button>
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Left side: Recent models/templates */}
        <div className="w-72 border-r border-gray-800/30 p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Recent</h2>
            <button className="text-gray-400 hover:text-white">
              <LucideDownload size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            {["Model 1", "Model 2", "Model 3"].map((model) => (
              <div
                key={model}
                className="p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 cursor-pointer"
              >
                {model}
              </div>
            ))}
          </div>
        </div>

        {/* Center: Preview area */}
        <div className="flex-1 p-6">
          <div className="h-[calc(100vh-3rem)] flex flex-col">
            {/* Preview window */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 bg-gray-900/50 rounded-xl flex items-center justify-center border border-gray-800/30"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full"
                />
              ) : modelUrl ? (
                <div className="text-center">
                  <p className="text-green-400 mb-2">Model Generated!</p>
                  <p className="text-sm text-gray-400">{modelUrl}</p>
                </div>
              ) : (
                <p className="text-gray-400">3D preview will appear here</p>
              )}
            </motion.div>
          </div>
        </div>

        {/* Right side: Controls */}
        <div className="w-96 border-l border-gray-800/30 p-6 flex flex-col">
          {/* Model type selector */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <span>AI Model</span>
              <div className="flex-1" />
              <select className="bg-gray-800/30 rounded px-2 py-1 text-sm">
                <option>Meshy 6 Preview</option>
              </select>
            </label>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {modelPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => setPrompt(preset)}
                className="px-3 py-1 text-sm rounded-full bg-gray-800/30 hover:bg-gray-800/50 text-gray-400 hover:text-white"
              >
                {preset.slice(0, 15)}...
              </button>
            ))}
          </div>

          {/* Text input */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the 3D model you want to create..."
            className="flex-1 bg-gray-800/30 rounded-xl p-4 resize-none mb-4 text-gray-100"
            maxLength={800}
          />

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGenerate}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 text-white font-medium hover:opacity-90"
            >
              Generate Model
            </button>
            
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  clearToken();
                  setMsg("Logged out");
                }}
                className="text-sm text-gray-400 hover:text-white"
              >
                Logout
              </button>
              {msg && <p className="text-sm text-yellow-400">{msg}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Popup auth */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900/90 p-8 rounded-2xl w-96 border border-gray-800/30"
          >
            <h2 className="text-xl font-bold mb-6 capitalize">{mode}</h2>
            <div className="space-y-4">
              {(mode === "login" || mode === "signup" || mode === "forgot") && (
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full p-3 rounded-lg bg-gray-800/50 border border-gray-700 focus:border-green-500 transition-colors"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              )}
              {(mode === "login" || mode === "signup") && (
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="w-full p-3 rounded-lg bg-gray-800/50 border border-gray-700 focus:border-green-500 transition-colors"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              )}
              {mode === "otp" && (
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Enter OTP</label>
                  <input
                    type="text"
                    placeholder="Enter OTP from your email"
                    className="w-full p-3 rounded-lg bg-gray-800/50 border border-gray-700 focus:border-green-500 transition-colors"
                    value={form.otp}
                    onChange={(e) => setForm({ ...form, otp: e.target.value })}
                  />
                </div>
              )}

              <button
                onClick={handleAuth}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 text-white font-medium hover:opacity-90 mt-6"
              >
                {mode === "login" ? "Sign In" : mode === "signup" ? "Sign Up" : mode === "forgot" ? "Send OTP" : "Verify OTP"}
              </button>

              <div className="flex flex-col items-center gap-2 mt-4 text-sm">
                {mode === "login" && (
                  <>
                    <button onClick={() => setMode("forgot")} className="text-gray-400 hover:text-white">
                      Forgot Password?
                    </button>
                    <button onClick={() => setMode("signup")} className="text-gray-400 hover:text-white">
                      Don't have an account? Sign up
                    </button>
                  </>
                )}
                {mode === "signup" && (
                  <button onClick={() => setMode("login")} className="text-gray-400 hover:text-white">
                    Already have an account? Sign in
                  </button>
                )}
              </div>
            </div>

            {msg && <p className="mt-4 text-sm text-center text-yellow-400">{msg}</p>}

            <button
              onClick={() => setShowAuth(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </motion.div>
        </div>
      )}

      {/* Popup auth */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 p-6 rounded-xl w-96"
          >
            <h2 className="text-xl font-bold mb-4 capitalize">{mode}</h2>
            <div className="space-y-3">
              {(mode === "login" || mode === "signup" || mode === "forgot") && (
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full p-2 rounded bg-gray-800"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              )}
              {(mode === "login" || mode === "signup") && (
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full p-2 rounded bg-gray-800"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              )}
              {mode === "otp" && (
                <input
                  type="text"
                  placeholder="Enter OTP"
                  className="w-full p-2 rounded bg-gray-800"
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value })}
                />
              )}
              <button
                onClick={handleAuth}
                className="w-full bg-blue-600 hover:bg-blue-500 p-2 rounded font-bold"
              >
                {mode}
              </button>
              {mode === "login" && (
                <p
                  className="text-sm text-gray-400 cursor-pointer"
                  onClick={() => setMode("forgot")}
                >
                  Forgot password?
                </p>
              )}
              {mode === "signup" && (
                <p
                  className="text-sm text-gray-400 cursor-pointer"
                  onClick={() => setMode("login")}
                >
                  Already have an account? Login
                </p>
              )}
              {mode === "login" && (
                <p
                  className="text-sm text-gray-400 cursor-pointer"
                  onClick={() => setMode("signup")}
                >
                  New here? Sign up
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
