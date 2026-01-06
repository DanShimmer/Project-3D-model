import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { LogoIcon } from "./Logo";
import { Sun, Moon } from "lucide-react";

/**
 * PageWrapper - A consistent wrapper for all pages
 * 
 * Features:
 * - Dark background for both themes (fixes light theme text visibility)
 * - Optional animated particle canvas background
 * - Standard header with logo, navigation, and theme toggle
 * - Consistent styling using ThemeContext
 * 
 * Usage:
 * <PageWrapper showCanvas={true} showHeader={true}>
 *   <YourPageContent />
 * </PageWrapper>
 */
export default function PageWrapper({ 
  children, 
  showCanvas = true, 
  showHeader = true,
  className = "",
  canvasId = "pageBgCanvas"
}) {
  const { theme, currentTheme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const canvasRef = useRef(null);

  // Canvas background animation
  useEffect(() => {
    if (!showCanvas) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    let animationId;

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

    // Create particles
    const particles = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    // Theme-based particle color (lime for dark, cyan for light)
    const getParticleColor = () => theme === 'dark' ? "120,255,100" : "6,182,212";

    function draw() {
      // ALWAYS use dark background regardless of theme
      ctx.fillStyle = "#04060A";
      ctx.fillRect(0, 0, w, h);

      const particleColor = getParticleColor();
      
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particleColor},${p.alpha})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(${particleColor},0.9)`;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Move particles
        p.x += p.dx;
        p.y += p.dy;
        
        // Wrap around screen
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }
      
      animationId = requestAnimationFrame(draw);
    }
    draw();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [showCanvas, theme]);

  return (
    <div className={`min-h-screen bg-[#0a0a0a] ${currentTheme.text} relative ${className}`}>
      {/* Canvas Background */}
      {showCanvas && (
        <canvas 
          ref={canvasRef}
          id={canvasId} 
          className="fixed inset-0 w-full h-full -z-10" 
        />
      )}

      {/* Header */}
      {showHeader && (
        <header className={`backdrop-blur-sm fixed top-0 w-full z-40 ${currentTheme.navBg} border-b ${currentTheme.border}`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-3">
                <LogoIcon size={36} />
                <span className="font-semibold text-xl">Polyva</span>
              </Link>

              {/* Right Side */}
              <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg ${currentTheme.buttonSecondary} transition-colors`}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-cyan-400" />
                  )}
                </button>

                {/* User Actions */}
                {isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <Link
                      to="/generate"
                      className={`px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.accentGradient} text-white font-medium hover:opacity-90 transition-opacity`}
                    >
                      Create
                    </Link>
                    {!isAdmin && (
                      <Link
                        to="/my-storage"
                        className={`px-4 py-2 rounded-lg ${currentTheme.buttonSecondary}`}
                      >
                        My Storage
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      to="/login"
                      className={`px-4 py-2 rounded-lg ${currentTheme.buttonSecondary}`}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className={`px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.accentGradient} text-white font-medium hover:opacity-90 transition-opacity`}
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={showHeader ? "pt-16" : ""}>
        {children}
      </main>
    </div>
  );
}

/**
 * Export theme-safe background class for use in other components
 * ALWAYS use this instead of theme-conditional backgrounds
 */
export const SAFE_BG = "bg-[#0a0a0a]";
export const SAFE_BG_RAW = "#0a0a0a";
export const SAFE_CANVAS_BG = "#04060A";
