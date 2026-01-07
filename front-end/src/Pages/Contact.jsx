import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  MessageCircle,
  Phone,
  MapPin,
  Send,
  Sun,
  Moon,
  CheckCircle,
  Clock,
  Globe,
  Headphones,
  Building2,
  ArrowRight
} from "lucide-react";
import { LogoIcon } from "../Components/Logo";
import { useTheme } from "../contexts/ThemeContext";

// Contact methods
const CONTACT_METHODS = [
  {
    icon: Mail,
    title: "Email Support",
    description: "Get help via email within 24 hours",
    contact: "support@polyva.ai",
    action: "mailto:support@polyva.ai",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Chat with our team in real-time",
    contact: "Available 9AM - 6PM EST",
    action: "#",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Phone,
    title: "Phone Support",
    description: "Premium support for enterprise",
    contact: "+1 (555) 123-4567",
    action: "tel:+15551234567",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Globe,
    title: "Community Discord",
    description: "Join our community for help",
    contact: "discord.gg/polyva",
    action: "https://discord.gg",
    color: "from-indigo-500 to-purple-500"
  }
];

// Office locations
const OFFICES = [
  {
    city: "San Francisco",
    country: "United States",
    address: "123 AI Boulevard, Suite 500",
    timezone: "PST (UTC-8)"
  },
  {
    city: "London",
    country: "United Kingdom",
    address: "45 Tech Street, Floor 3",
    timezone: "GMT (UTC+0)"
  },
  {
    city: "Singapore",
    country: "Singapore",
    address: "78 Innovation Way, #12-01",
    timezone: "SGT (UTC+8)"
  }
];

