import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation, BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { AuthContext, useAuth } from './contexts/AuthContext';
import SignupPage from './Signup';
import LoginPage from './Login';

const API_URL = "http://localhost:5000/api";

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("pv_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("pv_token") || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem("pv_user", JSON.stringify(user));
    else localStorage.removeItem("pv_user");
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem("pv_token", token);
    else localStorage.removeItem("pv_token");
  }, [token]);

  const API = axios.create({
    baseURL: API_URL,
    headers: { Authorization: token ? `Bearer ${token}` : undefined },
  });

  async function signup(email, password) {
    setLoading(true);
    try {
      const res = await API.post("/auth/signup", { email, password });
      setLoading(false);
      return { ok: true, data: res.data };
    } catch (err) {
      setLoading(false);
      return { ok: false, error: err?.response?.data?.msg || err.message };
    }
  }

  async function verifySignupOtp(email, otp) {
    setLoading(true);
    try {
      const res = await API.post("/auth/verify-otp", { email, otp });
      setLoading(false);
      return { ok: true, data: res.data };
    } catch (err) {
      setLoading(false);
      return { ok: false, error: err?.response?.data?.msg || err.message };
    }
  }

  async function login(email, password) {
    setLoading(true);
    try {
      const res = await API.post("/auth/login", { email, password });
      const t = res.data.token;
      setToken(t);
      setUser({ email });
      setLoading(false);
      return { ok: true };
    } catch (err) {
      setLoading(false);
      return { ok: false, error: err?.response?.data?.msg || err.message };
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  async function forgotPassword(email) {
    setLoading(true);
    try {
      const res = await API.post("/auth/forgot-password", { email });
      setLoading(false);
      return { ok: true, data: res.data };
    } catch (err) {
      setLoading(false);
      return { ok: false, error: err?.response?.data?.msg || err.message };
    }
  }

  async function resetPassword(email, otp, newPassword) {
    setLoading(true);
    try {
      const res = await API.post("/auth/reset-password", { email, otp, newPassword });
      setLoading(false);
      return { ok: true, data: res.data };
    } catch (err) {
      setLoading(false);
      return { ok: false, error: err?.response?.data?.msg || err.message };
    }
  }

  const value = { user, token, loading, signup, verifySignupOtp, login, logout, forgotPassword, resetPassword };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ---------- UI primitives ---------- */
function Card({ children, className = "" }) {
  return <div className={`bg-white/5 p-6 rounded-2xl shadow text-white ${className}`}>{children}</div>;
}

function FullPageCenter({ children }) {
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black px-6">{children}</div>;
}

/* ---------- Pages ---------- */

function Home() {
  return (
    <div className="max-w-4xl mx-auto py-20">
      <h1 className="text-4xl font-extrabold text-green-400 mb-4">Polyva — Text & Image to 3D</h1>
      <p className="text-gray-300 mb-6">Demo frontend connected to backend for signup/login/forgot-password flows.</p>
      <div className="flex gap-3">
        <Link to="/text-to-3d" className="px-4 py-2 bg-green-600 rounded font-semibold">Text to 3D</Link>
        <Link to="/image-to-3d" className="px-4 py-2 bg-green-600 rounded font-semibold">Image to 3D</Link>
        <Link to="/signup" className="px-4 py-2 bg-white/5 rounded">Sign up</Link>
        <Link to="/login" className="px-4 py-2 bg-white/5 rounded">Login</Link>
      </div>
    </div>
  );
}

/* --- SignupForm Component --- */
function SignupFormPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const res = await auth.signup(email, password);
    if (!res.ok) return setError(res.error || "Failed to signup");
    // signup success — navigate to verify OTP and pass email/password for auto-login after verify
    navigate("/verify-otp", { state: { email, password, next: "/text-to-3d" } });
  };

  return (
    <FullPageCenter>
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-green-300 mb-3">Create your account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            required 
            type="email" 
            placeholder="Email" 
            className="w-full p-3 rounded bg-transparent border border-white/10 text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
          <input 
            required 
            type="password" 
            placeholder="Password" 
            className="w-full p-3 rounded bg-transparent border border-white/10 text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          {error && <div className="text-sm text-red-400">{error}</div>}
          <div className="flex items-center justify-between">
            <button type="submit" className="px-4 py-2 bg-green-500 rounded text-black font-semibold hover:bg-green-600">Sign up</button>
            <Link to="/login" className="text-sm text-gray-300 hover:text-white">Already have an account?</Link>
          </div>
        </form>
      </Card>
    </FullPageCenter>
  );
}

