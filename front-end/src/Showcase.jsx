import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { LogoIcon } from "./Components/Logo";
import { 
  Heart, 
  Share2, 
  Download, 
  MessageCircle, 
  Bookmark,
  Search,
  Filter,
  Grid3X3,
  LayoutGrid,
  Sparkles,
  Eye,
  Clock,
  TrendingUp,
  ChevronDown,
  Box,
  ArrowLeft,
  X,
  Send,
  Sun,
  Moon
} from "lucide-react";
import { useTheme } from "./contexts/ThemeContext";

// Sample models data (will be merged with shared models from localStorage)
const SAMPLE_MODELS = [
  {
    id: 1,
    title: "Sci-Fi Helmet",
    description: "A futuristic helmet with modern design created by AI.",
    image: "https://via.placeholder.com/400x400?text=Sci-Fi+Helmet",
    author: "user123",
    authorAvatar: null,
    likes: 128,
    comments: 24,
    views: 1520,
    createdAt: "2025-01-05",
    tags: ["sci-fi", "helmet", "futuristic"]
  },
  {
    id: 2,
    title: "Fantasy Sword",
    description: "A fantasy-style sword with glowing runes.",
    image: "https://via.placeholder.com/400x400?text=Fantasy+Sword",
    author: "artist_3d",
    authorAvatar: null,
    likes: 256,
    comments: 42,
    views: 3200,
    createdAt: "2025-01-04",
    tags: ["fantasy", "sword", "weapon"]
  },
  {
    id: 3,
    title: "Cute Robot",
    description: "An adorable robot with minimalist design.",
    image: "https://via.placeholder.com/400x400?text=Cute+Robot",
    author: "robotmaker",
    authorAvatar: null,
    likes: 89,
    comments: 15,
    views: 980,
    createdAt: "2025-01-03",
    tags: ["robot", "cute", "character"]
  },
  {
    id: 4,
    title: "Modern Chair",
    description: "Modern design chair for living spaces.",
    image: "https://via.placeholder.com/400x400?text=Modern+Chair",
    author: "furniture_ai",
    authorAvatar: null,
    likes: 67,
    comments: 8,
    views: 720,
    createdAt: "2025-01-02",
    tags: ["furniture", "chair", "modern"]
  },
  {
    id: 5,
    title: "Dragon Character",
    description: "Cartoon-style dragon character for games.",
    image: "https://via.placeholder.com/400x400?text=Dragon",
    author: "game_artist",
    authorAvatar: null,
    likes: 312,
    comments: 56,
    views: 4100,
    createdAt: "2025-01-01",
    tags: ["dragon", "character", "game"]
  },
  {
    id: 6,
    title: "Sports Car",
    description: "Sleek and modern sports car design.",
    image: "https://via.placeholder.com/400x400?text=Sports+Car",
    author: "car_design",
    authorAvatar: null,
    likes: 198,
    comments: 31,
    views: 2800,
    createdAt: "2024-12-31",
    tags: ["car", "vehicle", "sports"]
  }
];

// Filter categories
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "trending", label: "Trending" },
  { id: "newest", label: "Newest" },
  { id: "popular", label: "Popular" }
];

// Tags for filtering
const POPULAR_TAGS = ["character", "weapon", "vehicle", "furniture", "robot", "fantasy", "sci-fi", "game"];

