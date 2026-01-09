import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ChevronDown, Check, Crown } from "lucide-react";

// Download format options
const DOWNLOAD_FORMATS = [
  { id: "fbx", label: "FBX", description: "Autodesk FBX", pro: false },
  { id: "obj", label: "OBJ", description: "Wavefront OBJ", pro: false },
  { id: "glb", label: "GLB", description: "GL Transmission Format", pro: false, default: true },
  { id: "usdz", label: "USDZ", description: "Apple AR Format", pro: false },
  { id: "stl", label: "STL", description: "3D Printing Format", pro: false },
  { id: "blend", label: "BLEND", description: "Blender Native", pro: true },
  { id: "3mf", label: "3MF", description: "3D Manufacturing", pro: false },
];

export default function DownloadMenu({
  isOpen,
  onClose,
  onDownload,
  anchorRef,
  isPro = false,
  theme = "dark",
  modelName = "model"
}) {
  const [selectedFormat, setSelectedFormat] = useState("glb");
  const menuRef = useRef(null);

  const currentTheme = {
    dark: {
      bg: "bg-gray-900",
      border: "border-gray-700",
      text: "text-white",
      textSecondary: "text-gray-400",
      textMuted: "text-gray-500",
      cardBg: "bg-gray-800",
      accentBg: "bg-lime-500",
      accentColor: "text-lime-400",
      hoverBg: "hover:bg-gray-800"
    },
    light: {
      bg: "bg-white",
      border: "border-gray-200",
      text: "text-gray-900",
      textSecondary: "text-gray-600",
      textMuted: "text-gray-400",
      cardBg: "bg-gray-100",
      accentBg: "bg-cyan-500",
      accentColor: "text-cyan-600",
      hoverBg: "hover:bg-gray-100"
    }
  }[theme];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSelectFormat = (format) => {
    if (format.pro && !isPro) {
      // Show pro upgrade prompt
      alert("This feature requires PRO plan. Please upgrade to use.");
      return;
    }
    setSelectedFormat(format.id);
  };

  const handleDownload = () => {
    const format = DOWNLOAD_FORMATS.find(f => f.id === selectedFormat);
    if (format) {
      onDownload(format.id, modelName);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className={`absolute right-0 bottom-full mb-2 w-56 ${currentTheme.bg} border ${currentTheme.border} rounded-xl shadow-2xl overflow-hidden z-50`}
      >
        {/* Format list */}
        <div className="py-2 max-h-80 overflow-y-auto">
          {DOWNLOAD_FORMATS.map((format) => (
            <button
              key={format.id}
              onClick={() => handleSelectFormat(format)}
              className={`w-full px-4 py-3 flex items-center justify-between ${currentTheme.hoverBg} transition-colors ${
                format.pro && !isPro ? "opacity-60" : ""
              } ${selectedFormat === format.id ? (theme === "dark" ? "bg-lime-500/10" : "bg-cyan-500/10") : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-medium ${currentTheme.text}`}>
                  {format.label.toLowerCase()}
                </span>
                {selectedFormat === format.id && (
                  <Check size={14} className={currentTheme.accentColor} />
                )}
              </div>
              
              {format.pro && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 rounded text-amber-400 text-xs">
                  <Crown size={10} />
                  PRO
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Selected format display */}
        <div className={`px-4 py-3 border-t ${currentTheme.border} flex items-center justify-between`}>
          <span className={`text-sm ${currentTheme.textSecondary}`}>Selected:</span>
          <div className={`flex items-center gap-2 px-3 py-1.5 ${currentTheme.cardBg} rounded-lg`}>
            <span className={`text-sm font-medium ${currentTheme.text}`}>{selectedFormat}</span>
            <ChevronDown size={14} className={currentTheme.textMuted} />
          </div>
        </div>

        {/* Download button */}
        <div className="p-3 border-t border-gray-800/50">
          <button
            onClick={handleDownload}
            className={`w-full py-3 ${currentTheme.accentBg} rounded-xl text-white font-medium ${
              theme === "dark" ? "hover:bg-lime-400" : "hover:bg-cyan-400"
            } transition-colors flex items-center justify-center gap-2`}
          >
            <Download size={18} />
            Download .{selectedFormat}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Dropdown trigger component
export function DownloadButton({ 
  onClick, 
  disabled = false, 
  theme = "dark",
  className = "" 
}) {
  const currentTheme = {
    dark: {
      bg: "bg-lime-500",
      hoverBg: "hover:bg-lime-400",
      shadow: "shadow-lime-500/30"
    },
    light: {
      bg: "bg-cyan-500",
      hoverBg: "hover:bg-cyan-400",
      shadow: "shadow-cyan-500/30"
    }
  }[theme];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2.5 ${currentTheme.bg} rounded-xl text-white ${currentTheme.hoverBg} shadow-lg ${currentTheme.shadow} transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Download Model"
    >
      <Download size={20} />
    </button>
  );
}
