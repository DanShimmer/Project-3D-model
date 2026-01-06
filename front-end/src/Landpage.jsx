import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import LoginModal from "./Components/LoginModal";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import Logo, { LogoIcon } from "./Components/Logo";
import { 
  Sparkles, 
  Box, 
  Image as ImageIcon, 
  Type, 
  Palette, 
  Film,
  ArrowRight,
  Play,
  Upload,
  Download,
  ChevronDown,
  Zap,
  Star,
  Users,
  Globe,
  CheckCircle,
  Sun,
  Moon
} from "lucide-react";

// Use cases data with real 3D render images
const USE_CASES = [
  { 
    title: "Film Production", 
    gradient: "from-slate-500/90 to-slate-600/90",
    // Film reel 3D
    image: "https://img.freepik.com/free-psd/3d-rendering-film-element_23-2149738229.jpg"
  },
  { 
    title: "Product Design", 
    gradient: "from-blue-500/90 to-indigo-600/90",
    // Drill tool 3D
    image: "https://img.freepik.com/free-psd/3d-rendering-graphic-design-element_23-2149538257.jpg"
  },
  { 
    title: "Education", 
    gradient: "from-amber-400/90 to-yellow-500/90",
    // Graduation cap 3D
    image: "https://img.freepik.com/free-psd/3d-rendering-back-school_23-2149538245.jpg"
  },
  { 
    title: "Game Development", 
    gradient: "from-cyan-500/90 to-teal-600/90",
    // Game controller/character 3D
    image: "https://img.freepik.com/free-psd/3d-rendering-cartoon-character_23-2149436190.jpg"
  },
  { 
    title: "3D Printing", 
    gradient: "from-lime-500/90 to-green-600/90",
    // 3D printer/object
    image: "https://img.freepik.com/free-psd/3d-illustration-lightbulb_23-2149436175.jpg"
  },
  { 
    title: "VR/AR", 
    gradient: "from-purple-500/90 to-pink-600/90",
    // VR headset 3D
    image: "https://img.freepik.com/free-psd/3d-rendering-vr-glasses_23-2149436182.jpg"
  }
];

// How it works steps
const STEPS = [
  {
    number: "1",
    title: "Input",
    description: "Upload a clear image or enter a short text description. No 3D skills required.",
    color: "from-amber-500 to-yellow-600",
    bgColor: "bg-gradient-to-br from-amber-900/40 to-yellow-900/20"
  },
  {
    number: "2",
    title: "Generate",
    description: "Watch it transform into a high-quality 3D model that matches your input in just moments.",
    color: "from-green-500 to-emerald-600",
    bgColor: "bg-gradient-to-br from-green-900/40 to-emerald-900/20"
  },
  {
    number: "3",
    title: "Download",
    description: "Preview your model in the browser, then download it for your workflow.",
    color: "from-cyan-500 to-blue-600",
    bgColor: "bg-gradient-to-br from-cyan-900/40 to-blue-900/20"
  }
];

