import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { 
  Type, 
  Image, 
  Upload, 
  Sparkles, 
  Loader2,
  ArrowLeft,
  Box,
  Wand2,
  Zap,
  Star,
  Check,
  X,
  Home,
  Folder
} from "lucide-react";
import ModelViewer from "./Components/ModelViewer";
import { genTextTo3D, genImageTo3D, checkAIHealth } from "./api/generate";
import { useAuth } from "./contexts/AuthContext";

// Generation mode tabs
const MODES = [
  { 
    id: "text-to-3d", 
    label: "Text to 3D", 
    icon: Type,
    description: "Describe your 3D model in text"
  },
  { 
    id: "image-to-3d", 
    label: "Image to 3D", 
    icon: Image,
    description: "Upload an image to convert to 3D"
  }
];

// Quality modes - AI Models
const AI_MODELS = [
  { 
    id: "polyva-1.5", 
    label: "Polyva 1.5", 
    icon: Zap,
    description: "Fast generation, good quality",
    time: "~30 seconds",
    backend: "fast"
  },
  { 
    id: "polyva-xl", 
    label: "Polyva XL", 
    icon: Star,
    description: "Premium quality, more details",
    time: "~60 seconds",
    backend: "quality"
  }
];

// Prompt suggestions
const PROMPT_SUGGESTIONS = [
  "A cute robot character with rounded edges",
  "A medieval fantasy sword with ornate handle",
  "A modern sports car, sleek design",
  "A cartoon cat sitting, simple style",
  "A futuristic helmet with visor",
  "A low-poly tree for game environment"
];

