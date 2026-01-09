import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { 
  Type, 
  Image, 
  Upload, 
  UploadCloud,
  Sparkles, 
  Loader2,
  Box,
  Zap,
  Star,
  Check,
  X,
  Home,
  Folder,
  Save,
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
  Moon,
  Link as LinkIcon,
  Copy,
  Camera,
  Trash2,
  Edit3,
  User,
  Play
} from "lucide-react";
import ModelViewer from "./Components/ModelViewer";
import { DemoModelPreview, DEMO_MODEL_TYPES } from "./Components/DemoModels";
import AvatarModal, { getAvatarById } from "./Components/AvatarModal";
import { LogoIcon } from "./Components/Logo";
import { genTextTo3D, genImageTo3D, checkAIHealth, updateModelType, updateModelVariant } from "./api/generate";
import { updateProfile } from "./api/auth";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
// Phase 2 Components
import { 
  RemeshModal, 
  DownloadMenu, 
  TexturingPanel, 
  RigPanel, 
  AnimationPanel 
} from "./Components/Phase2";
// Phase 2 API
import {
  checkPhase2Health,
  applyTexture,
  generatePBR,
  applyRig,
  getAnimations,
  applyAnimation,
  remeshModel,
  exportModel,
  downloadModelFile
} from "./api/phase2";

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

// Allowed 3D model file extensions
const ALLOWED_3D_EXTENSIONS = ['.glb', '.fbx', '.obj', '.usdz', '.stl', '.blend', '.3mf'];

// Sidebar tools (Phase 2 features)
const SIDEBAR_TOOLS = [
  { id: "generate", icon: Sparkles, label: "Generate", active: true },
  { id: "upload", icon: UploadCloud, label: "Upload", active: true },
  { id: "texture", icon: Palette, label: "Texture", active: true, requiresModel: true },
  { id: "rig", icon: User, label: "Rig", active: true, requiresModel: true },
  { id: "animate", icon: Film, label: "Animation", active: true, requiresRig: true },
  { id: "share", icon: Share2, label: "Share", active: true }
];

// Download format options
const DOWNLOAD_FORMATS = [
  { id: "fbx", label: "FBX", pro: false },
  { id: "obj", label: "OBJ", pro: false },
  { id: "glb", label: "GLB", pro: false, default: true },
  { id: "usdz", label: "USDZ", pro: false },
  { id: "stl", label: "STL", pro: false },
  { id: "blend", label: "BLEND", pro: true },
  { id: "3mf", label: "3MF", pro: false },
];

