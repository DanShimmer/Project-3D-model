import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { 
  Type, 
  Image, 
  Upload, 
  Sparkles, 
  Loader2,
  Box,
  Zap,
  Star,
  Check,
  X,
  Home,
  Folder,
  Share2,
  RefreshCw,
  Download,
  ChevronDown,
  Settings,
  Layers,
  Palette,
  Film,
  Grid3X3,
  Eye,
  Heart,
  MessageCircle,
  RotateCcw,
  Sun,
  Moon
} from "lucide-react";
import ModelViewer from "./Components/ModelViewer";
import { LogoIcon } from "./Components/Logo";
import { genTextTo3D, genImageTo3D, checkAIHealth } from "./api/generate";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";

// Generation mode tabs
const MODES = [
  { 
    id: "text-to-3d", 
    label: "Text to 3D", 
    icon: Type,
    description: "Describe your 3D model"
  },
  { 
    id: "image-to-3d", 
    label: "Image to 3D", 
    icon: Image,
    description: "Upload an image to convert"
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
    description: "High quality, more details",
    time: "~60 seconds",
    backend: "quality"
  }
];

// Prompt suggestions
const PROMPT_SUGGESTIONS = [
  "A cute robot with rounded edges",
  "A medieval-style sword",
  "A modern sports car",
  "A cartoon cat sitting",
  "A futuristic helmet with visor",
  "A low-poly tree for games"
];

// Sidebar tools (Phase 2 features)
const SIDEBAR_TOOLS = [
  { id: "generate", icon: Sparkles, label: "Generate", active: true },
  { id: "layers", icon: Layers, label: "Layers", disabled: true },
  { id: "texture", icon: Palette, label: "Texture", disabled: true },
  { id: "animate", icon: Film, label: "Animation", disabled: true },
  { id: "share", icon: Share2, label: "Share", active: true }
];