export default function ShowcasePage() {
  const { theme, currentTheme, toggleTheme } = useTheme();
  const [models, setModels] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTags, setSelectedTags] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // grid or masonry
  const [selectedModel, setSelectedModel] = useState(null);
  const [likedModels, setLikedModels] = useState(new Set());
  const [savedModels, setSavedModels] = useState(new Set());
  const canvasRef = useRef(null);

  // Load models from localStorage and merge with sample data
  useEffect(() => {
    const sharedModels = JSON.parse(localStorage.getItem("pv_showcase_models") || "[]");
    
    // Convert shared models to match the format
    const formattedSharedModels = sharedModels.map(m => ({
      ...m,
      image: m.imageUrl || "https://via.placeholder.com/400x400?text=3D+Model",
      author: m.author || "anonymous",
      authorAvatar: null,
      likes: m.likes || 0,
      comments: m.comments?.length || 0,
      views: Math.floor(Math.random() * 500),
      tags: ["ai-generated"]
    }));
    
    // Merge with sample models
    setModels([...formattedSharedModels, ...SAMPLE_MODELS]);
    
    // Load liked and saved models from localStorage
    const liked = JSON.parse(localStorage.getItem("pv_liked_models") || "[]");
    const saved = JSON.parse(localStorage.getItem("pv_saved_models") || "[]");
    setLikedModels(new Set(liked));
    setSavedModels(new Set(saved));
  }, []);

  // Canvas background
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
    
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.3 + 0.1
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
        ctx.fillStyle = `${currentTheme.particleColor}${Math.round(p.opacity * 255).toString(16).padStart(2, '0')}`;
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

  // Filter models
  const filteredModels = models.filter(model => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        model.title?.toLowerCase().includes(query) ||
        model.description?.toLowerCase().includes(query) ||
        model.author?.toLowerCase().includes(query) ||
        model.tags?.some(tag => tag.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }
    
    // Tags filter
    if (selectedTags.length > 0) {
      const matchesTags = selectedTags.some(tag => model.tags?.includes(tag));
      if (!matchesTags) return false;
    }
    
    return true;
  });

  // Sort models based on category
  const sortedModels = [...filteredModels].sort((a, b) => {
    switch (selectedCategory) {
      case "trending":
        return (b.views || 0) - (a.views || 0);
      case "newest":
        return new Date(b.createdAt) - new Date(a.createdAt);
      case "popular":
        return (b.likes || 0) - (a.likes || 0);
      default:
        return 0;
    }
  });

  // Handle like
  const handleLike = (modelId) => {
    const newLiked = new Set(likedModels);
    if (newLiked.has(modelId)) {
      newLiked.delete(modelId);
    } else {
      newLiked.add(modelId);
    }
    setLikedModels(newLiked);
    localStorage.setItem("pv_liked_models", JSON.stringify([...newLiked]));
    
    // Update model likes count
    setModels(prev => prev.map(m => {
      if (m.id === modelId) {
        return {
          ...m,
          likes: likedModels.has(modelId) ? m.likes - 1 : m.likes + 1
        };
      }
      return m;
    }));
  };

  // Handle save
  const handleSave = (modelId) => {
    const newSaved = new Set(savedModels);
    if (newSaved.has(modelId)) {
      newSaved.delete(modelId);
    } else {
      newSaved.add(modelId);
    }
    setSavedModels(newSaved);
    localStorage.setItem("pv_saved_models", JSON.stringify([...newSaved]));
  };

  // Toggle tag filter
  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className={`min-h-screen ${currentTheme.background} ${currentTheme.text} relative transition-colors duration-500`}>
      {/* Background */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
      
      {/* Header */}
      <header className={`backdrop-blur-xl fixed top-0 w-full z-40 ${currentTheme.navBg} border-b ${currentTheme.border} transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <LogoIcon size={32} />
                <span className="font-bold text-lg">Polyva</span>
              </Link>
              
              <div className={`hidden md:flex items-center gap-2 ${currentTheme.textSecondary}`}>
                <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                <span className={`${currentTheme.text} font-medium`}>Showcase</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <motion.button
                onClick={toggleTheme}
                className={`p-2 rounded-full ${currentTheme.buttonSecondary} transition-colors`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: theme === 'dark' ? 0 : 180 }}
                  transition={{ duration: 0.3 }}
                >
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                </motion.div>
              </motion.button>

              <Link 
                to="/generate" 
                className={`flex items-center gap-2 px-4 py-2 ${currentTheme.accentBg} text-white rounded-full text-sm font-medium ${theme === 'dark' ? 'hover:bg-lime-400' : 'hover:bg-cyan-400'} transition-colors`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Create model</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className={`bg-gradient-to-r ${currentTheme.accentGradient} bg-clip-text text-transparent`}>
                Showcase
              </span>
            </h1>
            <p className={`${currentTheme.textSecondary} text-lg max-w-2xl mx-auto`}>
              Explore and interact with 3D models created by the community. 
              Like, share, and save your favorite works!
            </p>
          </motion.div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            {/* Search Bar */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${currentTheme.textMuted} w-5 h-5`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search models..."
                  className={`w-full pl-12 pr-4 py-3 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.text} ${theme === 'dark' ? 'placeholder-gray-500' : 'placeholder-gray-400'} ${theme === 'dark' ? 'focus:border-lime-500 focus:ring-lime-500' : 'focus:border-cyan-500 focus:ring-cyan-500'} focus:ring-1 transition-colors`}
                />
              </div>
              
              {/* View Mode Toggle */}
              <div className={`flex items-center gap-1 ${currentTheme.cardBg} rounded-xl p-1`}>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "grid" ? `${currentTheme.accentBg} text-white` : `${currentTheme.textSecondary} hover:${currentTheme.text}`
                  }`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("masonry")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "masonry" ? `${currentTheme.accentBg} text-white` : `${currentTheme.textSecondary} hover:${currentTheme.text}`
                  }`}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat.id
                      ? `${currentTheme.accentBg} text-white`
                      : `${currentTheme.cardBg} ${currentTheme.textSecondary} hover:${currentTheme.text} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {POPULAR_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    selectedTags.includes(tag)
                      ? `${theme === 'dark' ? 'bg-lime-500/20 border-lime-500 text-lime-400' : 'bg-cyan-500/20 border-cyan-500 text-cyan-600'}`
                      : `bg-transparent ${currentTheme.border} ${currentTheme.textMuted} ${theme === 'dark' ? 'hover:border-white/20' : 'hover:border-black/20'} ${currentTheme.textSecondary}`
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total models", value: models.length, icon: Box },
              { label: "Contributors", value: new Set(models.map(m => m.author)).size, icon: Sparkles },
              { label: "Total likes", value: models.reduce((sum, m) => sum + (m.likes || 0), 0), icon: Heart },
              { label: "Total views", value: models.reduce((sum, m) => sum + (m.views || 0), 0), icon: Eye }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`${currentTheme.cardBg} rounded-xl p-4 border ${currentTheme.border}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${theme === 'dark' ? 'bg-lime-500/20' : 'bg-cyan-500/20'} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${currentTheme.accentColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                    <p className={`text-xs ${currentTheme.textMuted}`}>{stat.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Models Grid */}
          <div className={`grid gap-6 ${
            viewMode === "grid" 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
              : "columns-1 sm:columns-2 lg:columns-3"
          }`}>
            {sortedModels.map((model, index) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5 }}
                className={`group bg-gradient-to-br from-gray-900 to-black rounded-2xl border ${currentTheme.border} overflow-hidden ${
                  viewMode === "masonry" ? "break-inside-avoid mb-6" : ""
                }`}
              >
                {/* Image */}
                <div 
                  className={`relative aspect-square ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-100 to-gray-200'} cursor-pointer`}
                  onClick={() => setSelectedModel(model)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${theme === 'dark' ? 'from-lime-500/5' : 'from-cyan-500/5'} to-transparent`} />
                  {model.image ? (
                    <img 
                      src={model.image} 
                      alt={model.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Box className={`w-16 h-16 ${currentTheme.textMuted}`} />
                    </div>
                  )}
                  
                  {/* Hover Overlay */}
                  <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-black/60' : 'bg-white/60'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center`}>
                    <button className={`px-4 py-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'} backdrop-blur-sm rounded-full ${currentTheme.text} flex items-center gap-2 ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/20'} transition-colors`}>
                      <Eye className="w-4 h-4" />
                      View details
                    </button>
                  </div>

                  {/* Tags */}
                  {model.tags && model.tags.length > 0 && (
                    <div className="absolute top-3 left-3 flex gap-1">
                      {model.tags.slice(0, 2).map(tag => (
                        <span key={tag} className={`px-2 py-1 ${theme === 'dark' ? 'bg-black/50' : 'bg-white/80'} backdrop-blur-sm rounded text-xs ${currentTheme.textSecondary}`}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className={`font-semibold ${currentTheme.text} truncate`}>{model.title}</h3>
                  </div>
                  
                  <p className={`text-sm ${currentTheme.textMuted} line-clamp-2 mb-3`}>{model.description}</p>
                  
                  {/* Author */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${currentTheme.accentGradient} flex items-center justify-center text-white text-xs`}>
                      {model.author?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className={`text-sm ${currentTheme.textSecondary}`}>@{model.author}</span>
                    <span className={`text-xs ${currentTheme.textMuted}`}>•</span>
                    <span className={`text-xs ${currentTheme.textMuted} flex items-center gap-1`}>
                      <Clock className="w-3 h-3" />
                      {model.createdAt}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center justify-between pt-3 border-t ${currentTheme.border}`}>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLike(model.id)}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${
                          likedModels.has(model.id) ? "text-red-400" : `${currentTheme.textSecondary} hover:text-red-400`
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${likedModels.has(model.id) ? "fill-current" : ""}`} />
                        {model.likes || 0}
                      </button>
                      <button className={`flex items-center gap-1.5 text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>
                        <MessageCircle className="w-4 h-4" />
                        {model.comments || 0}
                      </button>
                      <span className={`flex items-center gap-1.5 text-sm ${currentTheme.textMuted}`}>
                        <Eye className="w-4 h-4" />
                        {model.views || 0}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleSave(model.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          savedModels.has(model.id) 
                            ? `${theme === 'dark' ? 'bg-lime-500/20 text-lime-400' : 'bg-cyan-500/20 text-cyan-600'}` 
                            : `${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'} ${currentTheme.textSecondary} hover:${currentTheme.text}`
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${savedModels.has(model.id) ? "fill-current" : ""}`} />
                      </button>
                      <button className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'} ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'} ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {sortedModels.length === 0 && (
            <div className="text-center py-20">
              <div className={`w-20 h-20 mx-auto mb-6 rounded-full ${currentTheme.cardBg} flex items-center justify-center`}>
                <Box className={`w-10 h-10 ${currentTheme.textMuted}`} />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${currentTheme.textSecondary}`}>No models found</h3>
              <p className={`${currentTheme.textMuted} mb-6`}>Try changing filters or search terms</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTags([]);
                  setSelectedCategory("all");
                }}
                className={`px-6 py-3 ${currentTheme.cardBg} rounded-xl ${currentTheme.textSecondary} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-colors`}
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Load More */}
          {sortedModels.length > 0 && (
            <div className="text-center mt-12">
              <button className={`px-8 py-3 ${currentTheme.cardBg} border ${currentTheme.border} rounded-full ${currentTheme.textSecondary} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-colors`}>
                Load more
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Model Detail Modal */}
      <AnimatePresence>
        {selectedModel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/90' : 'bg-black/50'} backdrop-blur-sm z-50 flex items-center justify-center p-4`}
            onClick={() => setSelectedModel(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-4xl bg-gray-900 border ${currentTheme.border} rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto`}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedModel(null)}
                className={`absolute top-4 right-4 p-2 ${theme === 'dark' ? 'bg-black/50 hover:bg-black/70' : 'bg-white/50 hover:bg-white/70'} rounded-full transition-colors z-10`}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="grid md:grid-cols-2 gap-0">
                {/* Image/3D View */}
                <div className={`aspect-square ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-100 to-gray-200'} relative`}>
                  {selectedModel.image ? (
                    <img 
                      src={selectedModel.image}
                      alt={selectedModel.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Box className={`w-24 h-24 ${currentTheme.textMuted}`} />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-6 flex flex-col">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">{selectedModel.title}</h2>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${currentTheme.accentGradient} flex items-center justify-center text-white text-sm`}>
                        {selectedModel.author?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">@{selectedModel.author}</p>
                        <p className={`text-xs ${currentTheme.textMuted}`}>{selectedModel.createdAt}</p>
                      </div>
                    </div>

                    <p className={`${currentTheme.textSecondary} mb-6`}>{selectedModel.description}</p>

                    {/* Tags */}
                    {selectedModel.tags && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {selectedModel.tags.map(tag => (
                          <span key={tag} className={`px-3 py-1 ${currentTheme.cardBg} rounded-full text-xs ${currentTheme.textSecondary}`}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats */}
                    <div className={`flex items-center gap-6 mb-6`}>
                      <div className={`flex items-center gap-2 ${currentTheme.textSecondary}`}>
                        <Heart className={`w-5 h-5 ${likedModels.has(selectedModel.id) ? "fill-red-400 text-red-400" : ""}`} />
                        <span>{selectedModel.likes}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${currentTheme.textSecondary}`}>
                        <Eye className="w-5 h-5" />
                        <span>{selectedModel.views}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${currentTheme.textSecondary}`}>
                        <MessageCircle className="w-5 h-5" />
                        <span>{selectedModel.comments}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleLike(selectedModel.id)}
                      className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                        likedModels.has(selectedModel.id)
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : `${currentTheme.cardBg} ${currentTheme.textSecondary} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${likedModels.has(selectedModel.id) ? "fill-current" : ""}`} />
                      {likedModels.has(selectedModel.id) ? "Liked" : "Like"}
                    </button>
                    <button
                      onClick={() => handleSave(selectedModel.id)}
                      className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                        savedModels.has(selectedModel.id)
                          ? `${theme === 'dark' ? 'bg-lime-500/20 text-lime-400 border-lime-500/30' : 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30'} border`
                          : `${currentTheme.cardBg} ${currentTheme.textSecondary} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`
                      }`}
                    >
                      <Bookmark className={`w-5 h-5 ${savedModels.has(selectedModel.id) ? "fill-current" : ""}`} />
                      {savedModels.has(selectedModel.id) ? "Saved" : "Save"}
                    </button>
                    <button className={`py-3 px-4 ${currentTheme.accentBg} text-white rounded-xl font-medium flex items-center justify-center gap-2 ${theme === 'dark' ? 'hover:bg-lime-400' : 'hover:bg-cyan-400'} transition-colors`}>
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