/* --- Verify OTP Page (used after signup). On success will auto-login then navigate next --- */
function VerifyOtpPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const email = state.email || "";
  const password = state.password || "";
  const next = state.next || "/";

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState(null);
  const [seconds, setSeconds] = useState(60);
  const timerRef = useRef();

  useEffect(() => {
    setSeconds(60);
    timerRef.current = setInterval(() => setSeconds(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(timerRef.current);
  }, [email]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage(null);
    const res = await auth.verifySignupOtp(email, otp);
    if (!res.ok) return setMessage(res.error || "Invalid OTP");
    // now auto login using password (from state)
    const loginRes = await auth.login(email, password);
    if (!loginRes.ok) return setMessage(loginRes.error || "Verified but login failed");
    navigate(next);
  };

  const handleResend = async () => {
    setMessage(null);
    // re-use forgot-password endpoint to request a fresh OTP for existing account
    const res = await auth.forgotPassword(email);
    if (!res.ok) setMessage(res.error || "Failed to resend");
    else {
      setMessage("OTP resent to email");
      setSeconds(60);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setSeconds(s => s > 0 ? s - 1 : 0), 1000);
    }
  };

  return (
    <FullPageCenter>
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-green-300 mb-2">Verify your email</h2>
        <p className="text-sm text-gray-300 mb-4">We've sent a 6-digit code to <span className="font-medium">{email}</span></p>
        <form onSubmit={handleVerify} className="space-y-4">
          <input value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} placeholder="Enter OTP" className="w-full p-3 rounded bg-transparent border border-white/10 text-center tracking-widest" />
          {message && <div className="text-sm text-yellow-300">{message}</div>}
          <div className="flex items-center justify-between">
            <button className="px-4 py-2 bg-green-500 rounded text-black font-semibold">Verify</button>
            <div className="text-sm text-gray-300">
              {seconds > 0 ? `Resend in ${seconds}s` : <button type="button" onClick={handleResend} className="text-green-300 underline">Resend OTP</button>}
            </div>
          </div>
        </form>
      </Card>
    </FullPageCenter>
  );
}

/* --- Login Page --- */
// Using Login component from ./Login (imported at top). Local duplicate removed to avoid redeclaration.

/* --- Forgot Password flow: enter email -> OTP (we'll capture OTP to pass to reset) -> Reset Password --- */
function ForgotStart() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);

  const handle = async (e) => {
    e.preventDefault();
    setMessage(null);
    const res = await auth.forgotPassword(email);
    if (!res.ok) return setMessage(res.error || "Failed to send OTP");
    navigate("/forgot/otp", { state: { email } });
  };

  return (
    <FullPageCenter>
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-green-300 mb-3">Forgot password</h2>
        <form onSubmit={handle} className="space-y-4">
          <input required type="email" placeholder="Email" className="w-full p-3 rounded bg-transparent border border-white/10" value={email} onChange={(e) => setEmail(e.target.value)} />
          {message && <div className="text-sm text-yellow-300">{message}</div>}
          <button className="px-4 py-2 bg-green-500 rounded text-black font-semibold">Send OTP</button>
        </form>
      </Card>
    </FullPageCenter>
  );
}

function ForgotOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const email = state.email || "";

  const [otp, setOtp] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [message, setMessage] = useState(null);
  const timerRef = useRef();
  const auth = useAuth();

  useEffect(() => {
    setSeconds(60);
    timerRef.current = setInterval(() => setSeconds(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(timerRef.current);
  }, [email]);

  const handleContinue = (e) => {
    e.preventDefault();
    // We do NOT call verify endpoint here; we simply pass OTP to the reset page where API will validate
    navigate("/forgot/reset", { state: { email, otp } });
  };

  const handleResend = async () => {
    setMessage(null);
    const res = await auth.forgotPassword(email);
    if (!res.ok) setMessage(res.error || "Failed to resend");
    else {
      setMessage("OTP resent");
      setSeconds(60);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setSeconds(s => s > 0 ? s - 1 : 0), 1000);
    }
  };

  return (
    <FullPageCenter>
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-green-300 mb-2">Enter OTP</h2>
        <p className="text-sm text-gray-300 mb-4">We sent an OTP to <span className="font-medium">{email}</span></p>
        <form onSubmit={handleContinue} className="space-y-4">
          <input value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} placeholder="OTP" className="w-full p-3 rounded bg-transparent border border-white/10 text-center tracking-widest" />
          {message && <div className="text-sm text-yellow-300">{message}</div>}
          <div className="flex items-center justify-between">
            <button className="px-4 py-2 bg-green-500 rounded text-black font-semibold">Continue</button>
            <div className="text-sm text-gray-300">{seconds > 0 ? `Resend in ${seconds}s` : <button type="button" onClick={handleResend} className="text-green-300 underline">Resend</button>}</div>
          </div>
        </form>
      </Card>
    </FullPageCenter>
  );
}