export default function GeneratePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading, logout, updateUser, getToken } = useAuth();
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
  const [shareMode, setShareMode] = useState("showcase"); // "showcase" | "link"
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeSidebarTool, setActiveSidebarTool] = useState("generate");
  const [editingModel, setEditingModel] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [uploaded3DModel, setUploaded3DModel] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);
  const modelUploadRef = useRef(null);
  
  // Phase 2 States
  const [focusedVariant, setFocusedVariant] = useState(null); // When double-click or selecting features
  const [currentTopology, setCurrentTopology] = useState("triangle"); // triangle | quad
  const [showRemeshModal, setShowRemeshModal] = useState(false);
  const [isRemeshing, setIsRemeshing] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadButtonRef = useRef(null);
  // Texturing states
  const [showTexturingPanel, setShowTexturingPanel] = useState(false);
  const [isTextured, setIsTextured] = useState(false);
  const [isTexturing, setIsTexturing] = useState(false);
  const [isPBREnabled, setIsPBREnabled] = useState(false);
  const [isWireframeEnabled, setIsWireframeEnabled] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [texturePrompt, setTexturePrompt] = useState("");
  const [textureStyle, setTextureStyle] = useState("realistic");
  // Rig states
  const [showRigPanel, setShowRigPanel] = useState(false);
  const [isRigConfigured, setIsRigConfigured] = useState(false);
  const [rigConfig, setRigConfig] = useState(null);
  const [isRigging, setIsRigging] = useState(false);
  // Animation states
  const [showAnimationPanel, setShowAnimationPanel] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState(null);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  // Phase 2 API status
  const [phase2Available, setPhase2Available] = useState(false);
  
  // Avatar functions
  const handleAvatarChange = async (newAvatar) => {
    const token = getToken();
    if (!token) return;
    const result = await updateProfile(token, { avatar: newAvatar });
    if (result.user) {
      updateUser({ ...user, avatar: newAvatar });
    }
  };

  const getUserAvatar = () => {
    if (user?.avatar) {
      return getAvatarById(user.avatar);
    }
    return null;
  };
  
  // Helper function to determine model type from prompt (same logic as MyStorage)
  const getModelTypeFromPrompt = (prompt) => {
    if (!prompt) return "robot";
    const p = prompt.toLowerCase();
    if (p.includes("sword") || p.includes("kiếm") || p.includes("blade")) return "sword";
    if (p.includes("cat") || p.includes("mèo") || p.includes("kitten")) return "cat";
    if (p.includes("car") || p.includes("xe") || p.includes("oto") || p.includes("vehicle")) return "car";
    if (p.includes("robot") || p.includes("bot") || p.includes("droid")) return "robot";
    return "robot";
  };

  // Load model from navigation state (for editing from My Storage)
  useEffect(() => {
    const state = location.state;
    if (state?.editModel) {
      const model = state.editModel;
      setEditingModel(model);
      
      
      if (state.mode) {
        setActiveMode(state.mode);
      } else if (model.type) {
        
        setActiveMode(model.type);
      }
      
      
      if (model.prompt) {
        setPrompt(model.prompt);
      }
      
      
      const modelType = model.modelType || getModelTypeFromPrompt(model.prompt || model.name);
      
      
      const savedVariant = model.variant || 1;
      
      
      if (model.modelUrl || model.prompt) {
        const loadedModel = {
          id: model._id,
          modelUrl: model.modelUrl,
          thumbnailUrl: model.thumbnailUrl,
          name: model.name,
          prompt: model.prompt,
          modelType: modelType,
          isDemo: true,
          isExisting: true,
          variant: savedVariant
        };
        setGeneratedModels([loadedModel]);
        setSelectedGeneratedModel(loadedModel);
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
  
  // Check Phase 2 API health
  useEffect(() => {
    const checkPhase2 = async () => {
      try {
        const result = await checkPhase2Health();
        setPhase2Available(result.status === "healthy");
        if (result.gpu_enabled) {
          console.log("Phase 2 GPU features enabled!");
        }
      } catch {
        setPhase2Available(false);
      }
    };
    checkPhase2();
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

  // Handle 3D model file upload
  const handle3DModelUpload = (file) => {
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const fileExtension = '.' + fileName.split('.').pop();
    
    if (!ALLOWED_3D_EXTENSIONS.includes(fileExtension)) {
      setError(`Invalid file type. Allowed formats: ${ALLOWED_3D_EXTENSIONS.join(', ')}`);
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit for 3D models
      setError("File too large. Maximum size is 100MB.");
      return;
    }
    
    setUploadingModel(true);
    setError(null);
    
    // Create object URL for the uploaded file
    const modelUrl = URL.createObjectURL(file);
    const modelName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    
    // Simulate upload delay
    setTimeout(() => {
      const uploadedModel = {
        id: `uploaded-${Date.now()}`,
        modelUrl: modelUrl,
        name: modelName,
        fileName: file.name,
        fileSize: file.size,
        fileType: fileExtension,
        modelType: "uploaded",
        isDemo: false,
        isUploaded: true,
        variant: 1,
        uploadedAt: new Date().toISOString()
      };
      
      setUploaded3DModel(uploadedModel);
      setGeneratedModels([uploadedModel]);
      setSelectedGeneratedModel(uploadedModel);
      setUploadingModel(false);
      setShowUploadModal(false);
      setActiveSidebarTool("generate");
    }, 1000);
  };

 
  const handleSaveToStorage = async () => {
    if (!selectedGeneratedModel) return;
    
    try {
      
      const existingModels = JSON.parse(localStorage.getItem("pv_my_models") || "[]");
      
      const savedModel = {
        id: Date.now(),
        name: selectedGeneratedModel.name || "Uploaded Model",
        modelUrl: selectedGeneratedModel.modelUrl,
        thumbnailUrl: null,
        author: user?.name || user?.email || "Anonymous",
        authorId: user?._id,
        isUploaded: selectedGeneratedModel.isUploaded || false,
        fileType: selectedGeneratedModel.fileType,
        createdAt: new Date().toISOString()
      };
      
      existingModels.unshift(savedModel);
      localStorage.setItem("pv_my_models", JSON.stringify(existingModels));
      
      alert("Model saved to My Storage!");
    } catch (err) {
      alert("An error occurred while saving");
    }
  };
  
 
  const generateModelVariants = (baseModel, isImageMode = false) => {
    let modelType = "robot"; 
    
    
    if (isImageMode && uploadedFile) {
      const fileName = uploadedFile.name.toLowerCase();
      
      if (fileName.includes("sword") || fileName.includes("blade")) modelType = "sword";
      else if (fileName.includes("cat") || fileName.includes("kitten")) modelType = "cat";
      else if (fileName.includes("car") || fileName.includes("vehicle")) modelType = "car";
      else if (fileName.includes("robot") || fileName.includes("bot")) modelType = "robot";
      else {
        
        const demoTypes = ["robot", "sword", "car", "cat"];
        modelType = demoTypes[Math.floor(Math.random() * demoTypes.length)];
      }
    } else {
      
      const promptLower = prompt.toLowerCase();
      
      for (const [key, type] of Object.entries(DEMO_MODEL_TYPES)) {
        if (promptLower.includes(type) || key.toLowerCase().includes(promptLower.split(" ")[0])) {
          modelType = type;
          break;
        }
      }
      
      
      if (promptLower.includes("sword") || promptLower.includes("kiếm") || promptLower.includes("blade")) modelType = "sword";
      else if (promptLower.includes("cat") || promptLower.includes("mèo") || promptLower.includes("kitten")) modelType = "cat";
      else if (promptLower.includes("car") || promptLower.includes("xe") || promptLower.includes("oto") || promptLower.includes("vehicle")) modelType = "car";
      else if (promptLower.includes("robot") || promptLower.includes("bot") || promptLower.includes("droid")) modelType = "robot";
    }
    
    
    const dbId = baseModel?._id;
    
    
    const variants = [
      { 
        ...baseModel, 
        id: `${baseModel?._id || Date.now()}-1`,
        dbId: dbId, 
        variant: 1, 
        selected: false,
        modelType: modelType,
        isDemo: true,
        name: `${prompt} - Variant 1`
      },
      { 
        ...baseModel, 
        id: `${baseModel?._id || Date.now()}-2`,
        dbId: dbId, // Original database ID
        variant: 2, 
        selected: false,
        modelType: modelType,
        isDemo: true,
        name: `${prompt} - Variant 2`
      },
      { 
        ...baseModel, 
        id: `${baseModel?._id || Date.now()}-3`,
        dbId: dbId, // Original database ID
        variant: 3, 
        selected: false,
        modelType: modelType,
        isDemo: true,
        name: `${prompt} - Variant 3`
      },
      { 
        ...baseModel, 
        id: `${baseModel?._id || Date.now()}-4`,
        dbId: dbId, // Original database ID
        variant: 4, 
        selected: false,
        modelType: modelType,
        isDemo: true,
        name: `${prompt} - Variant 4`
      }
    ];
    return variants;
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
        
        // Generate 4 variants (text mode = false)
        const variants = generateModelVariants(result.model, false);
        setGeneratedModels(variants);
        setSelectedGeneratedModel(variants[0]);
        
        // Update modelType and variant in database (default to variant 1)
        if (result.model?._id && variants[0]?.modelType) {
          await updateModelVariant(result.model._id, variants[0].modelType, 1);
        }
        
      } else {
        if (!uploadedFile) {
          throw new Error("Please upload an image");
        }
        
        setGenerationStep("Processing image...");
        setProgress(10)
        
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
        
        // Generate 4 variants - pass true for image mode
        const variants = generateModelVariants(result.model, true);
        setGeneratedModels(variants);
        setSelectedGeneratedModel(variants[0]);
        
        // Update modelType and variant in database (default to variant 1)
        if (result.model?._id && variants[0]?.modelType) {
          await updateModelVariant(result.model._id, variants[0].modelType, 1);
        }
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
  
  // Handle download selected model
  const handleDownloadSelected = () => {
    if (!selectedGeneratedModel) return;
    
    // For demo models, create a simple OBJ file
    const modelName = selectedGeneratedModel.name || `${prompt}-variant-${selectedGeneratedModel.variant}`;
    const safeFileName = modelName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    // Create a simple OBJ content (placeholder for demo)
    const objContent = `# 3D Model exported from Polyva
# Model: ${modelName}
# Generated: ${new Date().toISOString()}
# 
# This is a demo model. Actual AI-generated models will be exported as GLB/OBJ.
# 
# To open this file:
# - Blender: File > Import > Wavefront (.obj)
# - 3D Paint (Windows): Open in Paint 3D
# - Other 3D software: Import OBJ file

# Demo cube vertices
v -0.5 -0.5 0.5
v 0.5 -0.5 0.5
v -0.5 0.5 0.5
v 0.5 0.5 0.5
v -0.5 0.5 -0.5
v 0.5 0.5 -0.5
v -0.5 -0.5 -0.5
v 0.5 -0.5 -0.5

# Texture coordinates
vt 0 0
vt 1 0
vt 0 1
vt 1 1

# Normals
vn 0 0 1
vn 0 1 0
vn 0 0 -1
vn 0 -1 0
vn 1 0 0
vn -1 0 0

# Faces
f 1/1/1 2/2/1 4/4/1 3/3/1
f 3/1/2 4/2/2 6/4/2 5/3/2
f 5/4/3 6/3/3 8/1/3 7/2/3
f 7/1/4 8/2/4 2/4/4 1/3/4
f 2/1/5 8/2/5 6/4/5 4/3/5
f 7/1/6 1/2/6 3/4/6 5/3/6
`;
    
    // Create blob and download
    const blob = new Blob([objContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName}.obj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Handle share
  const handleShare = () => {
    if (!selectedGeneratedModel) return;
    setShareTitle(selectedGeneratedModel.name || prompt || "Untitled Model");
    setShareDescription(selectedGeneratedModel.prompt || prompt || "");
    // Generate share link
    const shareId = `model-${Date.now()}`;
    setShareLink(`${window.location.origin}/share/${shareId}`);
    setShareMode("showcase");
    setCopied(false);
    setShowShareModal(true);
  };

  // Copy link to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        createdAt: new Date().toISOString(),
        variant: selectedGeneratedModel.variant,
        color: selectedGeneratedModel.color,
        isDemo: selectedGeneratedModel.isDemo,
        tags: ["ai-generated"]
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
    // Reset Phase 2 states
    setFocusedVariant(null);
    setCurrentTopology("triangle");
    setIsTextured(false);
    setIsPBREnabled(false);
    setIsWireframeEnabled(false);
    setBrightness(100);
    setIsRigConfigured(false);
    setRigConfig(null);
    setCurrentAnimation(null);
    setIsAnimationPlaying(false);
    setShowTexturingPanel(false);
    setShowRigPanel(false);
    setShowAnimationPanel(false);
  };
  
  // Handle selecting a variant - update database with selected variant
  const handleSelectVariant = async (model) => {
    setSelectedGeneratedModel(model);
    
    // Update variant in database if we have a database ID
    const modelDbId = model.dbId || model._id;
    if (modelDbId && model.variant && model.modelType) {
      try {
        await updateModelVariant(modelDbId, model.modelType, model.variant);
        console.log(`Updated model ${modelDbId} with variant ${model.variant} and modelType ${model.modelType}`);
      } catch (err) {
        console.error("Error updating variant:", err);
      }
    }
  };

  // ============ PHASE 2 HANDLERS ============
  
  // Handle double-click on variant to focus
  const handleDoubleClickVariant = (model) => {
    setFocusedVariant(model);
    setSelectedGeneratedModel(model);
  };

  // Handle exit focus mode
  const handleExitFocusMode = () => {
    setFocusedVariant(null);
  };

  // Handle Remesh
  const handleRemesh = async (topology) => {
    if (!selectedGeneratedModel) return;
    
    setIsRemeshing(true);
    try {
      // Call Phase 2 API for remeshing
      const result = await remeshModel(selectedGeneratedModel, topology, {
        target_faces: topology === 'quad' ? 5000 : 10000
      });
      
      if (result.success) {
        setCurrentTopology(topology);
        setShowRemeshModal(false);
        // Update model if new remeshed model is returned
        if (result.remeshed_model_path) {
          console.log("Remeshed model:", result.remeshed_model_path);
        }
      } else {
        throw new Error(result.error || "Remeshing failed");
      }
    } catch (err) {
      setError("Error during remesh: " + err.message);
    } finally {
      setIsRemeshing(false);
    }
  };

  // Handle Download with format selection
  const handleDownloadWithFormat = async (format, modelName) => {
    if (!selectedGeneratedModel) return;
    
    const safeFileName = (modelName || selectedGeneratedModel.name || "model")
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    
    try {
      // Try to use Phase 2 API for export
      const exportResult = await exportModel(selectedGeneratedModel, format, {
        include_textures: isTextured,
        include_rig: isRigConfigured,
        include_animation: currentAnimation
      });
      
      if (exportResult.success && exportResult.download_url) {
        // Download from server
        await downloadModelFile(exportResult.download_url, `${safeFileName}.${format}`);
        setShowDownloadMenu(false);
        return;
      }
    } catch (err) {
      console.warn("Export API not available, using demo mode:", err.message);
    }
    
    // Fallback to demo mode
    let content = "";
    let mimeType = "text/plain";
    let extension = format;
    
    if (format === "obj") {
      content = `# 3D Model exported from Polyva
# Model: ${modelName}
# Topology: ${currentTopology}
# Generated: ${new Date().toISOString()}
# 
# Demo cube vertices
v -0.5 -0.5 0.5
v 0.5 -0.5 0.5
v -0.5 0.5 0.5
v 0.5 0.5 0.5
v -0.5 0.5 -0.5
v 0.5 0.5 -0.5
v -0.5 -0.5 -0.5
v 0.5 -0.5 -0.5
# Faces
f 1 2 4 3
f 3 4 6 5
f 5 6 8 7
f 7 8 2 1
f 2 8 6 4
f 7 1 3 5
`;
    } else {
      content = `# Polyva 3D Model
# Format: ${format.toUpperCase()}
# Model: ${modelName}
# Topology: ${currentTopology}
# Generated: ${new Date().toISOString()}
# 
# This is a demo file. Real export will contain actual 3D data.
`;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  // Handle Texturing
  const handleApplyTexture = async () => {
    if (!selectedGeneratedModel) return;
    
    setIsTexturing(true);
    try {
      // Focus on selected variant
      setFocusedVariant(selectedGeneratedModel);
      
      // Call Phase 2 API for texturing
      const result = await applyTexture(selectedGeneratedModel, texturePrompt, {
        style: textureStyle,
        brightness: brightness
      });
      
      if (result.success) {
        setIsTextured(true);
        // Update model path if new textured model is returned
        if (result.textured_model_path) {
          console.log("Textured model:", result.textured_model_path);
        }
      } else {
        throw new Error(result.error || "Texturing failed");
      }
    } catch (err) {
      setError("Error during texturing: " + err.message);
    } finally {
      setIsTexturing(false);
    }
  };

  const handleRetexture = async () => {
    setIsTextured(false);
    setIsPBREnabled(false);
    setBrightness(100);
    await handleApplyTexture();
  };

  const handleTogglePBR = async () => {
    if (!isPBREnabled && selectedGeneratedModel) {
      // Generate PBR maps when enabling
      try {
        const result = await generatePBR(selectedGeneratedModel);
        if (result.success) {
          console.log("PBR maps generated:", result.maps);
        }
      } catch (err) {
        console.warn("PBR generation in demo mode");
      }
    }
    setIsPBREnabled(!isPBREnabled);
  };

  const handleToggleWireframe = () => {
    setIsWireframeEnabled(!isWireframeEnabled);
  };

  const handleBrightnessChange = (value) => {
    setBrightness(value);
  };

  // Handle Rig configuration
  const handleConfirmRig = async (config) => {
    if (!selectedGeneratedModel) return;
    
    setIsRigging(true);
    try {
      // Focus on selected variant
      setFocusedVariant(selectedGeneratedModel);
      
      // Call Phase 2 API for rigging
      const result = await applyRig(selectedGeneratedModel, config.type, {
        markers: config.markers
      });
      
      if (result.success) {
        setRigConfig(config);
        setIsRigConfigured(true);
        setShowRigPanel(false);
        // Update model path if new rigged model is returned
        if (result.rigged_model_path) {
          console.log("Rigged model:", result.rigged_model_path);
        }
      } else {
        throw new Error(result.error || "Rigging failed");
      }
    } catch (err) {
      setError("Error during rigging: " + err.message);
    } finally {
      setIsRigging(false);
    }
  };

  // Handle Animation
  const handleSelectAnimation = async (animation) => {
    setCurrentAnimation(animation.id);
    
    // Apply animation via API if model is rigged
    if (isRigConfigured && selectedGeneratedModel) {
      try {
        const result = await applyAnimation(selectedGeneratedModel, animation.id, {
          loop: true,
          speed: 1.0
        });
        
        if (result.success) {
          console.log("Animation applied:", result.animation_data);
        }
      } catch (err) {
        console.warn("Animation in demo mode");
      }
    }
  };

  const handlePlayAnimation = (animationId) => {
    setIsAnimationPlaying(true);
    // In real implementation, this would trigger animation playback
  };

  const handleStopAnimation = () => {
    setIsAnimationPlaying(false);
  };

  // Handle sidebar tool selection
  const handleSidebarToolClick = (tool) => {
    if (tool.id === "share" && selectedGeneratedModel) {
      handleShare();
    } else if (tool.id === "upload") {
      setShowUploadModal(true);
    } else if (tool.id === "texture" && selectedGeneratedModel) {
      setFocusedVariant(selectedGeneratedModel);
      setShowTexturingPanel(true);
      setShowAnimationPanel(false);
      setShowRigPanel(false);
    } else if (tool.id === "rig" && selectedGeneratedModel) {
      setShowRigPanel(true);
      setShowTexturingPanel(false);
      setShowAnimationPanel(false);
    } else if (tool.id === "animate" && isRigConfigured) {
      setShowAnimationPanel(true);
      setShowTexturingPanel(false);
      setShowRigPanel(false);
    } else if (!tool.disabled && !tool.requiresModel && !tool.requiresRig) {
      setActiveSidebarTool(tool.id);
    }
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
                    {/* Avatar - fixed gradient, not affected by theme */}
                    {getUserAvatar() ? (
                      <div className={`w-7 h-7 bg-gradient-to-br ${getUserAvatar().gradient} rounded-full flex items-center justify-center text-sm`}>
                        {getUserAvatar().emoji}
                      </div>
                    ) : (
                      <div className={`w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-semibold`}>
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                    )}
                  </button>

                  <div className={`opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-200 absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-xl border ${currentTheme.border} rounded-xl shadow-2xl overflow-hidden`}>
                    <div className={`px-4 py-3 border-b ${currentTheme.border}`}>
                      <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    </div>
                    <div className="py-2">
                      {/* Change Avatar */}
                      <button 
                        onClick={() => setShowAvatarModal(true)} 
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white`}
                      >
                        <Camera className="w-4 h-4" />
                        Change Avatar
                      </button>
                      {/* My Storage link - Hidden for admin */}
                      {!user.isAdmin && (
                        <Link to="/my-storage" className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white`}>
                          <Folder className="w-4 h-4" />
                          My Storage
                        </Link>
                      )}
                      <Link to="/" className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white`}>
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

      {/* Avatar Modal */}
      {user && (
        <AvatarModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          currentAvatar={user.avatar}
          onSave={handleAvatarChange}
          userName={user.name || user.email}
        />
      )}
      
      {/* Main Layout */}
      <div className="flex h-screen pt-14">
        {/* Left Sidebar - Tools */}
        <aside className={`w-16 ${currentTheme.navBg} backdrop-blur-xl border-r ${currentTheme.border} flex flex-col items-center py-4 gap-2 transition-colors duration-500`}>
          {SIDEBAR_TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleSidebarToolClick(tool)}
              disabled={
                (tool.requiresModel && !selectedGeneratedModel) || 
                (tool.requiresRig && !isRigConfigured)
              }
              className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                (tool.requiresModel && !selectedGeneratedModel) || (tool.requiresRig && !isRigConfigured)
                  ? "opacity-30 cursor-not-allowed"
                  : activeSidebarTool === tool.id || 
                    (tool.id === "share" && selectedGeneratedModel) || 
                    (tool.id === "upload" && showUploadModal) ||
                    (tool.id === "texture" && showTexturingPanel) ||
                    (tool.id === "rig" && showRigPanel) ||
                    (tool.id === "animate" && showAnimationPanel)
                    ? `${theme === 'dark' ? 'bg-lime-500/20 border-lime-500/30' : 'bg-cyan-500/20 border-cyan-500/30'} ${currentTheme.accentColor} border`
                    : `${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'} ${currentTheme.textSecondary} hover:${currentTheme.text}`
              }`}
              title={tool.requiresModel && !selectedGeneratedModel 
                ? `${tool.label} (Generate a model first)` 
                : tool.requiresRig && !isRigConfigured 
                ? `${tool.label} (Configure rig first)` 
                : tool.label}
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
                  <>
                    <span className={`text-xs ${currentTheme.accentColor} ${theme === 'dark' ? 'bg-lime-900/30' : 'bg-cyan-100'} px-2 py-1 rounded`}>
                      Variant {selectedGeneratedModel.variant}
                    </span>
                    <span className={`text-xs ${currentTheme.textMuted} ${currentTheme.cardBg} px-2 py-1 rounded`}>
                      {currentTopology === "quad" ? "Quad" : "Triangle"}
                    </span>
                    {isTextured && (
                      <span className={`text-xs text-purple-400 ${theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'} px-2 py-1 rounded`}>
                        Textured
                      </span>
                    )}
                    {isRigConfigured && (
                      <span className={`text-xs text-amber-400 ${theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'} px-2 py-1 rounded`}>
                        Rigged
                      </span>
                    )}
                  </>
                )}
              </div>
              
              {/* Action buttons when model is generated - using icons only */}
              {generatedModels.length > 0 && !focusedVariant && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSaveToStorage}
                    disabled={!selectedGeneratedModel}
                    title="Save to Storage"
                    className={`p-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg ${currentTheme.textSecondary} hover:${currentTheme.text} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-all disabled:opacity-50`}
                  >
                    <Save size={18} />
                  </button>
                  {/* Download with dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                      disabled={!selectedGeneratedModel}
                      title="Download"
                      className={`p-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg ${currentTheme.textSecondary} hover:${currentTheme.text} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-all disabled:opacity-50 flex items-center gap-1`}
                    >
                      <Download size={18} />
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  {/* Remesh */}
                  <button
                    onClick={() => setShowRemeshModal(true)}
                    disabled={!selectedGeneratedModel || selectedGeneratedModel?.isUploaded}
                    title="Remesh"
                    className={`p-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg ${currentTheme.textSecondary} hover:${currentTheme.text} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-all disabled:opacity-50`}
                  >
                    <Grid3X3 size={18} />
                  </button>
                  <button
                    onClick={handleRetry}
                    disabled={isGenerating || selectedGeneratedModel?.isUploaded}
                    title="Retry with AI"
                    className={`p-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg ${currentTheme.textSecondary} hover:${currentTheme.text} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-all disabled:opacity-50`}
                  >
                    <RotateCcw size={18} className={isGenerating ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={!selectedGeneratedModel}
                    title="Share"
                    className={`p-2 ${currentTheme.accentBg} rounded-lg text-white ${theme === 'dark' ? 'hover:bg-lime-400' : 'hover:bg-cyan-400'} transition-all disabled:opacity-50`}
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              )}
            </div>
            
            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col relative overflow-y-auto">
              {generatedModels.length > 0 ? (
                <>
                  {/* Show either focused view or 4-grid view */}
                  {focusedVariant ? (
                    /* Focused single variant view */
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-1 relative"
                    >
                      {/* Exit focus button */}
                      <button
                        onClick={handleExitFocusMode}
                        className={`absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg ${currentTheme.textSecondary} hover:${currentTheme.text} transition-all`}
                      >
                        <X size={16} />
                        <span className="text-sm">Back to all variants</span>
                      </button>
                      
                      {/* Variant info */}
                      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                        <span className={`px-3 py-1.5 ${theme === 'dark' ? 'bg-lime-900/30' : 'bg-cyan-100'} rounded-lg text-sm ${currentTheme.accentColor}`}>
                          Variant {focusedVariant.variant}
                        </span>
                        <span className={`px-3 py-1.5 ${currentTheme.cardBg} rounded-lg text-sm ${currentTheme.textSecondary}`}>
                          {currentTopology === "quad" ? "Quad" : "Triangle"} Mesh
                        </span>
                        {isTextured && (
                          <span className={`px-3 py-1.5 ${theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'} rounded-lg text-sm text-purple-400`}>
                            Textured
                          </span>
                        )}
                        {isRigConfigured && (
                          <span className={`px-3 py-1.5 ${theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'} rounded-lg text-sm text-amber-400`}>
                            Rigged
                          </span>
                        )}
                      </div>
                      
                      {/* Large model preview */}
                      <DemoModelPreview
                        modelType={focusedVariant.modelType || "robot"}
                        variant={focusedVariant.variant || 1}
                        className="w-full h-full min-h-[400px]"
                        autoRotate={!isAnimationPlaying}
                        wireframe={isWireframeEnabled}
                        brightness={brightness}
                      />
                      
                      {/* Focused variant controls */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
                        {/* Download with format selection */}
                        <div className="relative" ref={downloadButtonRef}>
                          <button
                            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                            className={`p-3 ${currentTheme.accentBg} rounded-xl text-white ${
                              theme === 'dark' ? 'hover:bg-lime-400' : 'hover:bg-cyan-400'
                            } transition-all shadow-lg flex items-center gap-2`}
                            title="Download"
                          >
                            <Download size={20} />
                            <ChevronDown size={16} />
                          </button>
                          {showDownloadMenu && (
                            <DownloadMenu
                              isOpen={showDownloadMenu}
                              onClose={() => setShowDownloadMenu(false)}
                              onDownload={handleDownloadWithFormat}
                              theme={theme}
                              modelName={focusedVariant.name || prompt}
                            />
                          )}
                        </div>
                        
                        {/* Remesh button */}
                        <button
                          onClick={() => setShowRemeshModal(true)}
                          className={`p-3 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} hover:${currentTheme.text} transition-all flex items-center gap-2`}
                          title="Remesh"
                        >
                          <Grid3X3 size={20} />
                          <span className="text-sm">Remesh</span>
                        </button>
                        
                        {/* Retry */}
                        <button
                          onClick={handleRetry}
                          disabled={isGenerating}
                          className={`p-3 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} hover:${currentTheme.text} transition-all disabled:opacity-50`}
                          title="Retry"
                        >
                          <RefreshCw size={20} className={isGenerating ? "animate-spin" : ""} />
                        </button>
                        
                        {/* Save */}
                        <button
                          onClick={handleSaveToStorage}
                          className={`p-3 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} hover:${currentTheme.text} transition-all`}
                          title="Save to Storage"
                        >
                          <Save size={20} />
                        </button>
                        
                        {/* Share */}
                        <button
                          onClick={handleShare}
                          className={`p-3 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} hover:${currentTheme.text} transition-all`}
                          title="Share"
                        >
                          <Share2 size={20} />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    /* 4-grid model view */
                    <div className="grid grid-cols-2 gap-1 p-1 min-h-0">
                      {generatedModels.map((model, index) => (
                        <motion.div
                          key={model.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleSelectVariant(model)}
                          onDoubleClick={() => handleDoubleClickVariant(model)}
                          className={`relative ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-white/70'} rounded-xl overflow-hidden cursor-pointer transition-all ${
                            selectedGeneratedModel?.id === model.id
                              ? `ring-2 ${theme === 'dark' ? 'ring-lime-500' : 'ring-cyan-500'}`
                              : `hover:ring-1 ${theme === 'dark' ? 'hover:ring-white/20' : 'hover:ring-black/10'}`
                          }`}
                        >
                          {/* Demo 3D Model Viewer */}
                          <DemoModelPreview
                            modelType={model.modelType || "robot"}
                            variant={model.variant || 1}
                            className="w-full h-full min-h-[180px]"
                            autoRotate={true}
                          />
                        
                        {/* Variant label */}
                        <div className="absolute top-3 left-3">
                          <span className={`px-2 py-1 ${theme === 'dark' ? 'bg-black/50' : 'bg-white/80'} backdrop-blur-sm rounded-lg text-xs ${currentTheme.text}`}>
                            Variant {model.variant}
                          </span>
                        </div>
                        
                        {/* Topology indicator */}
                        <div className="absolute top-3 right-12">
                          <span className={`px-2 py-1 ${theme === 'dark' ? 'bg-black/50' : 'bg-white/80'} backdrop-blur-sm rounded-lg text-[10px] ${currentTheme.textMuted}`}>
                            {currentTopology === "quad" ? "Quad" : "Tri"}
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
                        
                        {/* Hover overlay with actions */}
                        <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-black/60' : 'from-white/80'} via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-4`}>
                          <div className="flex gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectVariant(model);
                                setShowTexturingPanel(true);
                                setFocusedVariant(model);
                              }}
                              className={`p-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'} backdrop-blur-sm rounded-lg ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/20'} transition-colors`}
                              title="Texturing"
                            >
                              <Palette size={16} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectVariant(model);
                                setShowRigPanel(true);
                              }}
                              className={`p-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'} backdrop-blur-sm rounded-lg ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/20'} transition-colors`}
                              title="Rig"
                            >
                              <User size={16} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowRemeshModal(true);
                                handleSelectVariant(model);
                              }}
                              className={`p-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'} backdrop-blur-sm rounded-lg ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/20'} transition-colors`}
                              title="Remesh"
                            >
                              <Grid3X3 size={16} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDoubleClickVariant(model);
                              }}
                              className={`p-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'} backdrop-blur-sm rounded-lg ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/20'} transition-colors`}
                              title="View Full"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  )}
                
                {/* Action buttons below 4 variants - only show when not in focused mode */}
                {!focusedVariant && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`flex justify-center py-4 mb-4`}
                >
                  <div className={`flex items-center gap-2 px-4 py-2.5 ${theme === 'dark' ? 'bg-black/80' : 'bg-white/90'} backdrop-blur-xl rounded-2xl border ${currentTheme.border} shadow-2xl`}>
                    {/* Save to Storage */}
                    <button
                      onClick={handleSaveToStorage}
                      disabled={!selectedGeneratedModel}
                      title="Save to Storage"
                      className={`p-2.5 rounded-xl transition-all ${
                        selectedGeneratedModel
                          ? `${currentTheme.cardBg} border ${currentTheme.border} ${currentTheme.textSecondary} hover:${currentTheme.text} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`
                          : `${currentTheme.cardBg} ${currentTheme.textMuted} cursor-not-allowed`
                      }`}
                    >
                      <Save size={20} />
                    </button>
                    
                    {/* Download */}
                    <button
                      onClick={handleDownloadSelected}
                      disabled={!selectedGeneratedModel}
                      title="Download Model"
                      className={`p-2.5 rounded-xl transition-all ${
                        selectedGeneratedModel
                          ? `${currentTheme.cardBg} border ${currentTheme.border} ${currentTheme.textSecondary} hover:${currentTheme.text} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`
                          : `${currentTheme.cardBg} ${currentTheme.textMuted} cursor-not-allowed`
                      }`}
                    >
                      <Save size={20} />
                    </button>
                    
                    {/* Download with format menu */}
                    <div className="relative">
                      <button
                        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                        disabled={!selectedGeneratedModel}
                        title="Download Model"
                        className={`p-2.5 rounded-xl transition-all flex items-center gap-1 ${
                          selectedGeneratedModel
                            ? `${currentTheme.accentBg} text-white ${theme === 'dark' ? 'hover:bg-lime-400' : 'hover:bg-cyan-400'} shadow-lg ${theme === 'dark' ? 'shadow-lime-500/30' : 'shadow-cyan-500/30'}`
                            : `${currentTheme.cardBg} ${currentTheme.textMuted} cursor-not-allowed`
                        }`}
                      >
                        <Download size={20} />
                        <ChevronDown size={14} />
                      </button>
                      {showDownloadMenu && (
                        <DownloadMenu
                          isOpen={showDownloadMenu}
                          onClose={() => setShowDownloadMenu(false)}
                          onDownload={handleDownloadWithFormat}
                          theme={theme}
                          modelName={selectedGeneratedModel?.name || prompt}
                        />
                      )}
                    </div>
                    
                    <div className={`w-px h-8 ${currentTheme.border}`} />
                    
                    {/* Remesh - NEW */}
                    <button
                      onClick={() => setShowRemeshModal(true)}
                      disabled={!selectedGeneratedModel || selectedGeneratedModel?.isUploaded}
                      title="Remesh (Change Topology)"
                      className={`p-2.5 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} hover:${currentTheme.text} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-all disabled:opacity-50`}
                    >
                      <Grid3X3 size={20} />
                    </button>
                    
                    {/* Retry with AI - disabled for uploaded models */}
                    <button
                      onClick={handleRetry}
                      disabled={isGenerating || selectedGeneratedModel?.isUploaded}
                      title={selectedGeneratedModel?.isUploaded ? "Cannot retry uploaded models" : "Retry with AI"}
                      className={`p-2.5 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} hover:${currentTheme.text} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-all disabled:opacity-50`}
                    >
                      <RefreshCw size={20} className={isGenerating ? "animate-spin" : ""} />
                    </button>
                    
                    {/* Share */}
                    <button
                      onClick={handleShare}
                      disabled={!selectedGeneratedModel}
                      title="Share Model"
                      className={`p-2.5 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} hover:${currentTheme.text} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-all disabled:opacity-50`}
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                </motion.div>
                )}
                </>
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
                    <h3 className="font-medium text-sm">
                      {selectedGeneratedModel.name || "Generated Model"}
                      {selectedGeneratedModel.isUploaded && (
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                          Uploaded
                        </span>
                      )}
                    </h3>
                    <p className={`text-xs ${currentTheme.textMuted} mt-1`}>
                      {selectedGeneratedModel.isUploaded 
                        ? `${selectedGeneratedModel.fileType?.toUpperCase()} • ${(selectedGeneratedModel.fileSize / 1024 / 1024).toFixed(2)} MB`
                        : (selectedGeneratedModel.prompt || prompt)
                      }
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={handleSaveToStorage}
                      title="Save to Storage"
                      className={`p-2 ${currentTheme.cardBg} rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-colors`}
                    >
                      <Save size={18} className={currentTheme.textSecondary} />
                    </button>
                    <button 
                      onClick={handleDownloadSelected}
                      title="Download"
                      className={`p-2 ${currentTheme.cardBg} rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-colors`}
                    >
                      <Download size={18} className={currentTheme.textSecondary} />
                    </button>
                    <button 
                      onClick={handleShare}
                      title="Share"
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
                  Share Model
                </h2>
                <button
                  onClick={() => setShowShareModal(false)}
                  className={`p-2 ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'} rounded-lg transition-colors`}
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Share mode tabs */}
              <div className={`flex gap-2 mb-6 ${currentTheme.cardBg} rounded-xl p-1`}>
                <button
                  onClick={() => setShareMode("showcase")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    shareMode === "showcase"
                      ? `${currentTheme.accentBg} text-white`
                      : currentTheme.textSecondary
                  }`}
                >
                  <Sparkles size={16} />
                  Share to Showcase
                </button>
                <button
                  onClick={() => setShareMode("link")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    shareMode === "link"
                      ? `${currentTheme.accentBg} text-white`
                      : currentTheme.textSecondary
                  }`}
                >
                  <LinkIcon size={16} />
                  Copy Link
                </button>
              </div>
              
              {shareMode === "showcase" ? (
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
                  
                  <p className={`text-xs ${currentTheme.textMuted}`}>
                    Your model will be visible to everyone on the Showcase page
                  </p>
                  
                  <div className="flex gap-3 pt-2">
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
                      Share to Showcase
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className={`${currentTheme.textSecondary} text-sm`}>
                    Copy the link below to share your model with others
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className={`flex-1 px-4 py-3 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.text} text-sm`}
                    />
                    <button
                      onClick={copyToClipboard}
                      className={`px-4 py-3 rounded-xl transition-colors flex items-center gap-2 ${
                        copied
                          ? "bg-green-500 text-white"
                          : `${currentTheme.accentBg} text-white ${theme === 'dark' ? 'hover:bg-lime-400' : 'hover:bg-cyan-400'}`
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check size={18} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Download size={18} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowShareModal(false)}
                      className={`flex-1 py-3 border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'} transition-colors`}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload 3D Model Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/80' : 'bg-black/50'} backdrop-blur-sm z-50 flex items-center justify-center p-4`}
            onClick={() => !uploadingModel && setShowUploadModal(false)}
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
                  <UploadCloud className={currentTheme.accentColor} size={20} />
                  Upload 3D Model
                </h2>
                <button
                  onClick={() => !uploadingModel && setShowUploadModal(false)}
                  disabled={uploadingModel}
                  className={`p-2 ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'} rounded-lg transition-colors disabled:opacity-50`}
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={modelUploadRef}
                type="file"
                accept=".glb,.fbx,.obj,.usdz,.stl,.blend,.3mf"
                onChange={(e) => handle3DModelUpload(e.target.files[0])}
                className="hidden"
                id="model3DUpload"
              />
              
              {/* Upload area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add(theme === 'dark' ? 'border-lime-500' : 'border-cyan-500');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove(theme === 'dark' ? 'border-lime-500' : 'border-cyan-500');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove(theme === 'dark' ? 'border-lime-500' : 'border-cyan-500');
                  const files = Array.from(e.dataTransfer.files);
                  if (files.length > 0) {
                    handle3DModelUpload(files[0]);
                  }
                }}
                onClick={() => modelUploadRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${currentTheme.border} ${theme === 'dark' ? 'hover:border-lime-500/50 hover:bg-lime-500/5' : 'hover:border-cyan-500/50 hover:bg-cyan-500/5'}`}
              >
                {uploadingModel ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className={`w-12 h-12 ${currentTheme.accentColor} animate-spin`} />
                    <p className={`${currentTheme.textSecondary} text-sm`}>Processing model...</p>
                  </div>
                ) : (
                  <>
                    <div className={`p-4 rounded-full ${currentTheme.cardBg} border ${currentTheme.border}`}>
                      <UploadCloud size={32} className={currentTheme.accentColor} />
                    </div>
                    <div className="text-center">
                      <p className={`${currentTheme.textSecondary} text-sm mb-1`}>
                        Drag & drop your 3D model
                      </p>
                      <p className={`text-xs ${currentTheme.textMuted}`}>
                        or click to select file
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {/* Supported formats */}
              <div className="mt-4">
                <p className={`text-xs ${currentTheme.textMuted} mb-2`}>Supported formats:</p>
                <div className="flex flex-wrap gap-2">
                  {ALLOWED_3D_EXTENSIONS.map((ext) => (
                    <span
                      key={ext}
                      className={`px-2 py-1 text-xs rounded ${currentTheme.cardBg} border ${currentTheme.border} ${currentTheme.textSecondary}`}
                    >
                      {ext}
                    </span>
                  ))}
                </div>
                <p className={`text-xs ${currentTheme.textMuted} mt-2`}>Maximum file size: 100MB</p>
              </div>
              
              {/* Error message in modal */}
              {error && (
                <div className="mt-4 bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-400 text-xs">
                  {error}
                </div>
              )}
              
              {/* Cancel button */}
              <div className="flex gap-3 pt-4 mt-4 border-t border-white/10">
                <button
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploadingModel}
                  className={`flex-1 py-3 border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'} transition-colors disabled:opacity-50`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ PHASE 2 MODALS & PANELS ============ */}
      
      {/* Remesh Modal */}
      <RemeshModal
        isOpen={showRemeshModal}
        onClose={() => setShowRemeshModal(false)}
        onRemesh={handleRemesh}
        currentTopology={currentTopology}
        isProcessing={isRemeshing}
        theme={theme}
      />

      {/* Texturing Panel */}
      <AnimatePresence>
        {showTexturingPanel && (
          <TexturingPanel
            isOpen={showTexturingPanel}
            onClose={() => {
              setShowTexturingPanel(false);
              if (!isTextured) {
                setFocusedVariant(null);
              }
            }}
            onApplyTexture={handleApplyTexture}
            onTogglePBR={handleTogglePBR}
            onToggleWireframe={handleToggleWireframe}
            onBrightnessChange={handleBrightnessChange}
            onRetexture={handleRetexture}
            onDownload={() => handleDownloadWithFormat("glb", selectedGeneratedModel?.name || prompt)}
            isPBREnabled={isPBREnabled}
            isWireframeEnabled={isWireframeEnabled}
            brightness={brightness}
            isProcessing={isTexturing}
            isTextured={isTextured}
            currentTopology={currentTopology}
            theme={theme}
            texturePrompt={texturePrompt}
            setTexturePrompt={setTexturePrompt}
            textureStyle={textureStyle}
            setTextureStyle={setTextureStyle}
            gpuEnabled={phase2Available}
          />
        )}
      </AnimatePresence>

      {/* Rig Panel */}
      <RigPanel
        isOpen={showRigPanel}
        onClose={() => setShowRigPanel(false)}
        onConfirmRig={handleConfirmRig}
        isProcessing={isRigging}
        theme={theme}
      />

      {/* Animation Panel */}
      <AnimatePresence>
        {showAnimationPanel && (
          <AnimationPanel
            isOpen={showAnimationPanel}
            onClose={() => setShowAnimationPanel(false)}
            onSelectAnimation={handleSelectAnimation}
            onPlayAnimation={handlePlayAnimation}
            onStopAnimation={handleStopAnimation}
            currentAnimation={currentAnimation}
            isPlaying={isAnimationPlaying}
            isRigConfigured={isRigConfigured}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
