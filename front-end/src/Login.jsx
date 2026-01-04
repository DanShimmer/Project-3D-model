import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("credentials"); // credentials | otp
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();

  // Canvas background effect
  useEffect(() => {
    const canvas = document.getElementById("loginBgCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const particles = Array.from({ length: 100 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.5,
      dy: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    let rafId;
    function draw() {
      ctx.fillStyle = "#04060A";
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,255,100,${p.alpha})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(120,255,100,0.9)";
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

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (step === "credentials") {
        // First step: verify credentials and request OTP
        const res = await fetch("http://localhost:5000/api/auth/login-request-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });
        
        const data = await res.json();
        
        if (res.ok) {
          setStep("otp");
        } else {
          setError(data.msg || "Login failed");
        }
      } else {
        // Second step: verify OTP and complete login
        const res = await fetch("http://localhost:5000/api/auth/login-verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, otp }),
        });
        
        const data = await res.json();
        
        if (res.ok && data.token) {
          localStorage.setItem("pv_token", data.token);
          localStorage.setItem("pv_user", JSON.stringify(data.user));
          navigate("/generate");
        } else {
          setError(data.msg || "Invalid OTP");
        }
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/login-request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.msg || "Failed to resend OTP");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-white relative">
      <canvas id="loginBgCanvas" className="fixed inset-0 w-full h-full -z-10" />

      {/* Header */}
      <header className="backdrop-blur-sm fixed top-0 w-full z-40 bg-white/10 border-b border-gray-800/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-800/30 rounded-lg flex items-center justify-center">
                <span className="text-sm font-semibold text-gray-300">PV</span>
              </div>
              <span className="font-semibold text-xl tracking-wide">Polyva</span>
            </Link>
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
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-gray-800/30 shadow-2xl">
            <header className="text-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">PV</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {step === "credentials" ? "Welcome back" : "Verify OTP"}
              </h2>
              <p className="text-gray-400">
                {step === "credentials" 
                  ? "Sign in to continue to Polyva" 
                  : `Enter the 6-digit code sent to ${email}`}
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              {step === "credentials" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="password">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="otp">
                      Verification Code
                    </label>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full px-4 py-3 tracking-widest text-center text-lg rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                      placeholder="123456"
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
              )}

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-sm text-center py-2 px-3 bg-red-500/10 rounded-lg"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {step === "credentials" ? "Sending OTP..." : "Verifying..."}
                  </span>
                ) : (
                  step === "credentials" ? "Continue" : "Verify & Sign In"
                )}
              </motion.button>

              <div className="flex justify-between text-sm">
                {step === "credentials" ? (
                  <>
                    <Link to="/signup" className="text-gray-400 hover:text-green-400 transition-colors">
                      Create account
                    </Link>
                    <Link to="/forgot-password" className="text-gray-400 hover:text-green-400 transition-colors">
                      Forgot password?
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setStep("credentials");
                      setOtp("");
                      setError(null);
                    }}
                    className="text-gray-400 hover:text-green-400 transition-colors"
                  >
                    ← Back to login
                  </button>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/20 bg-transparent">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} Polyva — All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}