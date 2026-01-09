import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Download, 
  Monitor, 
  Apple, 
  Smartphone,
  CheckCircle,
  Shield,
  Zap,
  RefreshCw,
  HardDrive,
  Wifi,
  WifiOff,
  ChevronRight,
  ExternalLink,
  Github,
  Star
} from "lucide-react";
import { LogoIcon } from "../Components/Logo";
import { useTheme } from "../contexts/ThemeContext";

// App version and download info
const APP_VERSION = "1.0.0";
const RELEASE_DATE = "2026-01-09";

const PLATFORMS = [
  {
    id: "windows",
    name: "Windows",
    icon: Monitor,
    description: "Windows 10/11 (64-bit)",
    downloads: [
      {
        type: "installer",
        label: "Installer (.exe)",
        filename: `Polyva-3D-${APP_VERSION}-x64-Setup.exe`,
        size: "~85 MB",
        recommended: true
      },
      {
        type: "portable",
        label: "Portable (.exe)",
        filename: `Polyva-3D-${APP_VERSION}-x64.exe`,
        size: "~80 MB",
        recommended: false
      }
    ]
  },
  {
    id: "macos",
    name: "macOS",
    icon: Apple,
    description: "macOS 11+ (Intel & Apple Silicon)",
    downloads: [
      {
        type: "dmg",
        label: "DMG Installer",
        filename: `Polyva-3D-${APP_VERSION}-arm64.dmg`,
        size: "~90 MB",
        recommended: true
      },
      {
        type: "zip",
        label: "ZIP Archive",
        filename: `Polyva-3D-${APP_VERSION}-arm64.zip`,
        size: "~88 MB",
        recommended: false
      }
    ]
  },
  {
    id: "linux",
    name: "Linux",
    icon: Monitor,
    description: "Ubuntu 20.04+, Fedora 34+",
    downloads: [
      {
        type: "appimage",
        label: "AppImage",
        filename: `Polyva-3D-${APP_VERSION}-x64.AppImage`,
        size: "~95 MB",
        recommended: true
      },
      {
        type: "deb",
        label: "Debian (.deb)",
        filename: `Polyva-3D-${APP_VERSION}-x64.deb`,
        size: "~85 MB",
        recommended: false
      }
    ]
  }
];

const FEATURES = [
  {
    icon: Zap,
    title: "Faster Performance",
    description: "Native GPU acceleration for smoother 3D rendering"
  },
  {
    icon: WifiOff,
    title: "Offline Mode",
    description: "Work without internet (some AI features require connection)"
  },
  {
    icon: RefreshCw,
    title: "Auto Updates",
    description: "Automatically update to the latest version"
  },
  {
    icon: HardDrive,
    title: "Local Storage",
    description: "Store projects directly on your computer"
  },
  {
    icon: Shield,
    title: "Secure",
    description: "Data is secure, not uploaded to cloud"
  },
  {
    icon: Smartphone,
    title: "System Integration",
    description: "Integrate with file explorer, drag & drop"
  }
];

