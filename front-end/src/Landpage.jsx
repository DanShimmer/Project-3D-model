import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import LoginModal from "./Components/LoginModal";
import { useAuth } from "./contexts/AuthContext";

// Theme configurations
const THEMES = {
  dark: {
    background: "#04060A",
    particleColor: "rgba(120,255,100,",
    shadowColor: "rgba(120,255,100,0.95)"
  },
  blue: {
    background: "#0a0f1a",
    particleColor: "rgba(0,255,255,",
    shadowColor: "rgba(0,200,255,0.95)"
  }
};

export default function PolyvaApp() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("pv_theme") || "dark");
  const themeRef = useRef(theme);
  const navigate = useNavigate();
  const { user, login, logout: authLogout } = useAuth();

  // Update themeRef when theme changes
  useEffect(() => {
    themeRef.current = theme;
    localStorage.setItem("pv_theme", theme);
  }, [theme]);

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "blue" : "dark");
  };

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
  
  useEffect(() => {
    const canvas = document.getElementById("bgCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    function resizeForDPR() {
      w = window.innerWidth;
      h = window.innerHeight;
      const curDpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * curDpr);
      canvas.height = Math.floor(h * curDpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(curDpr, 0, 0, curDpr, 0, 0);
    }

    resizeForDPR();

    const particles = Array.from({ length: 120 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 0.6,
      dx: (Math.random() - 0.5) * 0.6,
      dy: (Math.random() - 0.5) * 0.6,
      alpha: Math.random() * 0.6 + 0.25,
    }));

    let rafId = 0;

    function draw() {
      const currentTheme = THEMES[themeRef.current] || THEMES.dark;
      ctx.fillStyle = currentTheme.background;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

        ctx.fillStyle = `${currentTheme.particleColor}${p.alpha})`;
        ctx.shadowBlur = 18;
        ctx.shadowColor = currentTheme.shadowColor;
        ctx.fill();
        ctx.shadowBlur = 0;

        p.x += p.dx;
        p.y += p.dy;

        // wrap around edges for continuous motion
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }

      rafId = requestAnimationFrame(draw);
    }

    draw();

    function handleResize() {
      resizeForDPR();
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-white relative">
      {/* Background canvas - fixed to cover entire page */}
      <canvas id="bgCanvas" className="fixed inset-0 w-full h-full block z-0" />
      
      {/* Header */}
      <header className="backdrop-blur-sm fixed top-0 w-full z-40 bg-white/10 border-b border-gray-800/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-6">
              {/* Logo placeholder */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-800/30 rounded-lg flex items-center justify-center"> 
                  <span className="text-sm font-semibold text-gray-300">PV</span>
                </div>
                <span className="font-semibold text-xl tracking-wide">Polyva</span>
              </div>

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-2">
                <NavDropdown title="Feature">
                  <Link to="/generate" className="block"><DropdownItem title="Text to 3D" subtitle="Generate models from descriptions" imgSrc="https://via.placeholder.com/160x100" /></Link>
                  <Link to="/generate" className="block"><DropdownItem title="Image to 3D" subtitle="Convert 2D into 3D meshes" imgSrc="https://via.placeholder.com/160x100" /></Link>
                  <DropdownItem title="AI Texturing" subtitle="Smart PBR + stylized textures" imgSrc="https://via.placeholder.com/160x100" />
                  <DropdownItem title="Animation" subtitle="Rigging, retargeting, & clips" imgSrc="https://via.placeholder.com/160x100" />
                </NavDropdown>

                <NavDropdown title="Community">
                  <Link to="/showcase" className="block"><DropdownIconItem title="Showcase" imgSrc="https://via.placeholder.com/40" /></Link>
                  <DropdownIconItem title="Discord" imgSrc="https://via.placeholder.com/40" />
                </NavDropdown>

                <NavDropdown title="Resources">
                  <div className="w-full grid grid-cols-2 gap-4 p-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Downloads</h4>
                      <ul className="space-y-2 text-sm">
                        <li>Blender</li>
                        <li>Unity</li>
                        <li>Unreal</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Learn</h4>
                      <ul className="space-y-2 text-sm">
                        <li><Link to="/blogs" className="hover:text-white/90">Blogs</Link></li>
                        <li><Link to="/docs" className="hover:text-white/90">Documentation</Link></li>
                        <li><Link to="/tutorials" className="hover:text-white/90">Tutorials</Link></li>
                        <li><Link to="/help-center" className="hover:text-white/90">Help Center</Link></li>
                      </ul>
                    </div>
                  </div>
                </NavDropdown>

                <a href="#payment" className="px-3 py-2 rounded-md text-sm hover:bg-white/5">Payment</a>
                <a href="#contact" className="px-3 py-2 rounded-md text-sm hover:bg-white/5">Contact</a>
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Theme toggle button */}
              <button 
                aria-label="Toggle theme" 
                onClick={toggleTheme}
                className={`p-2 rounded-full hover:bg-white/10 transition-all duration-300 ${
                  theme === "blue" 
                    ? "bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20" 
                    : "bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20"
                }`}
              >
                {theme === "dark" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>

              {user ? (
                <>
                  {/* My Storage Button - Same style as other nav items */}
                  <Link 
                    to="/my-storage" 
                    className="px-3 py-2 rounded-md text-sm hover:bg-white/5 text-white/90 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    My Storage
                  </Link>

                  {/* User Menu */}
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
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setShowLoginModal(true)} 
                    className="text-sm px-4 py-2 text-gray-200 hover:text-white"
                  >
                    Login
                  </button>
                  <Link to="/signup" className="text-sm px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-400 text-white rounded-lg shadow hover:opacity-90">Sign up</Link>
                </>
              )}

              {/* Mobile hamburger */}
              <button onClick={() => setMobileOpen(v => !v)} className="lg:hidden p-2 rounded-md hover:bg-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-800/20 bg-white/5">
            <div className="px-6 py-4 space-y-3">
              <div>
                <div className="font-semibold mb-2 text-white">Feature</div>
                <div className="space-y-2 text-white/90">
                  <Link to="/generate" className="block py-2 border-b hover:text-white">Text to 3D</Link>
                  <Link to="/generate" className="block py-2 border-b hover:text-white">Image to 3D</Link>
                  <div className="py-2 border-b">AI Texturing</div>
                  <div className="py-2 border-b">Animation</div>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-2 text-white">Community</div>
                <div className="space-y-2 text-white/90">
                  <Link to="/showcase" className="block py-2 border-b hover:text-white">Showcase</Link>
                  <div className="py-2 border-b">Discord</div>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-2 text-white">Resources</div>
                <div className="space-y-2 text-white/90">
                  <Link to="/blogs" className="block py-2 border-b hover:text-white">Blogs</Link>
                  <Link to="/docs" className="block py-2 border-b hover:text-white">Documentation</Link>
                  <Link to="/tutorials" className="block py-2 border-b hover:text-white">Tutorials</Link>
                  <Link to="/help-center" className="block py-2 border-b hover:text-white">Help Center</Link>
                </div>
              </div>
              <a href="#payment" className="block py-2">Payment</a>
              <a href="#contact" className="block py-2">Contact</a>
              <div className="flex gap-3 pt-2">
                {user ? (
                  <>
                    <Link to="/my-storage" className="flex-1 text-center py-2 bg-green-600 text-white rounded-md hover:bg-green-500">My Storage</Link>
                    <button onClick={handleLogout} className="flex-1 text-center py-2 border rounded-md text-red-400 border-red-400 hover:bg-red-500/10">Logout</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setShowLoginModal(true)} className="flex-1 text-center py-2 border rounded-md text-white/90 hover:text-white">Login</button>
                    <Link to="/signup" className="flex-1 text-center py-2 bg-green-600 text-white rounded-md hover:bg-green-500">Sign up</Link>
                  </>
                )}
              </div>
            </div>
          </div>
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
      <main className="relative z-10 pt-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight text-white">Create stunning 3D models with AI — faster, easier, professional.</h1>
              <p className="mt-6 text-lg text-gray-300 max-w-xl">Polyva converts text & images into production-ready 3D assets. Ship faster with AI-assisted pipelines and one-click exports for Blender, Unity, and Unreal.</p>

              <div className="mt-8 flex gap-4">
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  onClick={() => {
                    if (user) {
                      navigate("/generate");
                    } else {
                      setShowLoginModal(true);
                    }
                  }}
                  className="inline-flex items-center gap-3 px-6 py-3 bg-green-500 text-white rounded-lg shadow hover:bg-green-400 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Start Creating
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 px-5 py-3 border border-gray-600 rounded-lg text-white/90 hover:border-gray-400 transition-colors"
                >
                  Explore features
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="rounded-2xl bg-white/5 p-6 shadow-xl">
                <div className="w-full h-80 bg-black/20 rounded-xl flex items-center justify-center">
                  <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 10 }} className="text-gray-400">3D viewer placeholder</motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Feature showcase */}
        <section id="features" className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <h2 className="text-3xl font-semibold mb-10 text-white">Core Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Text to 3D", img: "https://via.placeholder.com/300x180", desc: "Describe any object and generate a 3D model.", path: "/generate" },
              { title: "Image to 3D", img: "https://via.placeholder.com/300x180", desc: "Turn your images into textured meshes.", path: "/generate" },
              { title: "AI Texturing", img: "https://via.placeholder.com/300x180", desc: "Smart maps and PBR-ready UVs." },
              { title: "Animation", img: "https://via.placeholder.com/300x180", desc: "Rigging, retargeting and animation tools." }
            ].map((f, i) => (
              <motion.div key={i} whileHover={{ scale: 1.05 }} className="p-6 bg-white/5 rounded-xl shadow hover:shadow-lg">
                {f.path ? (
                  <Link to={f.path}>
                    <img src={f.img} alt={f.title} className="w-full h-40 object-cover rounded-lg" />
                    <h3 className="mt-4 font-semibold text-lg text-white">{f.title}</h3>
                    <p className="text-sm text-gray-300 mt-2">{f.desc}</p>
                  </Link>
                ) : (
                  <>
                    <img src={f.img} alt={f.title} className="w-full h-40 object-cover rounded-lg" />
                    <h3 className="mt-4 font-semibold text-lg text-white">{f.title}</h3>
                    <p className="text-sm text-gray-300 mt-2">{f.desc}</p>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Showcase Section */}
        <section id="showcase" className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <Link to="/showcase">
            <h2 className="text-3xl font-semibold mb-10 text-white hover:text-white/90">Showcase</h2>
          </Link>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <motion.div key={i} whileHover={{ y: -5 }} className="p-4 bg-white/5 rounded-xl shadow">
                <img src={`https://via.placeholder.com/400x250?text=Model+${i}`} alt="model showcase" className="rounded-lg" />
                <div className="mt-3 font-medium text-white">3D Model {i}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Payment Section */}
        <section id="payment" className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-semibold mb-4 text-white">Pricing & Payment</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white/5 rounded-2xl shadow">
              <h3 className="font-semibold text-lg text-white">Starter</h3>
              <div className="mt-4 text-3xl font-bold text-white">Free</div>
              <ul className="mt-4 text-sm text-gray-300 space-y-2">
                <li>Community access</li>
                <li>Limited exports</li>
              </ul>
              <button className="mt-6 w-full py-2 bg-green-600 text-white rounded-lg">Get started</button>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl shadow border-2 border-white/5">
              <h3 className="font-semibold text-lg text-white">Pro</h3>
              <div className="mt-4 text-3xl font-bold text-white">$19/mo</div>
              <ul className="mt-4 text-sm text-gray-300 space-y-2">
                <li>Unlimited text-to-3D</li>
                <li>Priority renders</li>
              </ul>
              <button className="mt-6 w-full py-2 bg-green-600 text-white rounded-lg">Subscribe</button>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl shadow">
              <h3 className="font-semibold text-lg text-white">Enterprise</h3>
              <div className="mt-4 text-3xl font-bold text-white">Contact</div>
              <ul className="mt-4 text-sm text-gray-300 space-y-2">
                <li>Team seats</li>
                <li>SAML + On-prem</li>
              </ul>
              <button className="mt-6 w-full py-2 border rounded-lg text-white">Contact us</button>
            </div>
          </div>
        </section>

        {/* Resources */}
        <section id="resources" className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-semibold mb-6 text-white">Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/5 rounded-lg shadow">Documentation, downloads, and quickstarts.</div>
            <div className="p-6 bg-white/5 rounded-lg shadow">Tutorials, blogs, and community guides.</div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-semibold mb-6 text-white">Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form className="p-6 bg-white/5 rounded-lg shadow space-y-4">
              <input className="w-full p-3 border rounded bg-transparent text-white/90" placeholder="Name" />
              <input className="w-full p-3 border rounded bg-transparent text-white/90" placeholder="Email" />
              <textarea className="w-full p-3 border rounded bg-transparent text-white/90" placeholder="Message" rows={5} />
              <button className="py-3 px-5 bg-green-600 text-white rounded-lg">Send message</button>
            </form>

            <div className="p-6 bg-white/5 rounded-lg shadow text-gray-300">
              <p className="text-sm">Headquarters: Ho Chi Minh City (example)</p>
              <p className="mt-2 text-sm">Support: support@polyva.example</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800/20 bg-transparent">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 flex items-center justify-between">
            <div className="text-sm text-gray-400">© {new Date().getFullYear()} Polyva — All rights reserved.</div>
            <div className="flex gap-4">
              <a className="text-sm text-gray-300">Privacy</a>
              <a className="text-sm text-gray-300">Terms</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

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

function DropdownItem({ title, subtitle, imgSrc }) {
  return (
    <div className="flex gap-3 p-3 items-center border-b last:border-b-0 hover:bg-white/3">
      <img src={imgSrc} alt="" className="w-20 h-14 rounded-md object-cover bg-gray-800/30" />
      <div>
        <div className="font-medium text-sm text-white">{title}</div>
        <div className="text-xs text-gray-300">{subtitle}</div>
      </div>
    </div>
  );
}

function DropdownIconItem({ title, imgSrc }) {
  return (
    <div className="flex gap-3 p-3 items-center border-b last:border-b-0 hover:bg-white/3">
      <img src={imgSrc} alt="" className="w-8 h-8 rounded-md object-cover bg-gray-800/30" />
      <div className="text-sm text-white">{title}</div>
    </div>
  );
}