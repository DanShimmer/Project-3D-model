import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogoIcon } from "./Logo";

export default function LoginModal({ onClose, onLoginSuccess }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login | signup | forgot | admin | otp
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_URL = "http://localhost:5000/api/auth";

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "login") {
        // Step 1: Request OTP
        const res = await fetch(`${API_URL}/login-request-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        
        if (res.ok) {
          setMode("otp");
          setSuccess("OTP sent to your email");
        } else {
          setError(data.msg || "Login failed");
        }
      } else if (mode === "otp") {
        // Step 2: Verify OTP
        const res = await fetch(`${API_URL}/login-verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        });
        const data = await res.json();
        
        if (res.ok && data.token) {
          localStorage.setItem("pv_token", data.token);
          localStorage.setItem("pv_user", JSON.stringify(data.user));
          onLoginSuccess(data.user, data.token);
          onClose();
          navigate("/generate");
        } else {
          setError(data.msg || "Invalid OTP");
        }
      } else if (mode === "admin") {
        const res = await fetch(`${API_URL}/admin-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        
        if (res.ok && data.token) {
          localStorage.setItem("pv_token", data.token);
          localStorage.setItem("pv_user", JSON.stringify(data.user));
          onLoginSuccess(data.user, data.token);
          onClose();
          // Redirect to admin dashboard
          navigate("/admin");
        } else {
          setError(data.msg || "Admin login failed");
        }
      } else if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        
        const res = await fetch(`${API_URL}/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        
        if (res.ok) {
          setSuccess("Signup successful! Check your email for OTP verification.");
          setTimeout(() => {
            onClose();
            window.location.href = `/verify-otp?email=${encodeURIComponent(email)}`;
          }, 1500);
        } else {
          setError(data.msg || "Signup failed");
        }
      } else if (mode === "forgot") {
        const res = await fetch(`${API_URL}/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        
        if (res.ok) {
          setSuccess("OTP sent to your email!");
          setTimeout(() => {
            onClose();
            window.location.href = "/forgot-password";
          }, 1500);
        } else {
          setError(data.msg || "Failed to send reset email");
        }
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setError("");
    setSuccess("");
  };

  const switchMode = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login-request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("OTP resent successfully");
      } else {
        setError(data.msg || "Failed to resend OTP");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-gray-900/95 border border-gray-700/50 rounded-2xl p-8 w-[400px] shadow-2xl relative"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <LogoIcon size={48} />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {mode === "login" && "Welcome Back"}
            {mode === "otp" && "Verify OTP"}
            {mode === "admin" && "Admin Login"}
            {mode === "signup" && "Create Account"}
            {mode === "forgot" && "Reset Password"}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {mode === "login" && "Sign in to continue to Polyva"}
            {mode === "otp" && `Enter the code sent to ${email}`}
            {mode === "admin" && "Sign in with admin credentials"}
            {mode === "signup" && "Sign up to get started"}
            {mode === "forgot" && "Enter your email to reset password"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "otp" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="123456"
                  className="w-full px-4 py-3 tracking-widest text-center text-lg rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                  required
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-sm text-gray-400 hover:text-green-400 transition-colors"
              >
                Didn't receive code? Resend OTP
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {mode !== "forgot" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}
            </>
          )}

          {/* Error/Success Messages */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center py-2 px-3 bg-red-500/10 rounded-lg"
            >
              {error}
            </motion.p>
          )}

          {success && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-green-400 text-sm text-center py-2 px-3 bg-green-500/10 rounded-lg"
            >
              {success}
            </motion.p>
          )}

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all disabled:opacity-50 ${
              mode === "admin"
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                : "bg-gradient-to-r from-green-500 to-emerald-400 text-white hover:opacity-90"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {mode === "otp" ? "Verifying..." : "Processing..."}
              </span>
            ) : (
              <>
                {mode === "login" && "Continue"}
                {mode === "otp" && "Verify & Sign In"}
                {mode === "admin" && "Admin Sign In"}
                {mode === "signup" && "Create Account"}
                {mode === "forgot" && "Send Reset Link"}
              </>
            )}
          </motion.button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-gray-400 space-y-2">
          {mode === "otp" && (
            <button
              onClick={() => {
                setMode("login");
                setOtp("");
                setError("");
                setSuccess("");
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Login
            </button>
          )}

          {mode === "login" && (
            <>
              <p>
                Don't have an account?{" "}
                <button
                  onClick={() => switchMode("signup")}
                  className="text-green-400 hover:text-green-300 font-medium transition-colors"
                >
                  Sign Up
                </button>
              </p>
              <p>
                <button
                  onClick={() => switchMode("forgot")}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Forgot password?
                </button>
              </p>
              {/* Admin Login Button */}
              <div className="pt-4 border-t border-gray-700/50">
                <button
                  onClick={() => switchMode("admin")}
                  className="flex items-center justify-center gap-2 mx-auto text-xs text-gray-500 hover:text-purple-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Login as Admin
                </button>
              </div>
            </>
          )}

          {mode === "admin" && (
            <button
              onClick={() => switchMode("login")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to User Login
            </button>
          )}

          {mode === "signup" && (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => switchMode("login")}
                className="text-green-400 hover:text-green-300 font-medium transition-colors"
              >
                Sign In
              </button>
            </p>
          )}

          {mode === "forgot" && (
            <button
              onClick={() => switchMode("login")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Login
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