export default function DownloadPage() {
  const { theme } = useTheme();
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [detectedPlatform, setDetectedPlatform] = useState(null);

  // Detect user's platform
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("win")) {
      setDetectedPlatform("windows");
      setSelectedPlatform("windows");
    } else if (userAgent.includes("mac")) {
      setDetectedPlatform("macos");
      setSelectedPlatform("macos");
    } else if (userAgent.includes("linux")) {
      setDetectedPlatform("linux");
      setSelectedPlatform("linux");
    } else {
      setSelectedPlatform("windows");
    }
  }, []);

  const currentTheme = {
    dark: {
      bg: "bg-[#0a0a0a]",
      cardBg: "bg-gray-900/50",
      border: "border-gray-800",
      text: "text-white",
      textSecondary: "text-gray-400",
      textMuted: "text-gray-500",
      accent: "lime",
      accentBg: "bg-lime-500",
      accentText: "text-lime-400",
      accentHover: "hover:bg-lime-400",
      hoverBg: "hover:bg-white/5"
    },
    light: {
      bg: "bg-gray-50",
      cardBg: "bg-white",
      border: "border-gray-200",
      text: "text-gray-900",
      textSecondary: "text-gray-600",
      textMuted: "text-gray-400",
      accent: "cyan",
      accentBg: "bg-cyan-500",
      accentText: "text-cyan-600",
      accentHover: "hover:bg-cyan-400",
      hoverBg: "hover:bg-black/5"
    }
  }[theme];

  const handleDownload = (platform, downloadType) => {
    const platformData = PLATFORMS.find(p => p.id === platform);
    const download = platformData?.downloads.find(d => d.type === downloadType);
    
    if (download) {
     
      const downloadUrl = `https://github.com/polyva/polyva-3d/releases/download/v${APP_VERSION}/${download.filename}`;
      
     
      alert(`Download will start: ${download.filename}\n\nURL: ${downloadUrl}\n\nNote: This is a demo. In production, the file will be downloaded from GitHub Releases.`);
      
    }
  };

  const selectedPlatformData = PLATFORMS.find(p => p.id === selectedPlatform);

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${currentTheme.cardBg} backdrop-blur-xl border-b ${currentTheme.border}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <LogoIcon size={32} theme={theme} />
            <span className="text-xl font-bold">Polyva</span>
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link to="/generate" className={`${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>
              Web App
            </Link>
            <Link to="/docs" className={`${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}>
              Docs
            </Link>
            <a 
              href="https://github.com/polyva/polyva-3d" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex items-center gap-2 ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}
            >
              <Github size={18} />
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${currentTheme.cardBg} border ${currentTheme.border} text-sm`}>
              <Download size={16} className={currentTheme.accentText} />
              Version {APP_VERSION} • Released {RELEASE_DATE}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            Download <span className={currentTheme.accentText}>Polyva 3D</span>
            <br />Desktop App
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-lg ${currentTheme.textSecondary} mb-8 max-w-2xl mx-auto`}
          >
            Experience full features with the desktop app. 
            Better performance, offline work, and deep system integration.
          </motion.p>

          {/* Quick Download Button */}
          {selectedPlatformData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={() => handleDownload(selectedPlatform, selectedPlatformData.downloads[0].type)}
                className={`inline-flex items-center gap-3 px-8 py-4 ${currentTheme.accentBg} text-white rounded-xl font-semibold text-lg ${currentTheme.accentHover} transition-all shadow-lg hover:shadow-xl hover:scale-105`}
              >
                <Download size={24} />
                Download for {selectedPlatformData.name}
                <span className={`text-sm opacity-75`}>
                  ({selectedPlatformData.downloads[0].size})
                </span>
              </button>
              
              {detectedPlatform === selectedPlatform && (
                <p className={`mt-3 text-sm ${currentTheme.textMuted}`}>
                  ✓ Detected: {selectedPlatformData.description}
                </p>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* Platform Selection */}
      <section className={`py-12 px-6 border-y ${currentTheme.border}`}>
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-center text-sm font-medium ${currentTheme.textMuted} mb-6`}>
            AVAILABLE PLATFORMS
          </h2>
          
          <div className="grid grid-cols-3 gap-4">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isSelected = selectedPlatform === platform.id;
              const isDetected = detectedPlatform === platform.id;
              
              return (
                <motion.button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-6 rounded-xl border transition-all ${
                    isSelected 
                      ? `${theme === "dark" ? "border-lime-500 bg-lime-500/10" : "border-cyan-500 bg-cyan-500/10"}`
                      : `${currentTheme.border} ${currentTheme.hoverBg}`
                  }`}
                >
                  {isDetected && (
                    <span className={`absolute top-2 right-2 text-xs ${currentTheme.accentText}`}>
                      Your OS
                    </span>
                  )}
                  
                  <Icon size={32} className={`mx-auto mb-3 ${isSelected ? currentTheme.accentText : currentTheme.textSecondary}`} />
                  <h3 className="font-semibold mb-1">{platform.name}</h3>
                  <p className={`text-sm ${currentTheme.textMuted}`}>{platform.description}</p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Download Options */}
      {selectedPlatformData && (
        <section className="py-12 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">
              Download Options for {selectedPlatformData.name}
            </h2>
            
            <div className="grid gap-4">
              {selectedPlatformData.downloads.map((download) => (
                <motion.div
                  key={download.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center justify-between p-5 rounded-xl ${currentTheme.cardBg} border ${currentTheme.border}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}>
                      <HardDrive size={24} className={currentTheme.accentText} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{download.label}</h3>
                        {download.recommended && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${currentTheme.accentBg} text-white`}>
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${currentTheme.textMuted}`}>
                        {download.filename} • {download.size}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDownload(selectedPlatform, download.type)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
                      download.recommended
                        ? `${currentTheme.accentBg} text-white ${currentTheme.accentHover}`
                        : `${currentTheme.cardBg} border ${currentTheme.border} ${currentTheme.hoverBg}`
                    }`}
                  >
                    <Download size={18} />
                    Download
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Alternative: Web App */}
            <div className={`mt-6 p-5 rounded-xl border ${currentTheme.border} ${currentTheme.hoverBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}>
                    <Wifi size={24} className={currentTheme.textSecondary} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Prefer Web App?</h3>
                    <p className={`text-sm ${currentTheme.textMuted}`}>
                      No installation needed, run directly in your browser
                    </p>
                  </div>
                </div>
                
                <Link
                  to="/generate"
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium ${currentTheme.cardBg} border ${currentTheme.border} ${currentTheme.hoverBg} transition-colors`}
                >
                  Open Web App
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className={`py-16 px-6 ${theme === "dark" ? "bg-gray-900/30" : "bg-gray-100"}`}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            Why Download Desktop App?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-6 rounded-xl ${currentTheme.cardBg} border ${currentTheme.border}`}
                >
                  <div className={`w-12 h-12 rounded-lg ${theme === "dark" ? "bg-lime-500/10" : "bg-cyan-500/10"} flex items-center justify-center mb-4`}>
                    <Icon size={24} className={currentTheme.accentText} />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className={`text-sm ${currentTheme.textSecondary}`}>{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">System Requirements</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {PLATFORMS.map((platform) => (
              <div key={platform.id} className={`p-6 rounded-xl ${currentTheme.cardBg} border ${currentTheme.border}`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <platform.icon size={20} />
                  {platform.name}
                </h3>
                <ul className={`space-y-2 text-sm ${currentTheme.textSecondary}`}>
                  {platform.id === "windows" && (
                    <>
                      <li>• Windows 10 (64-bit) or later</li>
                      <li>• 4GB RAM minimum</li>
                      <li>• 500MB disk space</li>
                      <li>• DirectX 11 compatible GPU</li>
                    </>
                  )}
                  {platform.id === "macos" && (
                    <>
                      <li>• macOS 11 Big Sur or later</li>
                      <li>• Intel or Apple Silicon</li>
                      <li>• 4GB RAM minimum</li>
                      <li>• 500MB disk space</li>
                    </>
                  )}
                  {platform.id === "linux" && (
                    <>
                      <li>• Ubuntu 20.04+ / Fedora 34+</li>
                      <li>• 4GB RAM minimum</li>
                      <li>• 500MB disk space</li>
                      <li>• OpenGL 3.3+ support</li>
                    </>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GitHub Section */}
      <section className={`py-12 px-6 border-t ${currentTheme.border}`}>
        <div className="max-w-4xl mx-auto text-center">
          <a
            href="https://github.com/polyva/polyva-3d/releases"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl ${currentTheme.cardBg} border ${currentTheme.border} ${currentTheme.hoverBg} transition-colors`}
          >
            <Github size={20} />
            <span>View all releases on GitHub</span>
            <ExternalLink size={16} className={currentTheme.textMuted} />
          </a>
          
          <p className={`mt-4 text-sm ${currentTheme.textMuted}`}>
            Open source • MIT License • Star us on GitHub ⭐
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-8 px-6 border-t ${currentTheme.border}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className={`text-sm ${currentTheme.textMuted}`}>
            © 2024-2026 Polyva Team. All rights reserved.
          </p>
          <div className={`flex items-center gap-6 text-sm ${currentTheme.textSecondary}`}>
            <Link to="/docs" className={`hover:${currentTheme.text}`}>Documentation</Link>
            <Link to="/help" className={`hover:${currentTheme.text}`}>Support</Link>
            <a href="https://github.com/polyva/polyva-3d" className={`hover:${currentTheme.text}`}>GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
