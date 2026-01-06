import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogoIcon } from "./Logo";
import { useTheme } from "../contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: enter email, 2: enter OTP, 3: new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const { theme, currentTheme, toggleTheme } = useTheme();

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Canvas background effect matching Landpage
  useEffect(() => {
    const canvas = document.getElementById("bgCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;

    function resizeForDPR() {
      w = window.innerWidth;
      h = window.innerHeight;
      const curDpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * curDpr);
      canvas.height = Math.floor(h * curDpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(curDpr, 0, 0, curDpr, 0, 0);
    }

    resizeForDPR();

    const particles = Array.from({ length: 120 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 0.6,
      dx: (Math.random() - 0.5) * 0.6,
      dy: (Math.random() - 0.5) * 0.6,
      alpha: Math.random() * 0.6 + 0.25,
    }));

    // Theme-aware colors - Always use dark background
    const bgColor = "#04060A";
    const particleColor = theme === 'dark' ? "120,255,100" : "6,182,212";

    let rafId = 0;

    function draw() {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particleColor},${p.alpha})`;
        ctx.shadowBlur = 18;
        ctx.shadowColor = `rgba(${particleColor},0.95)`;
        ctx.fill();
        ctx.shadowBlur = 0;

        p.x += p.dx;
        p.y += p.dy;

        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }

      rafId = requestAnimationFrame(draw);
    }

    draw();

    function handleResize() {
      resizeForDPR();
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafId);
    };
  }, [theme]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("OTP sent to your email!");
        setStep(2);
        setCountdown(300); // 5 minutes
      } else {
        setError(data.msg || "Failed to send OTP");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        setSuccess("OTP verified! Enter your new password.");
        setStep(3);
      } else {
        setError(data.msg || "Invalid OTP");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("Password reset successful! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setError(data.msg || "Failed to reset password");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "reset" }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("OTP resent to your email!");
        setCountdown(300);
      } else {
        setError(data.msg || "Failed to resend OTP");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`min-h-screen flex flex-col bg-transparent ${currentTheme.text} relative`}>
      <canvas id="bgCanvas" className="fixed inset-0 w-full h-full -z-10" />

      {/* Header */}
      <header className={`backdrop-blur-sm fixed top-0 w-full z-40 ${currentTheme.navBg} border-b ${currentTheme.border}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3">
              <LogoIcon size={36} />
              <span className={`font-semibold text-xl tracking-wide ${currentTheme.text}`}>Polyva</span>
            </Link>
            <motion.button
              onClick={toggleTheme}
              className={`p-2 rounded-full ${currentTheme.buttonSecondary} transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center pt-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className={`${currentTheme.cardBg} backdrop-blur-sm rounded-2xl p-8 border ${currentTheme.border} shadow-2xl`}>
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step >= s
                        ? `bg-gradient-to-r ${currentTheme.accentGradient} text-white`
                        : `${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-200'} ${currentTheme.textSecondary}`
                    }`}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-12 h-0.5 ${
                        step > s ? (theme === 'dark' ? 'bg-lime-500' : 'bg-cyan-500') : (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300')
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            <header className="text-center mb-8">
              <h2 className={`text-2xl font-bold ${currentTheme.text} mb-2`}>
                {step === 1 && "Forgot Password"}
                {step === 2 && "Verify OTP"}
                {step === 3 && "Reset Password"}
              </h2>
              <p className={currentTheme.textSecondary}>
                {step === 1 && "Enter your email to receive a reset code"}
                {step === 2 && "Enter the OTP sent to your email"}
                {step === 3 && "Create your new password"}
              </p>
            </header>

            {/* Step 1: Enter Email */}
            {step === 1 && (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium ${currentTheme.textSecondary} mb-2`}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'} border ${currentTheme.border} ${currentTheme.text} placeholder-gray-500 focus:border-current transition-colors`}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${currentTheme.accentGradient} text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Send OTP"
                  )}
                </motion.button>

                <div className="text-center">
                  <Link to="/login" className={`${currentTheme.textSecondary} hover:opacity-80 text-sm transition-colors`}>
                    ← Back to Login
                  </Link>
                </div>
              </form>
            )}

            {/* Step 2: Verify OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium ${currentTheme.textSecondary} mb-2`}>
                    Enter OTP Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={`w-full px-4 py-3 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'} border ${currentTheme.border} ${currentTheme.text} text-center text-2xl tracking-[0.5em] placeholder-gray-500 focus:border-current transition-colors`}
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>

                {countdown > 0 && (
                  <p className={`text-center ${currentTheme.textSecondary} text-sm`}>
                    OTP expires in{" "}
                    <span className={`${theme === 'dark' ? 'text-lime-400' : 'text-cyan-600'} font-medium`}>{formatTime(countdown)}</span>
                  </p>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}

                {success && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-green-400 text-sm text-center"
                  >
                    {success}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${currentTheme.accentGradient} text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all`}
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </motion.button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={`${currentTheme.textSecondary} hover:opacity-80 transition-colors`}
                  >
                    ← Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={countdown > 0 || loading}
                    className={`transition-colors ${
                      countdown > 0
                        ? `${currentTheme.textMuted} cursor-not-allowed`
                        : `${theme === 'dark' ? 'text-lime-400 hover:text-lime-300' : 'text-cyan-600 hover:text-cyan-500'}`
                    }`}
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium ${currentTheme.textSecondary} mb-2`}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'} border ${currentTheme.border} ${currentTheme.text} placeholder-gray-500 focus:border-current transition-colors`}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${currentTheme.textSecondary} mb-2`}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'} border ${currentTheme.border} ${currentTheme.text} placeholder-gray-500 focus:border-current transition-colors`}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}

                {success && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-green-400 text-sm text-center"
                  >
                    {success}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${currentTheme.accentGradient} text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all`}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </motion.button>
              </form>
            )}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className={`border-t ${currentTheme.border} bg-transparent`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
          <div className={`text-sm ${currentTheme.textSecondary}`}>
            © {new Date().getFullYear()} Polyva — All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
