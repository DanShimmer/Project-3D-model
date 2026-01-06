import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "./Components/AppShell";
import { useTheme } from "./contexts/ThemeContext";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, currentTheme } = useTheme();

  const [email, setEmail] = useState(location?.state?.email || "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Account verified! You can now sign in.");
        // Redirect to login after a short pause
        setTimeout(() => navigate("/login"), 1000);
      } else {
        setError(data.msg || "Verification failed");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    }
  };

  return (
    <AppShell>
      <div className={`max-w-md mx-auto ${currentTheme.cardBg} rounded-xl p-8 border ${currentTheme.border}`}>
        <header className="text-center mb-8">
          <h2 className={`text-2xl font-bold ${currentTheme.text} mb-2`}>Verify your email</h2>
          <p className={currentTheme.textSecondary}>Enter the 6-digit code we sent to your email</p>
        </header>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={`block text-sm font-medium ${currentTheme.textSecondary} mb-1`} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'} border ${currentTheme.border} ${currentTheme.text} focus:border-current`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${currentTheme.textSecondary} mb-1`} htmlFor="otp">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="\\d{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                className={`w-full px-4 py-2 tracking-widest text-center text-lg rounded-lg ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'} border ${currentTheme.border} ${currentTheme.text} focus:border-current`}
                placeholder="123456"
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-500 text-sm">{success}</p>}

            <div>
              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${currentTheme.accentGradient} text-white font-medium hover:opacity-90`}
              >
                Verify
              </button>
            </div>

            <div className="flex justify-center text-sm">
              <Link to="/login" className={`${currentTheme.textSecondary} hover:opacity-80`}>
                Back to sign in
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </AppShell>
  );
}