function ForgotReset() {
  const location = useLocation();
  const state = location.state || {};
  const email = state.email || "";
  const otpFromState = state.otp || "";
  const auth = useAuth();
  const navigate = useNavigate();

  const [otp, setOtp] = useState(otpFromState);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);

  const handle = async (e) => {
    e.preventDefault();
    setError(null);
    if (pwd.length < 6) return setError("Password must be >= 6 chars");
    if (pwd !== confirm) return setError("Passwords do not match");
    const res = await auth.resetPassword(email, otp, pwd);
    if (!res.ok) return setError(res.error || "Failed to reset");
    // success
    navigate("/login");
  };

  return (
    <FullPageCenter>
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-green-300 mb-3">Reset password</h2>
        <form onSubmit={handle} className="space-y-4">
          <div className="text-sm text-gray-300">Reset for <span className="font-medium">{email}</span></div>
          <input value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder="OTP" className="w-full p-3 rounded bg-transparent border border-white/10" />
          <input value={pwd} onChange={(e) => setPwd(e.target.value)} required type="password" placeholder="New password" className="w-full p-3 rounded bg-transparent border border-white/10" />
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} required type="password" placeholder="Confirm password" className="w-full p-3 rounded bg-transparent border border-white/10" />
          {error && <div className="text-sm text-red-400">{error}</div>}
          <div className="flex items-center justify-between">
            <button className="px-4 py-2 bg-green-500 rounded text-black font-semibold">Save new password</button>
            <Link to="/login" className="text-sm text-gray-300 underline">Back to login</Link>
          </div>
        </form>
      </Card>
    </FullPageCenter>
  );
}

/* --- Protected TextTo3D and ImageTo3D pages (simple placeholders) --- */
function RequireAuth({ children }) {
  const auth = useAuth();
  const location = useLocation();
  if (!auth.user) {
    // redirect to login but keep desired path so user returns after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

function TextTo3DMain() {
  const [prompt, setPrompt] = useState("");
  const auth = useAuth();

  const handleGenerate = async () => {
    // Example: call generate endpoint (not implemented in backend demo). We'll mock.
    alert("Generate request submitted (mock). Backend generation endpoint to be implemented.");
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        <aside className="col-span-3">
          <Card>
            <div className="text-sm text-gray-300 mb-3">Your Models</div>
            <div className="space-y-2">
              <div className="p-2 bg-white/5 rounded">Example Model A</div>
              <div className="p-2 bg-white/5 rounded">Example Model B</div>
            </div>
          </Card>
        </aside>

        <main className="col-span-6">
          <Card className="flex flex-col items-center justify-center" >
            <div className="w-full h-96 bg-black/70 rounded-lg flex items-center justify-center">3D Viewer Placeholder</div>
            <div className="mt-4 flex gap-3 w-full">
              <button onClick={handleGenerate} className="flex-1 py-3 rounded-lg font-bold text-black" style={{ background: "linear-gradient(90deg,#FFD700,#ADFF2F,#FF69B4)" }}>Generate</button>
            </div>
          </Card>
        </main>

        <aside className="col-span-3">
          <Card>
            <div className="text-sm text-gray-300 mb-2">Prompt (max 800 chars)</div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={800} className="w-full h-40 p-3 rounded bg-transparent border border-white/10" />
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-2 bg-green-600 rounded">Symmetry</button>
              <button className="px-3 py-2 bg-green-600 rounded">Remesh</button>
              <button className="px-3 py-2 bg-green-600 rounded">Texture</button>
              <button className="px-3 py-2 bg-green-600 rounded">Animate</button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ImageTo3DMain() {
  const [file, setFile] = useState(null);
  const handleFile = (e) => {
    const f = e.target.files[0];
    setFile(f);
  };
  const handleGenerate = () => {
    if (!file) return alert("Please upload an image first");
    alert(`Generating model from ${file.name} (mock)`);
  };
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        <aside className="col-span-3"><Card>Left</Card></aside>
        <main className="col-span-6"><Card><div className="w-full h-96 bg-black/70 rounded-lg flex items-center justify-center">3D Viewer Placeholder</div></Card></main>
        <aside className="col-span-3">
          <Card>
            <label className="block w-full h-40 bg-white/3 rounded flex items-center justify-center cursor-pointer">
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleFile} className="hidden" />
              <div className="text-sm text-gray-200">Click to upload or drop image</div>
            </label>
            {file && <div className="mt-3 text-sm text-gray-300">{file.name}</div>}
            <button className="mt-4 w-full py-3 font-bold rounded text-black" style={{ background: "linear-gradient(90deg,#FFD700,#ADFF2F,#FF69B4)" }} onClick={handleGenerate}>Generate</button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

/* ---------- App + Routing ---------- */
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot" element={<ForgotStart />} />
            <Route path="/forgot/otp" element={<ForgotOtp />} />
            <Route path="/forgot/reset" element={<ForgotReset />} />

            <Route path="/text-to-3d" element={<RequireAuth><TextTo3DMain /></RequireAuth>} />
            <Route path="/image-to-3d" element={<RequireAuth><ImageTo3DMain /></RequireAuth>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}
