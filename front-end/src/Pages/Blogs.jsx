import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LogoIcon } from "../Components/Logo";
import { 
  Sparkles, 
  Clock, 
  User, 
  ArrowRight, 
  Search,
  Tag,
  TrendingUp,
  BookOpen,
  ChevronDown,
  Calendar,
  Eye,
  Sun,
  Moon
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

// Blog categories
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "ai-technology", label: "AI & Technology" },
  { id: "tutorials", label: "Tutorials" },
  { id: "tips-tricks", label: "Tips & Tricks" },
  { id: "news", label: "News" },
  { id: "case-studies", label: "Case Studies" }
];

// Sample blog posts
const BLOG_POSTS = [
  {
    id: 1,
    title: "How AI is Changing the 3D Design Industry",
    excerpt: "Discover how AI technology is revolutionizing the 3D model creation process, from concept to finished product in just minutes.",
    content: "",
    image: "https://via.placeholder.com/800x400?text=AI+3D+Design",
    category: "ai-technology",
    author: "John Smith",
    authorAvatar: null,
    date: "2025-01-05",
    readTime: "8 min read",
    views: 2450,
    featured: true,
    tags: ["AI", "3D Design", "Future Tech"]
  },
  {
    id: 2,
    title: "Top 5 Best 3D Tools of 2025",
    excerpt: "A detailed comparison of the most popular 3D modeling tools: Blender, Unity, Unreal Engine, Maya, and of course, Polyva.",
    content: "",
    image: "https://via.placeholder.com/800x400?text=3D+Tools+2025",
    category: "tips-tricks",
    author: "Sarah Johnson",
    authorAvatar: null,
    date: "2025-01-04",
    readTime: "12 min read",
    views: 1890,
    featured: true,
    tags: ["Tools", "Comparison", "3D Software"]
  },
  {
    id: 3,
    title: "Tutorial: From Concept to Professional Render",
    excerpt: "Complete steps from ideation, model creation, texture application, to final render with the highest quality.",
    content: "",
    image: "https://via.placeholder.com/800x400?text=Concept+to+Render",
    category: "tutorials",
    author: "Mike Wilson",
    authorAvatar: null,
    date: "2025-01-03",
    readTime: "15 min read",
    views: 3210,
    featured: false,
    tags: ["Tutorial", "Rendering", "Workflow"]
  },
  {
    id: 4,
    title: "Text-to-3D: The Future of Content Creation",
    excerpt: "Deep analysis of text-to-3D model conversion technology and its potential applications in the future.",
    content: "",
    image: "https://via.placeholder.com/800x400?text=Text+to+3D",
    category: "ai-technology",
    author: "David Brown",
    authorAvatar: null,
    date: "2025-01-02",
    readTime: "10 min read",
    views: 1560,
    featured: false,
    tags: ["Text-to-3D", "AI", "Innovation"]
  },
  {
    id: 5,
    title: "Optimizing 3D Models for Mobile Games",
    excerpt: "Techniques and best practices for creating lightweight, optimized yet beautiful 3D models for mobile game projects.",
    content: "",
    image: "https://via.placeholder.com/800x400?text=Mobile+Game+3D",
    category: "tutorials",
    author: "Emily Davis",
    authorAvatar: null,
    date: "2025-01-01",
    readTime: "11 min read",
    views: 2100,
    featured: false,
    tags: ["Optimization", "Mobile Games", "Performance"]
  },
  {
    id: 6,
    title: "Polyva 2.0: New Features Coming Soon",
    excerpt: "Sneak peek at the features coming in Polyva 2.0 with significant improvements.",
    content: "",
    image: "https://via.placeholder.com/800x400?text=Polyva+2.0",
    category: "news",
    author: "Team Polyva",
    authorAvatar: null,
    date: "2024-12-30",
    readTime: "6 min read",
    views: 4500,
    featured: false,
    tags: ["News", "Update", "Polyva"]
  }
];