export default function GeneratePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const canvasRef = useRef(null);
  
  // State
  const [activeMode, setActiveMode] = useState("text-to-3d");
  const [selectedModel, setSelectedModel] = useState("polyva-1.5");
  const [prompt, setPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [generatedModel, setGeneratedModel] = useState(null);
  const [error, setError] = useState(null);
  const [aiHealthy, setAiHealthy] = useState(null);
  const [recentModels, setRecentModels] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate("/");
  };
  
  // Load recent models from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("pv_recent_models");
    if (stored) {
      try {
        setRecentModels(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recent models:", e);
      }
    }
  }, []);
  
  // Save to recent models when a new model is generated
  const saveToRecentModels = (model) => {
    const newRecent = [model, ...recentModels.slice(0, 5)]; // Keep last 6 models
    setRecentModels(newRecent);
    localStorage.setItem("pv_recent_models", JSON.stringify(newRecent));
  };
  
  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/generate" } });
    }
  }, [isAuthenticated, navigate]);
  
  // Check AI Service health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const result = await checkAIHealth();
        setAiHealthy(result.ok && result.aiService?.status === "healthy");
      } catch {
        setAiHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Canvas background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    let animationId;
    let particles = [];
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    
    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
    
    const animate = () => {
      ctx.fillStyle = "rgba(4, 6, 10, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 197, 94, ${p.opacity})`;
        ctx.fill();
      });
      
      animationId = requestAnimationFrame(animate);
    };
    animate();
    
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);
  
  // Handle file select
  const handleFileSelect = (file) => {
    if (!file) return;
    
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload PNG, JPG, or WEBP image.");
      return;
    }
    
    if (file.size > 20 * 1024 * 1024) {
      setError("File too large. Maximum size is 20MB.");
      return;
    }
    
    setUploadedFile(file);
    setUploadedImage(URL.createObjectURL(file));
    setError(null);
    setGeneratedModel(null);
  };
  
  // Handle generation
  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);
    setProgress(0);
    setGeneratedModel(null);
    
    // Get the backend quality mode from selected AI model
    const aiModel = AI_MODELS.find(m => m.id === selectedModel);
    const qualityMode = aiModel?.backend || "fast";
    
    try {
      if (activeMode === "text-to-3d") {
        if (!prompt.trim()) {
          throw new Error("Please enter a description for your 3D model");
        }
        
        // Simulate progress
        setGenerationStep("Generating image from text...");
        setProgress(10);
        
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev < 90) return prev + Math.random() * 10;
            return prev;
          });
        }, 2000);
        
        const result = await genTextTo3D(prompt, qualityMode);
        clearInterval(progressInterval);
        
        if (!result.ok) {
          throw new Error(result.msg || "Generation failed");
        }
        
        setProgress(100);
        setGenerationStep("Complete!");
        setGeneratedModel(result.model);
        
        // Save to recent models
        saveToRecentModels({
          ...result.model,
          thumbnail: result.model.imageUrl || result.model.modelUrl,
          aiModel: selectedModel,
          mode: activeMode
        });
        
      } else {
        // Image to 3D
        if (!uploadedFile) {
          throw new Error("Please upload an image first");
        }
        
        setGenerationStep("Processing image...");
        setProgress(10);
        
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev < 90) return prev + Math.random() * 15;
            return prev;
          });
        }, 1500);
        
        const result = await genImageTo3D(uploadedFile);
        clearInterval(progressInterval);
        
        if (!result.ok) {
          throw new Error(result.msg || "Generation failed");
        }
        
        setProgress(100);
        setGenerationStep("Complete!");
        setGeneratedModel(result.model);
        
        // Save to recent models
        saveToRecentModels({
          ...result.model,
          thumbnail: uploadedImage || result.model.modelUrl,
          aiModel: selectedModel,
          mode: activeMode
        });
      }
      
    } catch (err) {
      setError(err.message || "An error occurred during generation");
      setProgress(0);
      setGenerationStep("");
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Clear all
  const handleClear = () => {
    setPrompt("");
    setUploadedImage(null);
    setUploadedFile(null);
    setGeneratedModel(null);
    setError(null);
    setProgress(0);
    setGenerationStep("");
  };
  
  return (
    <div className="min-h-screen bg-[#04060A] text-white relative overflow-hidden">
      {/* Background canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />
      
      {/* Full Header Bar */}
      <header className="backdrop-blur-sm fixed top-0 w-full z-40 bg-gray-900/80 border-b border-gray-800/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-800/30 rounded-lg flex items-center justify-center"> 
                  <span className="text-sm font-semibold text-gray-300">PV</span>
                </div>
                <span className="font-semibold text-xl tracking-wide">Polyva</span>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-2">
                <NavDropdown title="Feature">
                  <button onClick={() => setActiveMode("text-to-3d")} className="block w-full text-left">
                    <DropdownItem title="Text to 3D" subtitle="Generate models from descriptions" />
                  </button>
                  <button onClick={() => setActiveMode("image-to-3d")} className="block w-full text-left">
                    <DropdownItem title="Image to 3D" subtitle="Convert 2D into 3D meshes" />
                  </button>
                </NavDropdown>

                <NavDropdown title="Community">
                  <Link to="/showcase" className="block"><DropdownIconItem title="Showcase" /></Link>
                </NavDropdown>

                <NavDropdown title="Resources">
                  <div className="w-full grid grid-cols-2 gap-4 p-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Downloads</h4>
                      <ul className="space-y-2 text-sm text-gray-400">
                        <li className="hover:text-white cursor-pointer">Blender</li>
                        <li className="hover:text-white cursor-pointer">Unity</li>
                        <li className="hover:text-white cursor-pointer">Unreal</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Learn</h4>
                      <ul className="space-y-2 text-sm">
                        <li><Link to="/blogs" className="text-gray-400 hover:text-white">Blogs</Link></li>
                        <li><Link to="/docs" className="text-gray-400 hover:text-white">Documentation</Link></li>
                        <li><Link to="/tutorials" className="text-gray-400 hover:text-white">Tutorials</Link></li>
                        <li><Link to="/help" className="text-gray-400 hover:text-white">Help Center</Link></li>
                      </ul>
                    </div>
                  </div>
                </NavDropdown>
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* AI Status indicator */}
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                aiHealthy === null ? "bg-gray-700 text-gray-400" :
                aiHealthy ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  aiHealthy === null ? "bg-gray-500" :
                  aiHealthy ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`} />
                {aiHealthy === null ? "Checking..." : aiHealthy ? "AI Ready" : "AI Offline"}
              </div>

              {/* My Storage Button */}
              <Link 
                to="/my-storage" 
                className="px-3 py-2 rounded-md text-sm hover:bg-white/5 text-white/90 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="hidden sm:inline">My Storage</span>
              </Link>

              {/* User Menu */}
              {user && (
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-200 hidden sm:block">{user.name || user.email.split('@')[0]}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  <div className="opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-200 absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700/50">
                      <p className="text-sm text-white font-medium truncate">{user.email}</p>
                      {user.isAdmin && (
                        <span className="text-xs text-purple-400">Admin</span>
                      )}
                    </div>
                    <div className="py-2">
                      <Link to="/my-storage" className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          My Storage
                        </span>
                      </Link>
                      {user.isAdmin && (
                        <Link to="/admin" className="block px-4 py-2 text-sm text-purple-400 hover:bg-white/5 hover:text-purple-300">
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Admin Dashboard
                          </span>
                        </Link>
                      )}
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile hamburger */}
              <button onClick={() => setMobileMenuOpen(v => !v)} className="lg:hidden p-2 rounded-md hover:bg-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-800/20 bg-gray-900/95">
            <div className="px-6 py-4 space-y-3">
              <div>
                <div className="font-semibold mb-2 text-white">Feature</div>
                <div className="space-y-2 text-white/90">
                  <button onClick={() => { setActiveMode("text-to-3d"); setMobileMenuOpen(false); }} className="block w-full text-left py-2 border-b border-gray-700/50 hover:text-white">Text to 3D</button>
                  <button onClick={() => { setActiveMode("image-to-3d"); setMobileMenuOpen(false); }} className="block w-full text-left py-2 border-b border-gray-700/50 hover:text-white">Image to 3D</button>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-2 text-white">Quick Links</div>
                <div className="space-y-2 text-white/90">
                  <Link to="/" className="block py-2 border-b border-gray-700/50 hover:text-white">Home</Link>
                  <Link to="/my-storage" className="block py-2 border-b border-gray-700/50 hover:text-white">My Storage</Link>
                  <Link to="/showcase" className="block py-2 border-b border-gray-700/50 hover:text-white">Showcase</Link>
                </div>
              </div>
              <div className="pt-2">
                <button onClick={handleLogout} className="w-full text-center py-2 border rounded-md text-red-400 border-red-400 hover:bg-red-500/10">Logout</button>
              </div>
            </div>
          </div>
        )}
      </header>
      
      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
          
          {/* Left panel - Controls */}
          <div className="flex flex-col gap-4">
            {/* Mode tabs */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-1 flex gap-1 border border-gray-800/30">
              {MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setActiveMode(mode.id);
                    setGeneratedModel(null);
                    setError(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                    activeMode === mode.id
                      ? "bg-gradient-to-r from-green-500 to-emerald-400 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  }`}
                >
                  <mode.icon size={18} />
                  <span className="font-medium">{mode.label}</span>
                </button>
              ))}
            </div>
            
            {/* Input area */}
            <div className="flex-1 bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800/30 flex flex-col">
              <AnimatePresence mode="wait">
                {activeMode === "text-to-3d" ? (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex-1 flex flex-col"
                  >
                    {/* AI Model selector */}
                    <div className="mb-4">
                      <label className="text-sm text-gray-400 mb-2 block">AI Model</label>
                      <div className="flex gap-2">
                        {AI_MODELS.map(model => (
                          <button
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`flex-1 p-3 rounded-lg border transition-all ${
                              selectedModel === model.id
                                ? "border-green-500 bg-green-500/10"
                                : "border-gray-700 hover:border-gray-600"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <model.icon size={16} className={selectedModel === model.id ? "text-green-400" : "text-gray-400"} />
                              <span className={selectedModel === model.id ? "text-white" : "text-gray-300"}>{model.label}</span>
                            </div>
                            <p className="text-xs text-gray-500">{model.time}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Prompt input */}
                    <label className="text-sm text-gray-400 mb-2 block">Describe your 3D model</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="A cute robot character with rounded edges, metallic texture..."
                      className="flex-1 bg-gray-800/50 rounded-lg p-4 resize-none text-white placeholder-gray-500 border border-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                      maxLength={500}
                    />
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                      <span>{prompt.length}/500 characters</span>
                    </div>
                    
                    {/* Suggestions */}
                    <div className="mt-4">
                      <label className="text-sm text-gray-400 mb-2 block">Quick suggestions</label>
                      <div className="flex flex-wrap gap-2">
                        {PROMPT_SUGGESTIONS.slice(0, 4).map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => setPrompt(suggestion)}
                            className="px-3 py-1.5 text-xs rounded-full bg-gray-800/50 border border-gray-700 hover:border-green-500/50 hover:bg-green-500/10 text-gray-400 hover:text-white transition-all"
                          >
                            {suggestion.slice(0, 30)}...
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="image"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex flex-col"
                  >
                    {/* AI Model selector for Image to 3D */}
                    <div className="mb-4">
                      <label className="text-sm text-gray-400 mb-2 block">AI Model</label>
                      <div className="flex gap-2">
                        {AI_MODELS.map(model => (
                          <button
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`flex-1 p-3 rounded-lg border transition-all ${
                              selectedModel === model.id
                                ? "border-green-500 bg-green-500/10"
                                : "border-gray-700 hover:border-gray-600"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <model.icon size={16} className={selectedModel === model.id ? "text-green-400" : "text-gray-400"} />
                              <span className={selectedModel === model.id ? "text-white" : "text-gray-300"}>{model.label}</span>
                            </div>
                            <p className="text-xs text-gray-500">{model.time}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Upload area */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer ${
                        uploadedImage
                          ? "border-green-500/50 bg-green-500/5"
                          : "border-gray-700 hover:border-green-500/50"
                      }`}
                    >
                      {uploadedImage ? (
                        <div className="relative">
                          <img
                            src={uploadedImage}
                            alt="Uploaded"
                            className="max-h-64 rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setUploadedImage(null);
                              setUploadedFile(null);
                            }}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X size={14} />
                          </button>
                          <div className="mt-2 flex items-center gap-2 justify-center text-green-400">
                            <Check size={16} />
                            <span className="text-sm">Image ready for conversion</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={(e) => handleFileSelect(e.target.files[0])}
                            className="hidden"
                            id="imageUpload"
                          />
                          <label
                            htmlFor="imageUpload"
                            className="flex flex-col items-center gap-4 cursor-pointer p-8"
                          >
                            <div className="p-4 rounded-full bg-gray-800/50 border border-gray-700">
                              <Upload size={32} className="text-green-500" />
                            </div>
                            <div className="text-center">
                              <p className="text-gray-300 mb-1">Drag & drop your image here</p>
                              <p className="text-sm text-gray-500">or click to browse</p>
                            </div>
                            <p className="text-xs text-gray-600">
                              PNG, JPG, WEBP • Max 20MB
                            </p>
                          </label>
                        </>
                      )}
                    </div>
                    
                    <p className="mt-4 text-sm text-gray-500 text-center">
                      Best results with: Single object, clean background, good lighting
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Progress bar */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 border border-gray-800/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">{generationStep}</span>
                    <span className="text-sm text-green-400">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                disabled={isGenerating}
                className="px-4 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-all disabled:opacity-50"
              >
                Clear
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !aiHealthy || (activeMode === "text-to-3d" ? !prompt.trim() : !uploadedFile)}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Generate 3D Model</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Right panel - 3D Preview */}
          <div className="flex flex-col gap-4">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800/30 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Box className="text-green-500" size={20} />
                3D Preview
              </h2>
              {generatedModel && (
                <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
                  Model ready
                </span>
              )}
            </div>
            
            <ModelViewer
              modelUrl={generatedModel?.modelUrl}
              className="flex-1 min-h-[300px]"
              showControls={true}
              autoRotate={false}
            />
            
            {/* Model info */}
            {generatedModel && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800/30"
              >
                <h3 className="font-medium mb-2">{generatedModel.name}</h3>
                <div className="flex gap-4 text-sm text-gray-400">
                  <span>Type: {generatedModel.type}</span>
                  <span>Created: {new Date(generatedModel.createdAt).toLocaleString()}</span>
                </div>
                {generatedModel.prompt && (
                  <p className="mt-2 text-sm text-gray-500 italic">
                    "{generatedModel.prompt}"
                  </p>
                )}
              </motion.div>
            )}
            
            {/* Recent Models Section */}
            {recentModels.length > 0 && (
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800/30">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {recentModels.slice(0, 6).map((model, index) => (
                    <motion.button
                      key={model._id || index}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setGeneratedModel(model)}
                      className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 hover:border-green-500/50 transition-all group"
                    >
                      {model.thumbnail ? (
                        <img 
                          src={model.thumbnail} 
                          alt={model.name || `Model ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <Box size={20} className="text-gray-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-xs text-white truncate">
                          {model.name || model.prompt?.slice(0, 15) || `Model ${index + 1}`}
                        </span>
                      </div>
                      {model.aiModel && (
                        <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 bg-black/50 rounded text-gray-300">
                          {model.aiModel === 'polyva-xl' ? 'XL' : '1.5'}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// NavDropdown component
function NavDropdown({ title, children }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button className="px-3 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-white/5 text-white/90">
        {title}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`
        absolute left-0 mt-2 w-72 bg-gray-900/95 backdrop-blur-md rounded-lg shadow-xl ring-1 ring-white/10 z-50
        transition-all duration-200 transform
        ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}
      `}>
        {children}
      </div>
    </div>
  );
}

// DropdownItem component
function DropdownItem({ title, subtitle }) {
  return (
    <div className="flex gap-3 p-3 items-center border-b border-gray-700/50 last:border-b-0 hover:bg-white/5">
      <div className="w-12 h-12 rounded-md bg-gray-800/50 flex items-center justify-center">
        <Box size={20} className="text-green-500" />
      </div>
      <div>
        <div className="font-medium text-sm text-white">{title}</div>
        <div className="text-xs text-gray-400">{subtitle}</div>
      </div>
    </div>
  );
}

// DropdownIconItem component
function DropdownIconItem({ title }) {
  return (
    <div className="flex gap-3 p-3 items-center border-b border-gray-700/50 last:border-b-0 hover:bg-white/5">
      <div className="w-8 h-8 rounded-md bg-gray-800/50 flex items-center justify-center">
        <Star size={16} className="text-green-500" />
      </div>
      <div className="text-sm text-white">{title}</div>
    </div>
  );
}