export default function Contact() {
  const { theme, currentTheme, toggleTheme } = useTheme();
  const canvasRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [formStatus, setFormStatus] = useState(null); // null | 'sending' | 'sent' | 'error'

  // Canvas background animation
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
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const particles = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    let rafId;
    function draw() {
      ctx.fillStyle = theme === 'dark' ? "#04060A" : "#0f172a";
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        const particleColor = theme === 'dark' ? "rgba(120,255,100," : "rgba(6,182,212,";
        ctx.fillStyle = `${particleColor}${p.alpha})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = theme === 'dark' ? "rgba(120,255,100,0.9)" : "rgba(6,182,212,0.9)";
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

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, [theme]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus('sending');
    
    // Simulate API call
    setTimeout(() => {
      setFormStatus('sent');
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setFormStatus(null), 3000);
    }, 1500);
  };

  return (
    <div className={`min-h-screen ${currentTheme.text} relative`}>
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />

      {/* Header */}
      <header className={`backdrop-blur-sm fixed top-0 w-full z-40 ${currentTheme.navBg} border-b ${currentTheme.border}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <LogoIcon size={36} />
              <span className="font-semibold text-xl">Polyva</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link to="/help" className={`text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>
                Help Center
              </Link>
              <Link to="/docs" className={`text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>
                Documentation
              </Link>
              <Link to="/blogs" className={`text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>
                Blog
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <motion.button
                onClick={toggleTheme}
                className={`p-2 rounded-full ${currentTheme.buttonSecondary} transition-colors`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </motion.button>
              <Link
                to="/"
                className={`px-4 py-2 bg-gradient-to-r ${currentTheme.accentGradient} text-white text-sm rounded-lg hover:opacity-90`}
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className={`inline-flex items-center gap-2 px-4 py-2 ${currentTheme.cardBg} rounded-full border ${currentTheme.border} mb-6`}>
            <Headphones className={`w-4 h-4 ${currentTheme.accentColor}`} />
            <span className={`text-sm ${currentTheme.textSecondary}`}>We're here to help</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Get in <span className={`bg-gradient-to-r ${currentTheme.accentGradient} bg-clip-text text-transparent`}>Touch</span>
          </h1>
          <p className={`text-lg ${currentTheme.textSecondary} max-w-2xl mx-auto`}>
            Have questions about Polyva? Our team is ready to help you with anything from technical support to enterprise solutions.
          </p>
        </motion.div>

        {/* Contact Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {CONTACT_METHODS.map((method, index) => (
            <motion.a
              key={method.title}
              href={method.action}
              target={method.action.startsWith('http') ? '_blank' : undefined}
              rel={method.action.startsWith('http') ? 'noopener noreferrer' : undefined}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileHover={{ y: -5 }}
              className={`p-6 rounded-2xl border ${currentTheme.border} bg-gray-900/50 backdrop-blur-sm hover:border-opacity-50 transition-all group`}
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${method.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <method.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{method.title}</h3>
              <p className={`text-sm ${currentTheme.textSecondary} mb-3`}>{method.description}</p>
              <p className={`text-sm ${currentTheme.accentColor} font-medium`}>{method.contact}</p>
            </motion.a>
          ))}
        </motion.div>

        {/* Contact Form & Info */}
        <div className="grid lg:grid-cols-5 gap-8 mb-16">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`lg:col-span-3 p-8 rounded-2xl border ${currentTheme.border} bg-gray-900/50 backdrop-blur-sm`}
          >
            <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium ${currentTheme.textSecondary} mb-2`}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 bg-white/5 border ${currentTheme.border} rounded-xl ${currentTheme.text} focus:border-current focus:ring-1 transition-colors`}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${currentTheme.textSecondary} mb-2`}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 bg-white/5 border ${currentTheme.border} rounded-xl ${currentTheme.text} focus:border-current focus:ring-1 transition-colors`}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${currentTheme.textSecondary} mb-2`}>
                  Subject
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 bg-white/5 border ${currentTheme.border} rounded-xl ${currentTheme.text} focus:border-current focus:ring-1 transition-colors`}
                  style={{ backgroundColor: '#1f2937' }}
                >
                  <option value="" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Select a topic</option>
                  <option value="general" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>General Inquiry</option>
                  <option value="support" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Technical Support</option>
                  <option value="billing" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Billing Question</option>
                  <option value="enterprise" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Enterprise Sales</option>
                  <option value="partnership" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Partnership</option>
                  <option value="feedback" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Feedback</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${currentTheme.textSecondary} mb-2`}>
                  Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className={`w-full px-4 py-3 bg-white/5 border ${currentTheme.border} rounded-xl ${currentTheme.text} focus:border-current focus:ring-1 transition-colors resize-none`}
                  placeholder="Tell us how we can help..."
                />
              </div>

              <button
                type="submit"
                disabled={formStatus === 'sending'}
                className={`w-full py-4 bg-gradient-to-r ${currentTheme.accentGradient} text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {formStatus === 'sending' ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </>
                ) : formStatus === 'sent' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Message Sent!
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Quick Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Response Time */}
            <div className={`p-6 rounded-2xl border ${currentTheme.border} bg-gray-900/50 backdrop-blur-sm`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 bg-gradient-to-r ${currentTheme.accentGradient} rounded-xl flex items-center justify-center`}>
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Response Time</h3>
                  <p className={`text-sm ${currentTheme.textSecondary}`}>Usually within 24 hours</p>
                </div>
              </div>
              <div className={`p-4 rounded-xl bg-white/5 border ${currentTheme.border}`}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className={currentTheme.textSecondary}>General Inquiries</span>
                  <span className={currentTheme.accentColor}>24h</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className={currentTheme.textSecondary}>Technical Support</span>
                  <span className={currentTheme.accentColor}>12h</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={currentTheme.textSecondary}>Enterprise</span>
                  <span className={currentTheme.accentColor}>4h</span>
                </div>
              </div>
            </div>

            {/* Offices */}
            <div className={`p-6 rounded-2xl border ${currentTheme.border} bg-gray-900/50 backdrop-blur-sm`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center`}>
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold">Our Offices</h3>
              </div>
              <div className="space-y-4">
                {OFFICES.map((office, index) => (
                  <div key={index} className={`p-4 rounded-xl bg-white/5 border ${currentTheme.border}`}>
                    <div className="flex items-start gap-3">
                      <MapPin className={`w-4 h-4 ${currentTheme.accentColor} mt-0.5`} />
                      <div>
                        <p className="font-medium">{office.city}, {office.country}</p>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>{office.address}</p>
                        <p className={`text-xs ${currentTheme.textMuted} mt-1`}>{office.timezone}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Link */}
            <Link
              to="/help"
              className={`flex items-center justify-between p-6 rounded-2xl border ${currentTheme.border} bg-gray-900/50 backdrop-blur-sm hover:border-opacity-50 transition-all group`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center`}>
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Check our FAQ</h3>
                  <p className={`text-sm ${currentTheme.textSecondary}`}>Find quick answers</p>
                </div>
              </div>
              <ArrowRight className={`w-5 h-5 ${currentTheme.textSecondary} group-hover:${currentTheme.accentColor} group-hover:translate-x-1 transition-all`} />
            </Link>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`text-center p-12 rounded-3xl border ${currentTheme.border} bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-sm`}
        >
          <h2 className="text-3xl font-bold mb-4">
            Ready to create amazing <span className={`bg-gradient-to-r ${currentTheme.accentGradient} bg-clip-text text-transparent`}>3D models</span>?
          </h2>
          <p className={`${currentTheme.textSecondary} mb-8 max-w-xl mx-auto`}>
            Join thousands of creators using Polyva to bring their ideas to life in 3D.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/generate"
              className={`px-8 py-4 bg-gradient-to-r ${currentTheme.accentGradient} text-white rounded-xl font-semibold hover:opacity-90 transition-all`}
            >
              Start Creating
            </Link>
            <Link
              to="/showcase"
              className={`px-8 py-4 ${currentTheme.buttonSecondary} border ${currentTheme.border} rounded-xl font-semibold hover:bg-white/10 transition-all`}
            >
              View Showcase
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className={`border-t ${currentTheme.border} py-8 px-6`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoIcon size={24} />
            <span className={`text-sm ${currentTheme.textSecondary}`}>© 2026 Polyva. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className={`text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>Privacy</Link>
            <Link to="/terms" className={`text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>Terms</Link>
            <Link to="/help" className={`text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
