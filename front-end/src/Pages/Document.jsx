import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Book,
  Code,
  Zap,
  Layers,
  Settings,
  Globe,
  ChevronDown,
  Search,
  Sun,
  Moon,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  FileText,
  Box,
  Palette,
  Image as ImageIcon,
  ChevronRight
} from "lucide-react";
import { LogoIcon } from "../Components/Logo";
import { useTheme } from "../contexts/ThemeContext";

// Documentation sections
const DOC_SECTIONS = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Zap,
    description: "Quick introduction and setup guide",
    articles: [
      { title: "Introduction to Polyva", readTime: "3 min" },
      { title: "Creating Your First 3D Model", readTime: "5 min" },
      { title: "Understanding the Interface", readTime: "4 min" },
    ]
  },
  {
    id: "text-to-3d",
    title: "Text to 3D",
    icon: FileText,
    description: "Generate 3D models from text descriptions",
    articles: [
      { title: "Writing Effective Prompts", readTime: "6 min" },
      { title: "Prompt Examples & Templates", readTime: "8 min" },
      { title: "Advanced Prompt Techniques", readTime: "10 min" },
    ]
  },
  {
    id: "image-to-3d",
    title: "Image to 3D",
    icon: ImageIcon,
    description: "Convert images into 3D models",
    articles: [
      { title: "Preparing Images for Conversion", readTime: "4 min" },
      { title: "Best Practices for Image Input", readTime: "5 min" },
      { title: "Multi-view Image Processing", readTime: "7 min" },
    ]
  },
  {
    id: "api-reference",
    title: "API Reference",
    icon: Code,
    description: "Complete API documentation for developers",
    articles: [
      { title: "Authentication & API Keys", readTime: "5 min" },
      { title: "Text-to-3D API Endpoints", readTime: "8 min" },
      { title: "Image-to-3D API Endpoints", readTime: "8 min" },
      { title: "Webhooks & Callbacks", readTime: "6 min" },
    ]
  },
  {
    id: "model-formats",
    title: "Model Formats",
    icon: Box,
    description: "Supported export formats and settings",
    articles: [
      { title: "GLB/GLTF Format Guide", readTime: "4 min" },
      { title: "FBX Export Options", readTime: "4 min" },
      { title: "OBJ & MTL Files", readTime: "3 min" },
    ]
  },
  {
    id: "texturing",
    title: "AI Texturing",
    icon: Palette,
    description: "Texture generation and PBR materials",
    articles: [
      { title: "Understanding PBR Materials", readTime: "6 min" },
      { title: "Texture Map Types", readTime: "5 min" },
      { title: "Custom Texture Prompts", readTime: "7 min" },
    ]
  }
];

// Code example
const CODE_EXAMPLE = `// Generate 3D model from text
const response = await fetch('/api/generate/text-to-3d', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'A cute robot with rounded edges',
    mode: 'fast'
  })
});

const { modelUrl } = await response.json();`;

export default function DocumentationPage() {
  const { theme, currentTheme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
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

  const copyCode = () => {
    navigator.clipboard.writeText(CODE_EXAMPLE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredSections = DOC_SECTIONS.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.articles.some(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                <span className={`${currentTheme.text} font-medium`}>Documentation</span>
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
              <span className={currentTheme.accentColor}>Documentation</span>
            </h1>
            <p className={`text-lg ${currentTheme.textSecondary} max-w-2xl mx-auto`}>
              Learn how to use Polyva to create stunning 3D models with AI
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto mb-12"
          >
            <div className={`relative ${currentTheme.cardBg} rounded-xl border ${currentTheme.border}`}>
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${currentTheme.textSecondary}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className={`w-full pl-12 pr-4 py-4 bg-transparent ${currentTheme.text} placeholder-gray-500 focus:outline-none`}
              />
            </div>
          </motion.div>

          {/* Quick Start Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${currentTheme.cardBg} rounded-2xl border ${currentTheme.border} p-6 mb-12`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${currentTheme.accentGradient}`}>
                  <Terminal className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Quick Start</h3>
                  <p className={`text-sm ${currentTheme.textSecondary}`}>Generate your first 3D model</p>
                </div>
              </div>
              <button
                onClick={copyCode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${currentTheme.buttonSecondary} text-sm`}
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="bg-black/50 rounded-xl p-4 overflow-x-auto">
              <code className="text-sm text-gray-300 font-mono">{CODE_EXAMPLE}</code>
            </pre>
          </motion.div>

          {/* Documentation Sections */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSections.map((section, i) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                whileHover={{ y: -5 }}
                className={`${currentTheme.cardBg} rounded-2xl border ${currentTheme.border} p-6 hover:border-opacity-50 transition-all cursor-pointer group`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${currentTheme.accentGradient} flex items-center justify-center mb-4`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold mb-2 group-hover:text-opacity-80">{section.title}</h3>
                <p className={`${currentTheme.textSecondary} text-sm mb-4`}>{section.description}</p>
                
                <div className="space-y-2">
                  {section.articles.map((article, j) => (
                    <div
                      key={j}
                      className={`flex items-center justify-between py-2 border-t ${currentTheme.border}`}
                    >
                      <span className={`text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>
                        {article.title}
                      </span>
                      <span className="text-xs text-gray-500">{article.readTime}</span>
                    </div>
                  ))}
                </div>
                
                <button className={`mt-4 flex items-center gap-2 text-sm ${currentTheme.accentColor} hover:opacity-80`}>
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`mt-16 text-center ${currentTheme.cardBg} rounded-2xl border ${currentTheme.border} p-12`}
          >
            <h2 className="text-3xl font-bold mb-4">Ready to create?</h2>
            <p className={`${currentTheme.textSecondary} mb-6 max-w-lg mx-auto`}>
              Start generating stunning 3D models with just a text description or image
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
