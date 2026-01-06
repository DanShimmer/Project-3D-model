import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play,
  Clock,
  BookOpen,
  Filter,
  Search,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Star,
  Users,
  Zap,
  Video,
  FileText,
  Layers,
  Code
} from "lucide-react";
import { LogoIcon } from "../Components/Logo";
import { useTheme } from "../contexts/ThemeContext";

// Tutorial categories
const CATEGORIES = [
  { id: "all", label: "All Tutorials" },
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "quick-start", label: "Quick Start" }
];

// Tutorial data
const TUTORIALS = [
  {
    id: 1,
    title: "Getting Started with Polyva",
    description: "Learn the basics of 3D model generation and navigate the Polyva interface with ease.",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop",
    level: "beginner",
    duration: "15 min",
    lessons: 5,
    students: 2340,
    rating: 4.9,
    featured: true,
    type: "video"
  },
  {
    id: 2,
    title: "Mastering Text-to-3D Prompts",
    description: "Write effective prompts that generate exactly what you envision. Learn prompt engineering techniques.",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=400&fit=crop",
    level: "intermediate",
    duration: "25 min",
    lessons: 8,
    students: 1890,
    rating: 4.8,
    featured: true,
    type: "video"
  },
  {
    id: 3,
    title: "Image to 3D: Complete Guide",
    description: "Transform your 2D images into detailed 3D models. Best practices for image preparation and conversion.",
    image: "https://images.unsplash.com/photo-1617791160505-6f00504e3519?w=800&h=400&fit=crop",
    level: "beginner",
    duration: "20 min",
    lessons: 6,
    students: 1560,
    rating: 4.7,
    featured: false,
    type: "video"
  },
  {
    id: 4,
    title: "Advanced Texturing Techniques",
    description: "Deep dive into PBR materials, texture maps, and AI-powered texture generation.",
    image: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&h=400&fit=crop",
    level: "advanced",
    duration: "35 min",
    lessons: 10,
    students: 980,
    rating: 4.9,
    featured: false,
    type: "video"
  },
  {
    id: 5,
    title: "API Integration Tutorial",
    description: "Integrate Polyva's powerful API into your applications. Complete code examples included.",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop",
    level: "advanced",
    duration: "45 min",
    lessons: 12,
    students: 750,
    rating: 4.8,
    featured: false,
    type: "article"
  },
  {
    id: 6,
    title: "Quick Start: Your First 3D Model",
    description: "Create your first 3D model in under 5 minutes. Perfect for complete beginners.",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=400&fit=crop",
    level: "quick-start",
    duration: "5 min",
    lessons: 3,
    students: 4200,
    rating: 4.9,
    featured: true,
    type: "video"
  }
];

const getLevelColor = (level, theme) => {
  const colors = {
    beginner: theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-500',
    intermediate: theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-500/20 text-yellow-600',
    advanced: theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-500/20 text-red-500',
    'quick-start': theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-500/20 text-purple-500'
  };
  return colors[level] || colors.beginner;
};

