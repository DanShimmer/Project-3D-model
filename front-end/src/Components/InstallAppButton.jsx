import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Check, X, Monitor, Smartphone, Apple, Chrome } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

/**
 * Install App Button Component
 * Shows install prompt for PWA on supported browsers
 */
export default function InstallAppButton({ className = "", variant = "default", theme = "dark" }) {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState(null);

  const currentTheme = {
    dark: {
      bg: "bg-gray-900",
      border: "border-gray-700",
      text: "text-white",
      textSecondary: "text-gray-400",
      cardBg: "bg-gray-800/50",
      accentBg: "bg-lime-500",
      accentColor: "text-lime-400",
      buttonBg: "bg-lime-500 hover:bg-lime-400",
    },
    light: {
      bg: "bg-white",
      border: "border-gray-200",
      text: "text-gray-900",
      textSecondary: "text-gray-600",
      cardBg: "bg-gray-100",
      accentBg: "bg-cyan-500",
      accentColor: "text-cyan-600",
      buttonBg: "bg-cyan-500 hover:bg-cyan-400",
    }
  }[theme];

  const handleInstall = async () => {
    setInstalling(true);
    const result = await installApp();
    setInstallResult(result);
    setInstalling(false);
    
    if (result.success) {
      setTimeout(() => {
        setShowModal(false);
        setInstallResult(null);
      }, 2000);
    }
  };

  // Detect browser and platform
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua);
    const isEdge = /Edge|Edg/.test(ua);
    const isFirefox = /Firefox/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isMac = /Macintosh/.test(ua);
    const isWindows = /Windows/.test(ua);

    return { isChrome, isEdge, isFirefox, isSafari, isIOS, isMac, isWindows };
  };

  const { isChrome, isEdge, isSafari, isIOS, isWindows, isMac } = getBrowserInfo();

  // If already installed, show a check mark
  if (isInstalled) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${currentTheme.cardBg} rounded-lg ${className}`}>
        <Check size={16} className={currentTheme.accentColor} />
        <span className={`text-sm ${currentTheme.textSecondary}`}>App Installed</span>
      </div>
    );
  }

  // Button variants
  const buttonStyles = {
    default: `flex items-center gap-2 px-4 py-2 ${currentTheme.buttonBg} text-white rounded-lg font-medium transition-all`,
    compact: `flex items-center gap-2 px-3 py-1.5 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg text-sm ${currentTheme.text} hover:border-lime-500 transition-all`,
    icon: `p-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg ${currentTheme.text} hover:border-lime-500 transition-all`
  };

  return (
    <>
      {/* Install Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowModal(true)}
        className={`${buttonStyles[variant]} ${className}`}
        title="Install as Desktop App"
      >
        <Download size={variant === "icon" ? 18 : 16} />
        {variant !== "icon" && <span>Install App</span>}
      </motion.button>

      {/* Install Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !installing && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md ${currentTheme.bg} border ${currentTheme.border} rounded-2xl overflow-hidden`}
            >
              {/* Header */}
              <div className={`p-6 border-b ${currentTheme.border}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${currentTheme.accentBg} rounded-xl flex items-center justify-center`}>
                      <Monitor size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className={`text-xl font-bold ${currentTheme.text}`}>Install Polyva 3D</h2>
                      <p className={`text-sm ${currentTheme.textSecondary}`}>Get the desktop experience</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className={`p-2 ${currentTheme.cardBg} rounded-lg hover:bg-red-500/20 transition-colors`}
                  >
                    <X size={20} className={currentTheme.textSecondary} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Success message */}
                {installResult?.success && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-lime-500/20 border border-lime-500/30 rounded-xl mb-4"
                  >
                    <Check size={24} className="text-lime-400" />
                    <div>
                      <p className="font-medium text-lime-400">App Installed!</p>
                      <p className="text-sm text-lime-300">You can now launch Polyva 3D from your desktop</p>
                    </div>
                  </motion.div>
                )}

                {/* Features */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${currentTheme.cardBg} rounded-lg flex items-center justify-center`}>
                      <Monitor size={16} className={currentTheme.accentColor} />
                    </div>
                    <span className={currentTheme.text}>Works offline</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${currentTheme.cardBg} rounded-lg flex items-center justify-center`}>
                      <Download size={16} className={currentTheme.accentColor} />
                    </div>
                    <span className={currentTheme.text}>Faster load times</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${currentTheme.cardBg} rounded-lg flex items-center justify-center`}>
                      <Smartphone size={16} className={currentTheme.accentColor} />
                    </div>
                    <span className={currentTheme.text}>Full-screen experience</span>
                  </div>
                </div>

                {/* Install options based on browser */}
                {isInstallable ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInstall}
                    disabled={installing}
                    className={`w-full py-3 ${currentTheme.buttonBg} text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50`}
                  >
                    {installing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Download size={18} />
                        </motion.div>
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Install Now
                      </>
                    )}
                  </motion.button>
                ) : (
                  <div className="space-y-4">
                    <p className={`text-sm ${currentTheme.textSecondary} text-center`}>
                      Manual installation instructions:
                    </p>
                    
                    {/* Chrome/Edge instructions */}
                    {(isChrome || isEdge) && (
                      <div className={`p-4 ${currentTheme.cardBg} rounded-xl`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Chrome size={18} className={currentTheme.accentColor} />
                          <span className={`font-medium ${currentTheme.text}`}>
                            {isChrome ? 'Chrome' : 'Edge'}
                          </span>
                        </div>
                        <ol className={`text-sm ${currentTheme.textSecondary} space-y-1 list-decimal list-inside`}>
                          <li>Click the <strong>⋮</strong> menu (top right)</li>
                          <li>Select <strong>"Install Polyva 3D..."</strong></li>
                          <li>Click <strong>Install</strong> in the popup</li>
                        </ol>
                      </div>
                    )}

                    {/* Safari/iOS instructions */}
                    {(isSafari || isIOS) && (
                      <div className={`p-4 ${currentTheme.cardBg} rounded-xl`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Apple size={18} className={currentTheme.accentColor} />
                          <span className={`font-medium ${currentTheme.text}`}>Safari</span>
                        </div>
                        <ol className={`text-sm ${currentTheme.textSecondary} space-y-1 list-decimal list-inside`}>
                          <li>Tap the <strong>Share</strong> button</li>
                          <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                          <li>Tap <strong>Add</strong></li>
                        </ol>
                      </div>
                    )}

                    {/* Generic instructions */}
                    {!isChrome && !isEdge && !isSafari && !isIOS && (
                      <div className={`p-4 ${currentTheme.cardBg} rounded-xl`}>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>
                          Look for the <strong>install</strong> icon in your browser's address bar,
                          or use your browser's menu to install this app.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