export default function PolyvaApp() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const { user, login, logout: authLogout } = useAuth();
  const { theme, toggleTheme, currentTheme } = useTheme();
  const canvasRef = useRef(null);

  // Handle logout
  const handleLogout = () => {
    authLogout();
    navigate("/");
  };

  // Handle login success
  const handleLoginSuccess = (userData, token) => {
    login(userData, token);
    setShowLoginModal(false);
  };
  
  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    }
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    let rafId = 0;

    function draw() {
      ctx.fillStyle = currentTheme.backgroundRaw;
      ctx.fillRect(0, 0, w, h);

      // Draw gradient overlay
      const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
      const glowAlpha = theme === 'dark' ? 0.03 : 0.08;
      gradient.addColorStop(0, `${currentTheme.particleColor}${glowAlpha})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${currentTheme.particleColor}${p.alpha})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = currentTheme.shadowColor;
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

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, [theme, currentTheme]);

  return (
    <div className={`min-h-screen flex flex-col ${currentTheme.background} ${currentTheme.text} relative transition-colors duration-500`}>
      {/* Background canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full block z-0" />
      
      {/* Header */}
      <header className={`backdrop-blur-xl fixed top-0 w-full z-40 ${currentTheme.navBg} border-b ${currentTheme.border} transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2">
                <LogoIcon size={36} />
                <span className={`font-bold text-xl ${currentTheme.text}`}>Polyva</span>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-1">
                <NavDropdown title="Features" theme={theme} currentTheme={currentTheme}>
                  <Link to="/generate" className="block">
                    <DropdownItem icon={Type} title="Text to 3D" subtitle="Generate models from text" theme={theme} currentTheme={currentTheme} />
                  </Link>
                  <Link to="/generate" className="block">
                    <DropdownItem icon={ImageIcon} title="Image to 3D" subtitle="Convert images to 3D" theme={theme} currentTheme={currentTheme} />
                  </Link>
                  <DropdownItem icon={Palette} title="AI Texturing" subtitle="Smart PBR textures" theme={theme} currentTheme={currentTheme} />
                  <DropdownItem icon={Film} title="Animation" subtitle="Rigging and animation" theme={theme} currentTheme={currentTheme} />
                </NavDropdown>

                <NavDropdown title="Community" theme={theme} currentTheme={currentTheme}>
                  <Link to="/showcase" className="block">
                    <DropdownItem icon={Star} title="Showcase" subtitle="Explore community models" theme={theme} currentTheme={currentTheme} />
                  </Link>
                  <DropdownItem icon={Users} title="Discord" subtitle="Join our community" theme={theme} currentTheme={currentTheme} />
                </NavDropdown>

                <NavDropdown title="Resources" theme={theme} currentTheme={currentTheme}>
                  <div className="p-4 grid grid-cols-2 gap-6">
                    <div>
                      <h4 className={`text-xs font-semibold ${currentTheme.textMuted} uppercase mb-3`}>Downloads</h4>
                      <div className="space-y-2 text-sm">
                        <div className={`${currentTheme.textSecondary} hover:${currentTheme.text} cursor-pointer transition-colors`}>Blender Plugin</div>
                        <div className={`${currentTheme.textSecondary} hover:${currentTheme.text} cursor-pointer transition-colors`}>Unity Package</div>
                        <div className={`${currentTheme.textSecondary} hover:${currentTheme.text} cursor-pointer transition-colors`}>Unreal Plugin</div>
                      </div>
                    </div>
                    <div>
                      <h4 className={`text-xs font-semibold ${currentTheme.textMuted} uppercase mb-3`}>Learn</h4>
                      <div className="space-y-2 text-sm">
                        <Link to="/blogs" className={`block ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>Blogs</Link>
                        <Link to="/docs" className={`block ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>Documentation</Link>
                        <Link to="/tutorials" className={`block ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>Tutorials</Link>
                        <Link to="/help" className={`block ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>Help Center</Link>
                      </div>
                    </div>
                  </div>
                </NavDropdown>

                <a href="#pricing" className={`px-4 py-2 text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>Pricing</a>
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className={`p-2.5 rounded-full ${currentTheme.buttonSecondary} border ${currentTheme.border} transition-all duration-300`}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: theme === 'dark' ? 0 : 180 }}
                  transition={{ duration: 0.3 }}
                >
                  {theme === 'dark' ? (
                    <Sun className={`w-4 h-4 ${currentTheme.accentColor}`} />
                  ) : (
                    <Moon className={`w-4 h-4 ${currentTheme.accentColor}`} />
                  )}
                </motion.div>
              </motion.button>

              {user ? (
                <>
                  <Link 
                    to="/my-storage" 
                    className={`hidden sm:flex items-center gap-2 px-4 py-2 text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}
                  >
                    <Box className="w-4 h-4" />
                    My Storage
                  </Link>

                  <div className="relative group">
                    <button className={`flex items-center gap-2 px-3 py-2 rounded-full ${currentTheme.buttonSecondary} transition-colors`}>
                      <div className={`w-7 h-7 bg-gradient-to-br ${currentTheme.accentGradient} rounded-full flex items-center justify-center text-white text-xs font-semibold`}>
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                      <ChevronDown className={`w-4 h-4 ${currentTheme.textSecondary}`} />
                    </button>

                    <div className={`opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-200 absolute right-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-xl border ${currentTheme.border} rounded-xl shadow-2xl overflow-hidden`}>
                      <div className={`px-4 py-3 border-b ${currentTheme.border}`}>
                        <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                        <p className={`text-xs ${currentTheme.textMuted} truncate`}>{user.email}</p>
                      </div>
                      <div className="py-2">
                        {/* My Storage - Hidden for admin users */}
                        {!user.isAdmin && (
                          <Link to="/my-storage" className={`flex items-center gap-3 px-4 py-2 text-sm ${currentTheme.textSecondary} hover:bg-white/5 hover:${currentTheme.text}`}>
                            <Box className="w-4 h-4" />
                            My Storage
                          </Link>
                        )}
                        {user.isAdmin && (
                          <Link to="/admin" className={`flex items-center gap-3 px-4 py-2 text-sm text-purple-400 hover:bg-white/5`}>
                            <Star className="w-4 h-4" />
                            Admin Dashboard
                          </Link>
                        )}
                        <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-white/5`}>
                          <ArrowRight className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setShowLoginModal(true)} 
                    className={`hidden sm:block px-4 py-2 text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}
                  >
                    Login
                  </button>
                  <Link 
                    to="/signup" 
                    className={`px-4 py-2 text-sm bg-gradient-to-r ${currentTheme.accentGradient} text-white rounded-full font-medium hover:shadow-lg ${currentTheme.accentShadow} transition-all`}
                  >
                    Sign up free
                  </Link>
                </>
              )}

              {/* Mobile hamburger */}
              <button onClick={() => setMobileOpen(v => !v)} className="lg:hidden p-2 rounded-lg hover:bg-white/5">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-white/5 bg-black/90 backdrop-blur-xl"
          >
            <div className="px-6 py-6 space-y-4">
              <Link to="/generate" className="block py-2 text-gray-300 hover:text-white">Create 3D Model</Link>
              <Link to="/showcase" className="block py-2 text-gray-300 hover:text-white">Showcase</Link>
              <Link to="/blogs" className="block py-2 text-gray-300 hover:text-white">Blogs</Link>
              <a href="#pricing" className="block py-2 text-gray-300 hover:text-white">Pricing</a>
              <div className="pt-4 flex gap-3">
                {user ? (
                  <>
                    {/* My Storage - Hidden for admin users */}
                    {!user.isAdmin && (
                      <Link to="/my-storage" className="flex-1 text-center py-2 bg-white/10 rounded-lg text-white">My Storage</Link>
                    )}
                    {user.isAdmin && (
                      <Link to="/admin" className="flex-1 text-center py-2 bg-purple-500/30 rounded-lg text-purple-300">Admin</Link>
                    )}
                    <button onClick={handleLogout} className="flex-1 text-center py-2 border border-red-500/50 rounded-lg text-red-400">Logout</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setShowLoginModal(true)} className="flex-1 text-center py-2 border border-white/20 rounded-lg text-white">Login</button>
                    <Link to="/signup" className={`flex-1 text-center py-2 ${theme === 'dark' ? 'bg-lime-500' : 'bg-cyan-500'} rounded-lg text-white font-medium`}>Sign up</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </header>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Main content */}
      <main className="relative z-10 pt-16">
        {/* Hero Section */}
        <section className="min-h-[90vh] flex items-center">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
            <div className="text-center max-w-4xl mx-auto">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-5xl md:text-7xl font-bold leading-tight"
              >
                <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  The Easiest Way To Create
                </span>
                <br />
                <span className={`bg-gradient-to-r ${theme === 'dark' ? 'from-lime-400 to-green-500' : 'from-cyan-400 to-blue-500'} bg-clip-text text-transparent`}>
                  3D Models
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mt-8 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
              >
                Meet the world's most popular and intuitive free AI 3D model generator. 
                Transform text and images into stunning 3D models in seconds.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => user ? navigate("/generate") : setShowLoginModal(true)}
                  className={`inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r ${theme === 'dark' ? 'from-lime-500 to-green-600 shadow-lime-500/20 hover:shadow-lime-500/40' : 'from-cyan-500 to-blue-600 shadow-cyan-500/20 hover:shadow-cyan-500/40'} text-white rounded-full font-semibold text-lg shadow-xl transition-all`}
                >
                  <Sparkles className="w-5 h-5" />
                  Start Creating
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-full font-medium hover:bg-white/10 transition-all"
                >
                  <Play className="w-5 h-5" />
                  Watch Demo
                </motion.button>
              </motion.div>
            </div>

            {/* Use Cases Carousel */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-20"
            >
              <h3 className={`text-center text-xl font-semibold mb-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-300'}`}>
                Trusted by creators in
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {USE_CASES.map((useCase, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * i }}
                    whileHover={{ scale: 1.05, y: -8 }}
                    className="relative group cursor-pointer flex flex-col items-center"
                  >
                    {/* 3D Model Image - floating above card */}
                    <div className="relative z-10 -mb-8">
                      <img 
                        src={useCase.image} 
                        alt={useCase.title}
                        className="w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-300"
                        style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.4))' }}
                      />
                    </div>
                    
                    {/* Gradient Card Background */}
                    <div className={`w-full pt-12 pb-4 px-4 rounded-3xl bg-gradient-to-br ${useCase.gradient} shadow-lg group-hover:shadow-xl transition-all`}>
                      <h4 className="font-semibold text-white text-center text-sm">{useCase.title}</h4>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Speed Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Zap className={`w-5 h-5 ${theme === 'dark' ? 'text-lime-400' : 'text-cyan-400'}`} />
                  <span className={`${theme === 'dark' ? 'text-lime-400' : 'text-cyan-400'} text-sm font-medium`}>Generation Speed</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                  Create 3D models
                  <br />
                  <span className={`${theme === 'dark' ? 'text-lime-400' : 'text-cyan-400'}`}>instantly</span>
                  <br />
                  in seconds
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed mb-8">
                  Polyva accelerates every stage of 3D asset creation, cutting completion time from days to minutes. From prompt to model, our AI-powered integrated tools let you iterate, generate, and refine with unmatched efficiency.
                </p>

                <div className="space-y-4">
                  {[
                    "Image to 3D model in seconds",
                    "Text to high-quality 3D model",
                    "Export to multiple formats: GLB, OBJ, FBX"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className={`w-5 h-5 ${theme === 'dark' ? 'text-lime-400' : 'text-cyan-400'} flex-shrink-0`} />
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Generation Card Preview */}
                <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl border border-white/10 p-6 shadow-2xl">
                  <div className="bg-black/50 rounded-2xl p-4 mb-4">
                    <div className="aspect-square rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme === 'dark' ? 'from-lime-500/10' : 'from-cyan-500/10'} to-transparent`} />
                      <Box className={`w-20 h-20 ${theme === 'dark' ? 'text-lime-500/50' : 'text-cyan-500/50'}`} />
                      <div className="absolute bottom-4 right-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                          className={`w-10 h-10 border-2 ${theme === 'dark' ? 'border-lime-500/30 border-t-lime-500' : 'border-cyan-500/30 border-t-cyan-500'} rounded-full`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme === 'dark' ? 'from-lime-500/20 to-green-500/20 border-lime-500/30' : 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30'} border flex items-center justify-center`}>
                      <Upload className={`w-5 h-5 ${theme === 'dark' ? 'text-lime-400' : 'text-cyan-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-400">Click / Drag & Drop / Paste Image</p>
                    </div>
                    <div className={`w-8 h-8 ${theme === 'dark' ? 'bg-lime-500' : 'bg-cyan-500'} rounded-full flex items-center justify-center`}>
                      <span className="text-white text-xl">+</span>
                    </div>
                  </div>

                  <button className={`w-full py-3 bg-gradient-to-r ${theme === 'dark' ? 'from-lime-500 to-green-600 shadow-lime-500/20' : 'from-cyan-500 to-blue-600 shadow-cyan-500/20'} rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg`}>
                    <Sparkles className="w-5 h-5" />
                    Generate
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How it works Section */}
        <section id="how-it-works" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-bold"
              >
                How It Works
              </motion.h2>
              
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                onClick={() => user ? navigate("/generate") : setShowLoginModal(true)}
                className={`mt-4 md:mt-0 flex items-center gap-2 px-6 py-3 ${theme === 'dark' ? 'bg-lime-500/20 text-lime-400 hover:bg-lime-500/30' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'} rounded-full font-medium transition-all`}
              >
                <Sparkles className="w-4 h-4" />
                Watch Demo
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.2 }}
                  viewport={{ once: true }}
                  className={`${step.bgColor} rounded-3xl p-8 border border-white/5 relative overflow-hidden`}
                >
                  <span className={`text-8xl font-bold bg-gradient-to-r ${step.color} bg-clip-text text-transparent opacity-50`}>
                    {step.number}
                  </span>
                  
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{step.description}</p>
                  </div>

                  {i < 2 && (
                    <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 hidden md:block">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center shadow-lg`}>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  {i === 2 && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle className="w-8 h-8 text-cyan-400" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Core Features</h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Discover powerful tools to help you create professional 3D models
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Type, title: "Text to 3D", desc: "Describe any object and generate a 3D model.", path: "/generate", color: "from-blue-500 to-cyan-500" },
                { icon: ImageIcon, title: "Image to 3D", desc: "Turn your images into textured meshes.", path: "/generate", color: "from-purple-500 to-pink-500" },
                { icon: Palette, title: "AI Texturing", desc: "Smart maps and PBR-ready UVs.", color: "from-orange-500 to-red-500" },
                { icon: Film, title: "Animation", desc: "Rigging, retargeting, and animation tools.", color: "from-green-500 to-emerald-500" }
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8 }}
                  className="group"
                >
                  {f.path ? (
                    <Link to={f.path} className="block h-full">
                      <FeatureCard {...f} theme={theme} />
                    </Link>
                  ) : (
                    <FeatureCard {...f} theme={theme} />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Showcase Section */}
        <section id="showcase" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
              <div>
                <h2 className="text-4xl font-bold mb-2">Showcase</h2>
                <p className="text-gray-400">Explore models created by the community</p>
              </div>
              <Link 
                to="/showcase" 
                className="mt-4 md:mt-0 flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-all"
              >
                Explore more
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                  className="group bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/10 overflow-hidden"
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme === 'dark' ? 'from-lime-500/5' : 'from-cyan-500/5'} to-transparent`} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Box className="w-16 h-16 text-gray-700" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white">3D Model {i}</h3>
                    <p className="text-sm text-gray-500 mt-1">By @user{i}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Blog Section */}
        <section id="blogs" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
              <div>
                <h2 className="text-4xl font-bold mb-2">Blogs</h2>
                <p className="text-gray-400">Latest news and tutorials</p>
              </div>
              <Link 
                to="/blogs" 
                className="mt-4 md:mt-0 flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-all"
              >
                Explore more
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: "How AI is Changing 3D Design", category: "AI & Technology" },
                { title: "Top 5 3D Tools in 2025", category: "Tools & Tips" },
                { title: "From Concept to Render: A Guide", category: "Tutorial" }
              ].map((blog, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                  className="group bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/10 overflow-hidden cursor-pointer"
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme === 'dark' ? 'from-lime-500/10' : 'from-cyan-500/10'} to-transparent`} />
                  </div>
                  <div className="p-5">
                    <span className={`text-xs ${theme === 'dark' ? 'text-lime-400' : 'text-cyan-400'} font-medium`}>{blog.category}</span>
                    <h3 className={`font-semibold text-white mt-2 group-hover:${theme === 'dark' ? 'text-lime-400' : 'text-cyan-400'} transition-colors`}>{blog.title}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple Pricing</h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Choose the plan that fits your needs
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { name: "Starter", price: "Free", features: ["50 credits/month", "Community support", "Watermark"], btn: "Get Started", popular: false },
                { name: "Pro", price: "$19", features: ["500 credits/month", "Priority support", "No watermark", "API access"], btn: "Subscribe", popular: true },
                { name: "Enterprise", price: "Contact", features: ["Unlimited credits", "Dedicated support", "Custom integration", "SLA guarantee"], btn: "Contact Us", popular: false }
              ].map((plan, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className={`relative rounded-3xl p-8 ${
                    plan.popular 
                      ? `bg-gradient-to-br ${theme === 'dark' ? 'from-lime-500/20 to-green-500/10 border-lime-500/50' : 'from-cyan-500/20 to-blue-500/10 border-cyan-500/50'} border-2` 
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className={`px-4 py-1.5 ${theme === 'dark' ? 'bg-lime-500' : 'bg-cyan-500'} text-white text-sm font-semibold rounded-full`}>
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== "Contact" && plan.price !== "Free" && <span className="text-gray-400">/month</span>}
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3 text-gray-300">
                        <CheckCircle className={`w-5 h-5 ${theme === 'dark' ? 'text-lime-400' : 'text-cyan-400'} flex-shrink-0`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <button className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    plan.popular 
                      ? `${theme === 'dark' ? 'bg-lime-500 hover:bg-lime-400' : 'bg-cyan-500 hover:bg-cyan-400'} text-white` 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}>
                    {plan.btn}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <LogoIcon size={32} />
                  <span className="font-bold text-lg">Polyva</span>
                </div>
                <p className={`${currentTheme.textMuted} text-sm`}>
                  The easiest and fastest AI 3D model generator.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Products</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link to="/generate" className="hover:text-white">Text to 3D</Link></li>
                  <li><Link to="/generate" className="hover:text-white">Image to 3D</Link></li>
                  <li><Link to="/showcase" className="hover:text-white">Showcase</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Resources</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link to="/blogs" className="hover:text-white">Blogs</Link></li>
                  <li><Link to="/docs" className="hover:text-white">Documentation</Link></li>
                  <li><Link to="/tutorials" className="hover:text-white">Tutorials</Link></li>
                  <li><Link to="/help" className="hover:text-white">Help Center</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Contact</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>support@polyva.example</li>
                  <li>Ho Chi Minh City, Vietnam</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500">© {new Date().getFullYear()} Polyva. All rights reserved.</p>
              <div className="flex gap-6 text-sm text-gray-400">
                <a href="#" className="hover:text-white">Privacy Policy</a>
                <a href="#" className="hover:text-white">Terms of Service</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

// Helper Components
function NavDropdown({ title, children, theme, currentTheme }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} flex items-center gap-1.5 transition-colors`}>
        {title}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <div className={`
        absolute left-0 mt-2 w-72 bg-gray-900/95 backdrop-blur-xl rounded-xl border ${currentTheme.border} shadow-2xl overflow-hidden
        transition-all duration-200 transform
        ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}
      `}>
        {children}
      </div>
    </div>
  );
}

function DropdownItem({ icon: Icon, title, subtitle, theme, currentTheme }) {
  return (
    <div className={`flex items-center gap-3 p-3 hover:bg-white/5 transition-colors`}>
      <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${currentTheme.accentColor}`} />
      </div>
      <div>
        <div className={`text-sm font-medium ${currentTheme.text}`}>{title}</div>
        <div className={`text-xs ${currentTheme.textMuted}`}>{subtitle}</div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, theme = 'dark' }) {
  return (
    <div className={`h-full p-6 bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/10 ${theme === 'dark' ? 'group-hover:border-lime-500/30' : 'group-hover:border-cyan-500/30'} transition-all`}>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className={`text-lg font-semibold mb-2 text-white ${theme === 'dark' ? 'group-hover:text-lime-400' : 'group-hover:text-cyan-400'} transition-colors`}>{title}</h3>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  );
}
