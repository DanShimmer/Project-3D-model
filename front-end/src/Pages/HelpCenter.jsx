import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Search,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Mail,
  Zap,
  FileText,
  CreditCard,
  Settings,
  Shield,
  Download,
  Upload,
  Palette,
  Box,
  Plus,
  Minus
} from "lucide-react";
import { LogoIcon } from "../Components/Logo";
import { useTheme } from "../contexts/ThemeContext";

// FAQ Categories
const FAQ_CATEGORIES = [
  { id: "all", label: "All Questions", icon: HelpCircle },
  { id: "getting-started", label: "Getting Started", icon: Zap },
  { id: "generation", label: "3D Generation", icon: Box },
  { id: "export", label: "Export & Download", icon: Download },
  { id: "account", label: "Account & Billing", icon: CreditCard },
  { id: "technical", label: "Technical", icon: Settings }
];

// FAQ Data
const FAQS = [
  {
    id: 1,
    question: "How do I create my first 3D model?",
    answer: "Getting started is easy! Simply navigate to the Generate page, choose between Text-to-3D or Image-to-3D mode, enter your prompt or upload an image, and click 'Generate'. Your 3D model will be ready in just a few minutes.",
    category: "getting-started"
  },
  {
    id: 2,
    question: "What file formats can I export?",
    answer: "Polyva supports multiple export formats including GLB, GLTF, FBX, OBJ, and STL. Each format has its own use case - GLB/GLTF for web and AR, FBX for game engines, OBJ for traditional 3D software, and STL for 3D printing.",
    category: "export"
  },
  {
    id: 3,
    question: "How do I write effective prompts for Text-to-3D?",
    answer: "For best results, be specific and descriptive. Include details about shape, material, color, style, and context. For example, instead of 'a chair', try 'a modern minimalist wooden chair with curved armrests and a soft cushion seat'.",
    category: "generation"
  },
  {
    id: 4,
    question: "What image formats are supported for Image-to-3D?",
    answer: "We support PNG, JPG, and WEBP image formats. For best results, use images with clear subjects, good lighting, and minimal background clutter. Transparent backgrounds (PNG) often produce better results.",
    category: "generation"
  },
  {
    id: 5,
    question: "How long does it take to generate a model?",
    answer: "Generation time depends on the complexity of your request. Simple models typically take 30-60 seconds, while more detailed models with textures can take 2-5 minutes. Premium users get priority processing.",
    category: "generation"
  },
  {
    id: 6,
    question: "Can I edit my generated 3D models?",
    answer: "Yes! After generation, you can rotate, zoom, and inspect your model in our 3D viewer. For advanced editing, you can export the model to professional 3D software like Blender or Maya.",
    category: "getting-started"
  },
  {
    id: 7,
    question: "How do I cancel my subscription?",
    answer: "You can manage your subscription from your Account Settings page. Click on 'Billing' and then 'Cancel Subscription'. Your access will continue until the end of your billing period.",
    category: "account"
  },
  {
    id: 8,
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for enterprise customers. All payments are processed securely through our payment provider.",
    category: "account"
  },
  {
    id: 9,
    question: "Why is my model generation failing?",
    answer: "Generation can fail due to server load, inappropriate content in prompts, or technical issues. Try simplifying your prompt, checking your internet connection, or waiting a few minutes and trying again. If issues persist, contact support.",
    category: "technical"
  },
  {
    id: 10,
    question: "Is my data secure?",
    answer: "Yes, we take security seriously. All data is encrypted in transit and at rest. We don't share your prompts or generated models with third parties. You can delete your data at any time from your account settings.",
    category: "technical"
  },
  {
    id: 11,
    question: "Can I use generated models commercially?",
    answer: "Yes! All models generated with Polyva are yours to use commercially. You own full rights to your creations, including for games, films, products, and marketing materials.",
    category: "getting-started"
  },
  {
    id: 12,
    question: "How do I download my models?",
    answer: "After generation, click the 'Download' button in the model viewer. Choose your preferred format, and the file will download to your device. You can also access all your models from 'My Storage'.",
    category: "export"
  }
];