export default function TutorialsPage() {
  const { theme, currentTheme, toggleTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const canvasRef = useRef(null);

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
    
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.3 + 0.1
      });
    }
    
    const animate = () => {
      ctx.fillStyle = "rgba(10, 10, 10, 0.1)";
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

  // Filter tutorials
  const filteredTutorials = TUTORIALS.filter(tutorial => {
    if (selectedCategory !== "all" && tutorial.level !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return tutorial.title.toLowerCase().includes(query) ||
             tutorial.description.toLowerCase().includes(query);
    }
    return true;
  });

  const featuredTutorials = TUTORIALS.filter(t => t.featured);

  return (
    <div className={`min-h-screen ${currentTheme.background} ${currentTheme.text} relative`}>
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
      
      {/* Header */}
      <header className={`backdrop-blur-xl fixed top-0 w-full z-40 ${currentTheme.navBg} border-b ${currentTheme.border}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <LogoIcon size={32} />
                <span className="font-bold text-lg">Polyva</span>
              </Link>
              <div className={`hidden md:flex items-center gap-2 ${currentTheme.textSecondary}`}>
                <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                <span className={`${currentTheme.text} font-medium`}>Tutorials</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
                  {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </motion.div>
              </motion.button>
              <Link
                to="/generate"
                className={`flex items-center gap-2 px-4 py-2 ${currentTheme.accentBg} text-white rounded-full text-sm font-medium ${theme === 'dark' ? 'hover:bg-lime-400' : 'hover:bg-cyan-400'} transition-colors`}
              >
                <Zap className="w-4 h-4" />
                Try Polyva
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className={currentTheme.accentColor}>Tutorials</span>
            </h1>
            <p className={`text-lg ${currentTheme.textSecondary} max-w-2xl mx-auto`}>
              Master 3D model generation with our comprehensive video tutorials and guides
            </p>
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row gap-4 mb-8"
          >
            <div className={`flex-1 relative ${currentTheme.cardBg} rounded-xl border ${currentTheme.border}`}>
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${currentTheme.textSecondary}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tutorials..."
                className={`w-full pl-12 pr-4 py-3 bg-transparent ${currentTheme.text} placeholder-gray-500 focus:outline-none`}
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat.id
                      ? `bg-gradient-to-r ${currentTheme.accentGradient} text-white`
                      : `${currentTheme.buttonSecondary}`
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Featured Section */}
          {selectedCategory === "all" && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Star className={`w-6 h-6 ${theme === 'dark' ? 'text-lime-400' : 'text-cyan-500'}`} />
                Featured Tutorials
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {featuredTutorials.map((tutorial, i) => (
                  <motion.div
                    key={tutorial.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    whileHover={{ y: -5 }}
                    className={`${currentTheme.cardBg} rounded-2xl border ${currentTheme.border} overflow-hidden group cursor-pointer`}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={tutorial.image} 
                        alt={tutorial.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getLevelColor(tutorial.level, theme)}`}>
                          {tutorial.level.charAt(0).toUpperCase() + tutorial.level.slice(1)}
                        </span>
                      </div>
                      <div className="absolute top-4 right-4">
                        <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-lime-500' : 'bg-cyan-500'}`}>
                          {tutorial.type === 'video' ? <Play className="w-4 h-4 text-white" /> : <FileText className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-lg mb-2 group-hover:opacity-80">{tutorial.title}</h3>
                      <p className={`${currentTheme.textSecondary} text-sm mb-4 line-clamp-2`}>{tutorial.description}</p>
                      <div className={`flex items-center justify-between text-sm ${currentTheme.textSecondary}`}>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {tutorial.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" /> {tutorial.lessons} lessons
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> {tutorial.rating}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* All Tutorials */}
          <div>
            <h2 className="text-2xl font-bold mb-6">
              {selectedCategory === "all" ? "All Tutorials" : CATEGORIES.find(c => c.id === selectedCategory)?.label}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTutorials.map((tutorial, i) => (
                <motion.div
                  key={tutorial.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  whileHover={{ y: -5 }}
                  className={`${currentTheme.cardBg} rounded-2xl border ${currentTheme.border} overflow-hidden group cursor-pointer`}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={tutorial.image} 
                      alt={tutorial.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getLevelColor(tutorial.level, theme)}`}>
                        {tutorial.level.charAt(0).toUpperCase() + tutorial.level.slice(1)}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-lime-500/80' : 'bg-cyan-500/80'}`}>
                        {tutorial.type === 'video' ? <Play className="w-4 h-4 text-white" /> : <FileText className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold mb-2 group-hover:opacity-80">{tutorial.title}</h3>
                    <p className={`${currentTheme.textSecondary} text-sm mb-3 line-clamp-2`}>{tutorial.description}</p>
                    <div className={`flex items-center justify-between text-xs ${currentTheme.textSecondary}`}>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {tutorial.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {tutorial.students}
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {tutorial.rating}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`mt-16 text-center ${currentTheme.cardBg} rounded-2xl border ${currentTheme.border} p-12`}
          >
            <h2 className="text-3xl font-bold mb-4">Ready to start creating?</h2>
            <p className={`${currentTheme.textSecondary} mb-6 max-w-lg mx-auto`}>
              Put your skills to work and create stunning 3D models with Polyva
            </p>
            <Link
              to="/generate"
              className={`inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r ${currentTheme.accentGradient} text-white font-semibold hover:opacity-90 transition-all`}
            >
              <Zap className="w-5 h-5" />
              Start Creating
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