export default function BlogsPage() {
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

  // Filter blogs
  const filteredBlogs = BLOG_POSTS.filter(blog => {
    if (selectedCategory !== "all" && blog.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return blog.title.toLowerCase().includes(query) ||
             blog.excerpt.toLowerCase().includes(query) ||
             blog.tags.some(tag => tag.toLowerCase().includes(query));
    }
    return true;
  });

  // Featured blogs
  const featuredBlogs = BLOG_POSTS.filter(b => b.featured);

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
                <span className={`${currentTheme.text} font-medium`}>Blogs</span>
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
                Blog
              </span>
            </h1>
            <p className={`${currentTheme.textSecondary} text-lg max-w-2xl mx-auto`}>
              Explore news, tutorials and tips about the world of 3D and AI
            </p>
          </motion.div>

          {/* Search and Filter */}
          <div className="mb-12 space-y-4">
            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${currentTheme.textMuted} w-5 h-5`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className={`w-full pl-12 pr-4 py-3 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.text} ${theme === 'dark' ? 'placeholder-gray-500' : 'placeholder-gray-400'} ${theme === 'dark' ? 'focus:border-lime-500 focus:ring-lime-500' : 'focus:border-cyan-500 focus:ring-cyan-500'} focus:ring-1 transition-colors`}
              />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap justify-center gap-2">
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
          </div>

          {/* Featured Posts */}
          {selectedCategory === "all" && !searchQuery && featuredBlogs.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className={`w-5 h-5 ${currentTheme.accentColor}`} />
                <h2 className="text-xl font-semibold">Featured Posts</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {featuredBlogs.map((blog, index) => (
                  <motion.article
                    key={blog.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className={`group bg-gradient-to-br from-gray-900 to-black rounded-2xl border ${currentTheme.border} overflow-hidden cursor-pointer`}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={blog.image} 
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 ${currentTheme.accentBg} text-white text-xs font-medium rounded-full`}>
                          Featured
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <span className={`text-xs ${currentTheme.accentColor} font-medium mb-2 block`}>
                          {CATEGORIES.find(c => c.id === blog.category)?.label}
                        </span>
                        <h3 className={`text-xl font-bold mb-2 text-white group-hover:${currentTheme.accentColor} transition-colors line-clamp-2`}>
                          {blog.title}
                        </h3>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className={`${currentTheme.textSecondary} text-sm mb-4 line-clamp-2`}>{blog.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${currentTheme.accentGradient} flex items-center justify-center text-white text-xs`}>
                            {blog.author[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{blog.author}</p>
                            <p className={`text-xs ${currentTheme.textMuted}`}>{blog.date}</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-4 text-xs ${currentTheme.textMuted}`}>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {blog.readTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {blog.views}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </section>
          )}

          {/* All Posts */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className={`w-5 h-5 ${currentTheme.accentColor}`} />
                <h2 className="text-xl font-semibold">
                  {selectedCategory === "all" ? "All articles" : CATEGORIES.find(c => c.id === selectedCategory)?.label}
                </h2>
              </div>
              <span className={`text-sm ${currentTheme.textMuted}`}>{filteredBlogs.length} articles</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBlogs.map((blog, index) => (
                <motion.article
                  key={blog.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -5 }}
                  className={`group bg-gradient-to-br from-gray-900 to-black rounded-2xl border ${currentTheme.border} overflow-hidden cursor-pointer`}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={blog.image} 
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2 py-1 bg-black/50 backdrop-blur-sm text-xs ${currentTheme.textSecondary} rounded`}>
                        {CATEGORIES.find(c => c.id === blog.category)?.label}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className={`font-semibold mb-2 group-hover:${currentTheme.accentColor} transition-colors line-clamp-2`}>
                      {blog.title}
                    </h3>
                    <p className={`${currentTheme.textMuted} text-sm mb-4 line-clamp-2`}>{blog.excerpt}</p>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {blog.tags.slice(0, 3).map(tag => (
                        <span key={tag} className={`px-2 py-1 ${currentTheme.cardBg} rounded text-xs ${currentTheme.textSecondary}`}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className={`flex items-center justify-between pt-4 border-t ${currentTheme.border}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${currentTheme.accentGradient} flex items-center justify-center text-white text-[10px]`}>
                          {blog.author[0]}
                        </div>
                        <span className={`text-xs ${currentTheme.textSecondary}`}>{blog.author}</span>
                      </div>
                      <div className={`flex items-center gap-3 text-xs ${currentTheme.textMuted}`}>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {blog.date}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            {/* Empty State */}
            {filteredBlogs.length === 0 && (
              <div className="text-center py-20">
                <div className={`w-20 h-20 mx-auto mb-6 rounded-full ${currentTheme.cardBg} flex items-center justify-center`}>
                  <BookOpen className={`w-10 h-10 ${currentTheme.textMuted}`} />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${currentTheme.textSecondary}`}>No articles found</h3>
                <p className={`${currentTheme.textMuted} mb-6`}>Try changing filters or search terms</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className={`px-6 py-3 ${currentTheme.cardBg} rounded-xl ${currentTheme.textSecondary} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-colors`}
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Load More */}
            {filteredBlogs.length > 0 && (
              <div className="text-center mt-12">
                <button className={`px-8 py-3 ${currentTheme.cardBg} border ${currentTheme.border} rounded-full ${currentTheme.textSecondary} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-colors inline-flex items-center gap-2`}>
                  Load more
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>

          {/* Newsletter */}
          <section className="mt-20">
            <div className={`bg-gradient-to-br ${theme === 'dark' ? 'from-lime-500/20 to-green-500/10 border-lime-500/20' : 'from-cyan-500/20 to-blue-500/10 border-cyan-500/20'} rounded-3xl border p-8 md:p-12 text-center`}>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Subscribe to our newsletter
              </h2>
              <p className={`${currentTheme.textSecondary} mb-8 max-w-xl mx-auto`}>
                Get notified about new articles, tips and product updates delivered directly to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Your email"
                  className={`flex-1 px-4 py-3 ${theme === 'dark' ? 'bg-black/30' : 'bg-white/50'} border ${currentTheme.border} rounded-xl ${currentTheme.text} ${theme === 'dark' ? 'placeholder-gray-500' : 'placeholder-gray-400'} ${theme === 'dark' ? 'focus:border-lime-500 focus:ring-lime-500' : 'focus:border-cyan-500 focus:ring-cyan-500'} focus:ring-1 transition-colors`}
                />
                <button className={`px-6 py-3 ${currentTheme.accentBg} text-white rounded-xl font-medium ${theme === 'dark' ? 'hover:bg-lime-400' : 'hover:bg-cyan-400'} transition-colors`}>
                  Subscribe
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