// Contact options
const CONTACT_OPTIONS = [
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Chat with our support team in real-time",
    action: "Start Chat",
    color: "from-green-500 to-emerald-600"
  },
  {
    icon: Mail,
    title: "Email Support",
    description: "Get help via email within 24 hours",
    action: "Send Email",
    color: "from-blue-500 to-indigo-600"
  },
  {
    icon: FileText,
    title: "Documentation",
    description: "Browse our comprehensive guides",
    action: "View Docs",
    link: "/documentation",
    color: "from-purple-500 to-pink-600"
  }
];

// FAQ Item Component
const FAQItem = ({ faq, currentTheme, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <motion.div
      layout
      className={`${currentTheme.cardBg} border ${currentTheme.border} rounded-xl overflow-hidden`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left"
      >
        <span className="font-medium pr-4">{faq.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isOpen 
              ? `bg-gradient-to-r ${currentTheme.accentGradient}` 
              : currentTheme.buttonSecondary
          }`}
        >
          <Plus className={`w-4 h-4 ${isOpen ? 'text-white' : ''}`} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className={`px-5 pb-5 ${currentTheme.textSecondary}`}>
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function HelpCenterPage() {
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

  // Filter FAQs
  const filteredFAQs = FAQS.filter(faq => {
    if (selectedCategory !== "all" && faq.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return faq.question.toLowerCase().includes(query) ||
             faq.answer.toLowerCase().includes(query);
    }
    return true;
  });

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
                <span className={`${currentTheme.text} font-medium`}>Help Center</span>
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
              <span className={currentTheme.accentColor}>Help Center</span>
            </h1>
            <p className={`text-lg ${currentTheme.textSecondary} max-w-2xl mx-auto`}>
              Find answers to common questions and get the support you need
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
                placeholder="Search for help..."
                className={`w-full pl-12 pr-4 py-4 bg-transparent ${currentTheme.text} placeholder-gray-500 focus:outline-none`}
              />
            </div>
          </motion.div>

          {/* Contact Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6 mb-12"
          >
            {CONTACT_OPTIONS.map((option, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className={`${currentTheme.cardBg} rounded-2xl border ${currentTheme.border} p-6 text-center cursor-pointer group`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${option.color} flex items-center justify-center mx-auto mb-4`}>
                  <option.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{option.title}</h3>
                <p className={`${currentTheme.textSecondary} text-sm mb-4`}>{option.description}</p>
                {option.link ? (
                  <Link
                    to={option.link}
                    className={`inline-flex items-center gap-2 ${currentTheme.accentColor} hover:opacity-80 text-sm font-medium`}
                  >
                    {option.action} <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <button className={`inline-flex items-center gap-2 ${currentTheme.accentColor} hover:opacity-80 text-sm font-medium`}>
                    {option.action} <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* FAQ Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-2 flex-wrap mb-8 justify-center"
          >
            {FAQ_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat.id
                    ? `bg-gradient-to-r ${currentTheme.accentGradient} text-white`
                    : `${currentTheme.buttonSecondary}`
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </motion.div>

          {/* FAQs */}
          <div className="max-w-3xl mx-auto space-y-4">
            {filteredFAQs.map((faq, i) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <FAQItem faq={faq} currentTheme={currentTheme} theme={theme} />
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
            <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
            <p className={`${currentTheme.textSecondary} mb-6 max-w-lg mx-auto`}>
              Our support team is here to help you with any questions or issues
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                className={`inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r ${currentTheme.accentGradient} text-white font-semibold hover:opacity-90 transition-all`}
              >
                <MessageCircle className="w-5 h-5" />
                Contact Support
              </button>
              <Link
                to="/documentation"
                className={`inline-flex items-center gap-2 px-8 py-4 rounded-full ${currentTheme.buttonSecondary} font-semibold hover:opacity-90 transition-all`}
              >
                <FileText className="w-5 h-5" />
                View Documentation
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