export default function GeneratePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { theme, toggleTheme, currentTheme } = useTheme();
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
  const [generatedModels, setGeneratedModels] = useState([]); // Array of 4 models
  const [selectedGeneratedModel, setSelectedGeneratedModel] = useState(null);
  const [error, setError] = useState(null);
  const [aiHealthy, setAiHealthy] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [shareDescription, setShareDescription] = useState("");
  const [activeSidebarTool, setActiveSidebarTool] = useState("generate");
  const [editingModel, setEditingModel] = useState(null);
  
  // Load model from navigation state (for editing from My Storage)
  useEffect(() => {
    const state = location.state;
    if (state?.editModel) {
      const model = state.editModel;
      setEditingModel(model);
      
      // Set mode based on model type
      if (state.mode) {
        setActiveMode(state.mode);
      }
      
      // Pre-fill prompt if text-to-3d
      if (model.prompt) {
        setPrompt(model.prompt);
      }
      
      // Load the existing model into the viewer
      if (model.modelUrl) {
        setGeneratedModels([{
          id: model._id,
          modelUrl: model.modelUrl,
          thumbnailUrl: model.thumbnailUrl,
          name: model.name,
          isExisting: true
        }]);
        setSelectedGeneratedModel(0);
      }
      
      // Clear the state so it doesn't reload on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate("/");
  };
  
  // Check authentication
  useEffect(() => {
    // Wait for auth loading to complete before checking
    if (!loading && !isAuthenticated) {
      navigate("/login", { state: { from: "/generate" } });
    }
  }, [isAuthenticated, loading, navigate]);
  
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
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.1
      });
    }
    
    const animate = () => {
      // Always use dark background for both themes
      const bgColor = "rgba(10, 10, 10, 0.1)";
      ctx.fillStyle = bgColor;
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
        ctx.fillStyle = `${currentTheme.particleColor}${p.opacity})`;
        ctx.fill();
      });
      
      animationId = requestAnimationFrame(animate);
    };
    animate();
    
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [theme, currentTheme]);
  
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
      setError("Invalid file. Please upload PNG, JPG, or WEBP.");
      return;
    }
    
    if (file.size > 20 * 1024 * 1024) {
      setError("File too large. Maximum size is 20MB.");
      return;
    }
    
    setUploadedFile(file);
    setUploadedImage(URL.createObjectURL(file));
    setError(null);
    setGeneratedModels([]);
    setSelectedGeneratedModel(null);
  };
  
  // Simulate generating 4 model variants
  const generateModelVariants = (baseModel) => {
    // In real implementation, this would call the API to generate 4 variants
    // For now, we simulate 4 slightly different models
    return [
      { ...baseModel, id: `${baseModel._id}-1`, variant: 1, selected: false },
      { ...baseModel, id: `${baseModel._id}-2`, variant: 2, selected: false },
      { ...baseModel, id: `${baseModel._id}-3`, variant: 3, selected: false },
      { ...baseModel, id: `${baseModel._id}-4`, variant: 4, selected: false }
    ];
  };
  
  // Handle generation
  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);
    setProgress(0);
    setGeneratedModels([]);
    setSelectedGeneratedModel(null);
    
    const aiModel = AI_MODELS.find(m => m.id === selectedModel);
    const qualityMode = aiModel?.backend || "fast";
    
    try {
      if (activeMode === "text-to-3d") {
        if (!prompt.trim()) {
          throw new Error("Please enter a description for your 3D model");
        }
        
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
        
        // Generate 4 variants
        const variants = generateModelVariants(result.model);
        setGeneratedModels(variants);
        setSelectedGeneratedModel(variants[0]);
        
      } else {
        if (!uploadedFile) {
          throw new Error("Please upload an image");
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
        
        // Generate 4 variants
        const variants = generateModelVariants(result.model);
        setGeneratedModels(variants);
        setSelectedGeneratedModel(variants[0]);
      }
      
    } catch (err) {
      setError(err.message || "An error occurred during generation");
      setProgress(0);
      setGenerationStep("");
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle retry - regenerate models
  const handleRetry = () => {
    handleGenerate();
  };
  
  // Handle share
  const handleShare = () => {
    if (!selectedGeneratedModel) return;
    setShareTitle(selectedGeneratedModel.name || prompt || "Untitled Model");
    setShareDescription(selectedGeneratedModel.prompt || prompt || "");
    setShowShareModal(true);
  };
  
  // Submit share to showcase
  const submitShare = async () => {
    if (!selectedGeneratedModel) return;
    
    try {
      // Get existing shared models from localStorage (simulating a database)
      const existingShared = JSON.parse(localStorage.getItem("pv_showcase_models") || "[]");
      
      const sharedModel = {
        id: Date.now(),
        title: shareTitle,
        description: shareDescription,
        modelUrl: selectedGeneratedModel.modelUrl,
        imageUrl: selectedGeneratedModel.imageUrl || uploadedImage,
        author: user?.name || user?.email || "Anonymous",
        authorId: user?._id,
        likes: 0,
        comments: [],
        createdAt: new Date().toISOString()
      };
      
      existingShared.unshift(sharedModel);
      localStorage.setItem("pv_showcase_models", JSON.stringify(existingShared));
      
      setShowShareModal(false);
      alert("Model has been shared to Showcase!");
    } catch (err) {
      alert("An error occurred while sharing");
    }
  };
  
  // Clear all
  const handleClear = () => {
    setPrompt("");
    setUploadedImage(null);
    setUploadedFile(null);
    setGeneratedModels([]);
    setSelectedGeneratedModel(null);
    setError(null);
    setProgress(0);
    setGenerationStep("");
  };
  
  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden transition-colors duration-500`}>
      {/* Background canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />
      
      {/* Header */}
      <header className={`backdrop-blur-xl fixed top-0 w-full z-40 ${currentTheme.navBg} border-b ${currentTheme.border} transition-colors duration-500`}>
        <div className="max-w-full mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2">
                <LogoIcon size={32} />
                <span className={`font-bold text-lg ${currentTheme.text} hidden sm:block`}>Polyva</span>
              </Link>

              {/* Mode tabs - Desktop */}
              <div className={`hidden md:flex items-center gap-1 ${currentTheme.cardBg} rounded-full p-1`}>
                {MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setActiveMode(mode.id);
                      setGeneratedModels([]);
                      setSelectedGeneratedModel(null);
                      setError(null);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeMode === mode.id
                        ? `${currentTheme.accentBg} text-white`
                        : `${currentTheme.textSecondary} hover:${currentTheme.text}`
                    }`}
                  >
                    <mode.icon size={16} />
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className={`p-2 rounded-full ${currentTheme.buttonSecondary} border ${currentTheme.border} transition-all duration-300`}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun className={`w-4 h-4 ${currentTheme.accentColor}`} />
                ) : (
                  <Moon className={`w-4 h-4 ${currentTheme.accentColor}`} />
                )}
              </motion.button>

              {/* AI Status */}
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                aiHealthy === null ? `${theme === 'dark' ? 'bg-gray-800' : 'bg-slate-200'} ${currentTheme.textSecondary}` :
                aiHealthy ? `${theme === 'dark' ? 'bg-lime-900/50' : 'bg-cyan-100'} ${currentTheme.accentColor}` : "bg-red-900/50 text-red-400"
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  aiHealthy === null ? "bg-gray-500" :
                  aiHealthy ? `${theme === 'dark' ? 'bg-lime-500' : 'bg-cyan-500'} animate-pulse` : "bg-red-500"
                }`} />
                {aiHealthy === null ? "Checking..." : aiHealthy ? "AI Ready" : "AI Offline"}
              </div>

              {/* My Storage - Hidden for admin users */}
              {user && !user.isAdmin && (
                <Link 
                  to="/my-storage" 
                  className={`flex items-center gap-2 px-3 py-2 text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}
                >
                  <Folder className="w-4 h-4" />
                  <span className="hidden sm:inline">My Storage</span>
                </Link>
              )}

              {/* User Menu */}
              {user && (
                <div className="relative group">
                  <button className={`flex items-center gap-2 p-1.5 rounded-full ${currentTheme.buttonSecondary} transition-colors`}>
                    <div className={`w-7 h-7 bg-gradient-to-br ${currentTheme.accentGradient} rounded-full flex items-center justify-center text-white text-xs font-semibold`}>
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                  </button>

                  <div className={`opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-200 absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-xl border ${currentTheme.border} rounded-xl shadow-2xl overflow-hidden`}>
                    <div className={`px-4 py-3 border-b ${currentTheme.border}`}>
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                    <div className="py-2">
                      {/* My Storage link - Hidden for admin */}
                      {!user.isAdmin && (
                        <Link to="/my-storage" className={`flex items-center gap-3 px-4 py-2 text-sm ${currentTheme.textSecondary} hover:bg-white/5`}>
                          <Folder className="w-4 h-4" />
                          My Storage
                        </Link>
                      )}
                      <Link to="/" className={`flex items-center gap-3 px-4 py-2 text-sm ${currentTheme.textSecondary} hover:bg-white/5`}>
                        <Home className="w-4 h-4" />
                        Home
                      </Link>
                      <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-white/5`}>
                        <X className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Layout */}
      <div className="flex h-screen pt-14">
        {/* Left Sidebar - Tools */}
        <aside className={`w-16 ${currentTheme.navBg} backdrop-blur-xl border-r ${currentTheme.border} flex flex-col items-center py-4 gap-2 transition-colors duration-500`}>
          {SIDEBAR_TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => {
                if (tool.id === "share" && selectedGeneratedModel) {
                  handleShare();
                } else if (!tool.disabled) {
                  setActiveSidebarTool(tool.id);
                }
              }}
              disabled={tool.disabled}
              className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                tool.disabled 
                  ? "opacity-30 cursor-not-allowed"
                  : activeSidebarTool === tool.id || (tool.id === "share" && selectedGeneratedModel)
                    ? `${theme === 'dark' ? 'bg-lime-500/20 border-lime-500/30' : 'bg-cyan-500/20 border-cyan-500/30'} ${currentTheme.accentColor} border`
                    : `${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'} ${currentTheme.textSecondary} hover:${currentTheme.text}`
              }`}
              title={tool.label}
            >
              <tool.icon className="w-5 h-5" />
              <span className="text-[9px]">{tool.label}</span>
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex overflow-hidden">
          {/* Left Panel - Input */}
          <div className={`w-96 border-r ${currentTheme.border} flex flex-col bg-black/20 backdrop-blur-sm overflow-y-auto transition-colors duration-500`}>
            {/* Mobile Mode Tabs */}
            <div className={`md:hidden p-4 border-b ${currentTheme.border}`}>
              <div className={`flex gap-2 ${currentTheme.cardBg} rounded-xl p-1`}>
                {MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setActiveMode(mode.id);
                      setGeneratedModels([]);
                      setSelectedGeneratedModel(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeMode === mode.id
                        ? `${currentTheme.accentBg} text-white`
                        : currentTheme.textSecondary
                    }`}
                  >
                    <mode.icon size={16} />
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Model Selector */}
            <div className={`p-4 border-b ${currentTheme.border}`}>
              <label className={`text-xs font-medium ${currentTheme.textMuted} uppercase mb-3 block`}>AI Model</label>
              <div className="grid grid-cols-2 gap-2">
                {AI_MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`p-3 rounded-xl border transition-all text-left ${
                      selectedModel === model.id
                        ? `${theme === 'dark' ? 'border-lime-500 bg-lime-500/10' : 'border-cyan-500 bg-cyan-500/10'}`
                        : `${currentTheme.border} ${theme === 'dark' ? 'hover:border-white/20' : 'hover:border-black/20'} ${currentTheme.cardBg}`
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <model.icon size={14} className={selectedModel === model.id ? currentTheme.accentColor : currentTheme.textSecondary} />
                      <span className={`text-sm font-medium ${selectedModel === model.id ? currentTheme.text : currentTheme.textSecondary}`}>
                        {model.label}
                      </span>
                    </div>
                    <p className={`text-xs ${currentTheme.textMuted}`}>{model.time}</p>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Input Area */}
            <div className="flex-1 p-4">
              <AnimatePresence mode="wait">
                {activeMode === "text-to-3d" ? (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full flex flex-col"
                  >
                    <label className={`text-xs font-medium ${currentTheme.textMuted} uppercase mb-2 block`}>Description</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the 3D model you want to create..."
                      className={`flex-1 min-h-[120px] ${currentTheme.cardBg} rounded-xl p-4 resize-none ${currentTheme.text} ${theme === 'dark' ? 'placeholder-gray-600' : 'placeholder-gray-400'} border ${currentTheme.border} ${theme === 'dark' ? 'focus:border-lime-500 focus:ring-lime-500' : 'focus:border-cyan-500 focus:ring-cyan-500'} focus:ring-1 transition-colors text-sm`}
                      maxLength={500}
                    />
                    <div className={`flex justify-between items-center mt-2 text-xs ${currentTheme.textMuted}`}>
                      <span>{prompt.length}/500</span>
                    </div>
                    
                    {/* Suggestions */}
                    <div className="mt-4">
                      <label className={`text-xs font-medium ${currentTheme.textMuted} uppercase mb-2 block`}>Quick Suggestions</label>
                      <div className="flex flex-wrap gap-2">
                        {PROMPT_SUGGESTIONS.slice(0, 4).map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => setPrompt(suggestion)}
                            className={`px-3 py-1.5 text-xs rounded-full ${currentTheme.cardBg} border ${currentTheme.border} ${theme === 'dark' ? 'hover:border-lime-500/50 hover:bg-lime-500/10' : 'hover:border-cyan-500/50 hover:bg-cyan-500/10'} ${currentTheme.textSecondary} hover:${currentTheme.text} transition-all`}
                          >
                            {suggestion.slice(0, 25)}...
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
                    className="h-full flex flex-col"
                  >
                    <label className={`text-xs font-medium ${currentTheme.textMuted} uppercase mb-2 block`}>Image</label>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      className={`flex-1 min-h-[200px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${
                        uploadedImage
                          ? `${theme === 'dark' ? 'border-lime-500/50 bg-lime-500/5' : 'border-cyan-500/50 bg-cyan-500/5'}`
                          : `${currentTheme.border} ${theme === 'dark' ? 'hover:border-lime-500/30' : 'hover:border-cyan-500/30'}`
                      }`}
                    >
                      {uploadedImage ? (
                        <div className="relative p-4">
                          <img
                            src={uploadedImage}
                            alt="Uploaded"
                            className="max-h-48 rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setUploadedImage(null);
                              setUploadedFile(null);
                            }}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                          <div className={`mt-3 flex items-center gap-2 justify-center ${currentTheme.accentColor}`}>
                            <Check size={14} />
                            <span className="text-xs">Ready to convert</span>
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
                            className="flex flex-col items-center gap-3 cursor-pointer p-6"
                          >
                            <div className={`p-4 rounded-full ${currentTheme.cardBg} border ${currentTheme.border}`}>
                              <Upload size={24} className={currentTheme.accentColor} />
                            </div>
                            <div className="text-center">
                              <p className={`${currentTheme.textSecondary} text-sm mb-1`}>Drag & drop image</p>
                              <p className={`text-xs ${currentTheme.textMuted}`}>or click to select</p>
                            </div>
                            <p className={`text-xs ${currentTheme.textMuted}`}>
                              PNG, JPG, WEBP • Max 20MB
                            </p>
                          </label>
                        </>
                      )}
                    </div>
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
                  className="mx-4 mb-4 bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-400 text-xs"
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
                  className={`mx-4 mb-4 ${currentTheme.cardBg} rounded-lg p-3 border ${currentTheme.border}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs ${currentTheme.textSecondary}`}>{generationStep}</span>
                    <span className={`text-xs ${currentTheme.accentColor}`}>{Math.round(progress)}%</span>
                  </div>
                  <div className={`h-1.5 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                    <motion.div
                      className={`h-full bg-gradient-to-r ${currentTheme.accentGradient}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Action buttons */}
            <div className={`p-4 border-t ${currentTheme.border} flex gap-2`}>
              <button
                onClick={handleClear}
                disabled={isGenerating}
                className={`px-4 py-3 rounded-xl border ${currentTheme.border} ${currentTheme.textSecondary} hover:${currentTheme.text} ${theme === 'dark' ? 'hover:border-white/20' : 'hover:border-black/20'} transition-all disabled:opacity-50`}
              >
                <X size={18} />
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !aiHealthy || (activeMode === "text-to-3d" ? !prompt.trim() : !uploadedFile)}
                className={`flex-1 py-3 px-4 rounded-xl bg-gradient-to-r ${currentTheme.accentGradient} text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all ${theme === 'dark' ? 'shadow-lg shadow-lime-500/20' : 'shadow-lg shadow-cyan-500/20'}`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Generate 3D Model</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Right Panel - Preview & Results */}
          <div className={`flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden transition-colors duration-500`}>
            {/* Model Preview Header */}
            <div className={`p-4 border-b ${currentTheme.border} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <Box className={currentTheme.accentColor} size={20} />
                <h2 className="font-semibold">3D Preview</h2>
                {selectedGeneratedModel && (
                  <span className={`text-xs ${currentTheme.accentColor} ${theme === 'dark' ? 'bg-lime-900/30' : 'bg-cyan-100'} px-2 py-1 rounded`}>
                    Variant {selectedGeneratedModel.variant}
                  </span>
                )}
              </div>
              
              {/* Action buttons when model is generated */}
              {generatedModels.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRetry}
                    disabled={isGenerating}
                    className={`flex items-center gap-2 px-4 py-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-all disabled:opacity-50`}
                  >
                    <RotateCcw size={16} />
                    Retry
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={!selectedGeneratedModel}
                    className={`flex items-center gap-2 px-4 py-2 ${currentTheme.accentBg} rounded-lg text-sm text-white font-medium ${theme === 'dark' ? 'hover:bg-lime-400' : 'hover:bg-cyan-400'} transition-all disabled:opacity-50`}
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                </div>
              )}
            </div>
            
            {/* Main Preview Area */}
            <div className="flex-1 relative">
              {generatedModels.length > 0 ? (
                // 4-grid model view
                <div className="h-full grid grid-cols-2 gap-1 p-1">
                  {generatedModels.map((model, index) => (
                    <motion.div
                      key={model.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedGeneratedModel(model)}
                      className={`relative ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-white/70'} rounded-xl overflow-hidden cursor-pointer transition-all ${
                        selectedGeneratedModel?.id === model.id
                          ? `ring-2 ${theme === 'dark' ? 'ring-lime-500' : 'ring-cyan-500'}`
                          : `hover:ring-1 ${theme === 'dark' ? 'hover:ring-white/20' : 'hover:ring-black/10'}`
                      }`}
                    >
                      <ModelViewer
                        modelUrl={model.modelUrl}
                        className="w-full h-full min-h-[200px]"
                        showControls={false}
                        autoRotate={true}
                      />
                      
                      {/* Variant label */}
                      <div className="absolute top-3 left-3">
                        <span className={`px-2 py-1 ${theme === 'dark' ? 'bg-black/50' : 'bg-white/80'} backdrop-blur-sm rounded-lg text-xs ${currentTheme.text}`}>
                          Variant {model.variant}
                        </span>
                      </div>
                      
                      {/* Selected indicator */}
                      {selectedGeneratedModel?.id === model.id && (
                        <div className="absolute top-3 right-3">
                          <div className={`w-6 h-6 ${currentTheme.accentBg} rounded-full flex items-center justify-center`}>
                            <Check size={14} className="text-white" />
                          </div>
                        </div>
                      )}
                      
                      {/* Hover overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-black/60' : 'from-white/80'} via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-4`}>
                        <div className="flex gap-2">
                          <button className={`p-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'} backdrop-blur-sm rounded-lg ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/20'} transition-colors`}>
                            <Eye size={16} />
                          </button>
                          <button className={`p-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'} backdrop-blur-sm rounded-lg ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/20'} transition-colors`}>
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                // Empty state
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md p-8">
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-full ${currentTheme.cardBg} flex items-center justify-center`}>
                      <Box size={32} className={currentTheme.textMuted} />
                    </div>
                    <h3 className={`text-xl font-semibold mb-2 ${currentTheme.textSecondary}`}>No model yet</h3>
                    <p className={`${currentTheme.textMuted} text-sm mb-6`}>
                      {activeMode === "text-to-3d" 
                        ? "Enter a description and click 'Generate 3D Model' to start"
                        : "Upload an image and click 'Generate 3D Model' to convert"
                      }
                    </p>
                    <div className={`flex items-center justify-center gap-4 text-xs ${currentTheme.textMuted}`}>
                      <span className="flex items-center gap-1">
                        <Grid3X3 size={14} />
                        4 variants
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 size={14} />
                        Shareable
                      </span>
                      <span className="flex items-center gap-1">
                        <Download size={14} />
                        Downloadable
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Model info footer */}
            {selectedGeneratedModel && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 border-t ${currentTheme.border} ${theme === 'dark' ? 'bg-black/40' : 'bg-white/60'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{selectedGeneratedModel.name || "Generated Model"}</h3>
                    <p className={`text-xs ${currentTheme.textMuted} mt-1`}>
                      {selectedGeneratedModel.prompt || prompt}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className={`p-2 ${currentTheme.cardBg} rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-colors`}>
                      <Download size={18} className={currentTheme.textSecondary} />
                    </button>
                    <button 
                      onClick={handleShare}
                      className={`p-2 ${theme === 'dark' ? 'bg-lime-500/20 hover:bg-lime-500/30' : 'bg-cyan-500/20 hover:bg-cyan-500/30'} rounded-lg transition-colors`}
                    >
                      <Share2 size={18} className={currentTheme.accentColor} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
      
      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/80' : 'bg-black/50'} backdrop-blur-sm z-50 flex items-center justify-center p-4`}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md bg-gray-900 border ${currentTheme.border} rounded-2xl p-6`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Share2 className={currentTheme.accentColor} size={20} />
                  Share to Showcase
                </h2>
                <button
                  onClick={() => setShowShareModal(false)}
                  className={`p-2 ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'} rounded-lg transition-colors`}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className={`text-sm ${currentTheme.textSecondary} mb-2 block`}>Title</label>
                  <input
                    type="text"
                    value={shareTitle}
                    onChange={(e) => setShareTitle(e.target.value)}
                    placeholder="Name your model..."
                    className={`w-full px-4 py-3 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.text} ${theme === 'dark' ? 'placeholder-gray-500' : 'placeholder-gray-400'} ${theme === 'dark' ? 'focus:border-lime-500 focus:ring-lime-500' : 'focus:border-cyan-500 focus:ring-cyan-500'} focus:ring-1 transition-colors`}
                  />
                </div>
                
                <div>
                  <label className={`text-sm ${currentTheme.textSecondary} mb-2 block`}>Description</label>
                  <textarea
                    value={shareDescription}
                    onChange={(e) => setShareDescription(e.target.value)}
                    placeholder="Describe your model..."
                    rows={3}
                    className={`w-full px-4 py-3 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.text} ${theme === 'dark' ? 'placeholder-gray-500' : 'placeholder-gray-400'} ${theme === 'dark' ? 'focus:border-lime-500 focus:ring-lime-500' : 'focus:border-cyan-500 focus:ring-cyan-500'} focus:ring-1 transition-colors resize-none`}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className={`flex-1 py-3 border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'} transition-colors`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitShare}
                    className={`flex-1 py-3 ${currentTheme.accentBg} rounded-xl text-white font-medium ${theme === 'dark' ? 'hover:bg-lime-400' : 'hover:bg-cyan-400'} transition-colors flex items-center justify-center gap-2`}
                  >
                    <Share2 size={18} />
                    Share
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
