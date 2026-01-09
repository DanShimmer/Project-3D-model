import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Palette, 
  Loader2, 
  Sun, 
  Layers, 
  Grid3X3,
  RefreshCw,
  Download,
  Check,
  Sparkles,
  Cpu,
  Zap,
  Camera,
  Paintbrush,
  Brush,
  RotateCcw
} from "lucide-react";

// Texture styles with icons only
const TEXTURE_STYLES = [
  { id: "realistic", icon: Camera, tooltip: "Realistic" },
  { id: "stylized", icon: Paintbrush, tooltip: "Stylized" },
  { id: "pbr", icon: Layers, tooltip: "PBR" },
  { id: "hand-painted", icon: Brush, tooltip: "Hand-painted" }
];

// Color palette for painting
const COLOR_PALETTE = [
  // Row 1 - Grays
  "#ffffff", "#f5f5f5", "#e0e0e0", "#bdbdbd", "#9e9e9e", "#757575", "#424242", "#212121", "#000000",
  // Row 2 - Reds
  "#ffebee", "#ffcdd2", "#ef9a9a", "#e57373", "#ef5350", "#f44336", "#e53935", "#d32f2f", "#b71c1c",
  // Row 3 - Orange
  "#fff3e0", "#ffe0b2", "#ffcc80", "#ffb74d", "#ffa726", "#ff9800", "#fb8c00", "#f57c00", "#e65100",
  // Row 4 - Yellow
  "#fffde7", "#fff9c4", "#fff59d", "#fff176", "#ffee58", "#ffeb3b", "#fdd835", "#fbc02d", "#f9a825",
  // Row 5 - Green
  "#e8f5e9", "#c8e6c9", "#a5d6a7", "#81c784", "#66bb6a", "#4caf50", "#43a047", "#388e3c", "#2e7d32",
  // Row 6 - Cyan
  "#e0f7fa", "#b2ebf2", "#80deea", "#4dd0e1", "#26c6da", "#00bcd4", "#00acc1", "#0097a7", "#00838f",
  // Row 7 - Blue
  "#e3f2fd", "#bbdefb", "#90caf9", "#64b5f6", "#42a5f5", "#2196f3", "#1e88e5", "#1976d2", "#1565c0",
  // Row 8 - Purple
  "#f3e5f5", "#e1bee7", "#ce93d8", "#ba68c8", "#ab47bc", "#9c27b0", "#8e24aa", "#7b1fa2", "#6a1b9a",
  // Row 9 - Pink
  "#fce4ec", "#f8bbd9", "#f48fb1", "#f06292", "#ec407a", "#e91e63", "#d81b60", "#c2185b", "#ad1457",
];

export default function TexturingPanel({
  isOpen,
  onClose,
  onApplyTexture,
  onTogglePBR,
  onToggleWireframe,
  onBrightnessChange,
  onRetexture,
  onDownload,
  isPBREnabled = false,
  isWireframeEnabled = false,
  brightness = 100,
  isProcessing = false,
  isTextured = false,
  currentTopology = "triangle",
  theme = "dark",
  textureStyle = "realistic",
  setTextureStyle,
  gpuEnabled = false,
  onColorPaint,
  paintedColors = {},
  onClearPaint
}) {
  const [localBrightness, setLocalBrightness] = useState(brightness);
  const [selectedColor, setSelectedColor] = useState("#4caf50");
  const [brushSize, setBrushSize] = useState(50);

  const currentTheme = {
    dark: {
      bg: "bg-gray-900",
      border: "border-gray-700",
      text: "text-white",
      textSecondary: "text-gray-400",
      textMuted: "text-gray-500",
      cardBg: "bg-gray-800/50",
      accentBg: "bg-lime-500",
      accentColor: "text-lime-400",
      accentBorder: "border-lime-500",
      hoverBg: "hover:bg-white/5",
      sliderTrack: "bg-gray-700",
      sliderThumb: "bg-lime-500"
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
      accentBorder: "border-cyan-500",
      hoverBg: "hover:bg-black/5",
      sliderTrack: "bg-gray-300",
      sliderThumb: "bg-cyan-500"
    }
  }[theme];

  const handleBrightnessChange = (value) => {
    setLocalBrightness(value);
    onBrightnessChange?.(value);
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className={`fixed right-0 top-14 bottom-0 w-80 ${currentTheme.bg} border-l ${currentTheme.border} z-40 flex flex-col shadow-2xl`}
    >
      {/* Header */}
      <div className={`p-4 border-b ${currentTheme.border} flex items-center justify-between`}>
        <h2 className={`text-lg font-semibold flex items-center gap-2 ${currentTheme.text}`}>
          <Palette className={currentTheme.accentColor} size={20} />
          Texturing
        </h2>
        <button
          onClick={onClose}
          className={`p-2 ${currentTheme.hoverBg} rounded-lg transition-colors`}
        >
          <X size={20} className={currentTheme.textSecondary} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* GPU Status */}
        <div className={`flex items-center gap-2 px-3 py-2 ${gpuEnabled ? (theme === "dark" ? "bg-lime-900/30" : "bg-cyan-100") : "bg-gray-800/50"} rounded-lg`}>
          {gpuEnabled ? (
            <>
              <Zap size={16} className={currentTheme.accentColor} />
              <span className={`text-xs ${currentTheme.accentColor}`}>GPU Mode</span>
            </>
          ) : (
            <>
              <Cpu size={16} className={currentTheme.textMuted} />
              <span className={`text-xs ${currentTheme.textMuted}`}>Demo Mode</span>
            </>
          )}
        </div>

        {!isTextured ? (
          /* Apply Texture Section */
          <div className="space-y-4">
            {/* Texture Style - Icons only */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <h3 className={`text-sm font-medium mb-3 ${currentTheme.text}`}>Style</h3>
              <div className="flex gap-2">
                {TEXTURE_STYLES.map((style) => {
                  const Icon = style.icon;
                  return (
                    <button
                      key={style.id}
                      onClick={() => setTextureStyle?.(style.id)}
                      title={style.tooltip}
                      className={`flex-1 p-3 rounded-lg border transition-all flex items-center justify-center ${
                        textureStyle === style.id
                          ? `${currentTheme.accentBorder} ${theme === "dark" ? "bg-lime-900/30" : "bg-cyan-100"}`
                          : `${currentTheme.border} ${currentTheme.hoverBg}`
                      }`}
                    >
                      <Icon 
                        size={20} 
                        className={textureStyle === style.id ? currentTheme.accentColor : currentTheme.textSecondary} 
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Palette */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-medium ${currentTheme.text}`}>Paint Color</h3>
                <div className="flex items-center gap-2">
                  {/* Current color preview */}
                  <div 
                    className="w-6 h-6 rounded-lg border-2 border-white/30 shadow-inner"
                    style={{ backgroundColor: selectedColor }}
                  />
                  {/* Clear paint button */}
                  <button
                    onClick={onClearPaint}
                    title="Clear all paint"
                    className={`p-1.5 ${currentTheme.hoverBg} rounded-lg transition-colors`}
                  >
                    <RotateCcw size={14} className={currentTheme.textMuted} />
                  </button>
                </div>
              </div>
              
              {/* Color grid */}
              <div className="grid grid-cols-9 gap-1">
                {COLOR_PALETTE.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => handleColorSelect(color)}
                    className={`w-full aspect-square rounded transition-all hover:scale-110 ${
                      selectedColor === color 
                        ? "ring-2 ring-white ring-offset-1 ring-offset-gray-900" 
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Paint instruction */}
              <div className={`mt-3 flex items-center gap-2 text-xs ${currentTheme.textMuted}`}>
                <Brush size={14} />
                <span>Click & drag on model to paint</span>
              </div>
            </div>

            {/* Brush Size */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Paintbrush size={16} className={currentTheme.textSecondary} />
                  <span className={`text-sm font-medium ${currentTheme.text}`}>Brush Size</span>
                </div>
                <span className={`text-xs ${currentTheme.textSecondary}`}>{brushSize}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className={`w-full h-2 ${currentTheme.sliderTrack} rounded-full appearance-none cursor-pointer`}
                style={{
                  background: `linear-gradient(to right, ${theme === "dark" ? "#84cc16" : "#06b6d4"} 0%, ${theme === "dark" ? "#84cc16" : "#06b6d4"} ${brushSize}%, ${theme === "dark" ? "#374151" : "#d1d5db"} ${brushSize}%, ${theme === "dark" ? "#374151" : "#d1d5db"} 100%)`
                }}
              />
            </div>

            {/* Apply Button */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <button
                onClick={() => onApplyTexture?.({ selectedColor, brushSize, textureStyle })}
                disabled={isProcessing}
                className={`w-full py-3 ${currentTheme.accentBg} rounded-xl text-white font-medium ${
                  theme === "dark" ? "hover:bg-lime-400" : "hover:bg-cyan-400"
                } transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Apply Texture
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Texture Controls - After texturing */
          <div className="space-y-4">
            {/* Status */}
            <div className={`flex items-center gap-2 px-3 py-2 ${theme === "dark" ? "bg-lime-900/30" : "bg-cyan-100"} rounded-lg`}>
              <Check size={16} className={currentTheme.accentColor} />
              <span className={`text-sm ${currentTheme.accentColor}`}>Texture applied</span>
            </div>

            {/* PBR Toggle */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={18} className={currentTheme.textSecondary} />
                  <span className={`text-sm font-medium ${currentTheme.text}`}>PBR Shading</span>
                </div>
                <button
                  onClick={onTogglePBR}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    isPBREnabled ? currentTheme.accentBg : currentTheme.sliderTrack
                  }`}
                >
                  <motion.div
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
                    animate={{ left: isPBREnabled ? "calc(100% - 18px)" : "2px" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>

            {/* Brightness */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sun size={18} className={currentTheme.textSecondary} />
                  <span className={`text-sm font-medium ${currentTheme.text}`}>Brightness</span>
                </div>
                <span className={`text-xs ${currentTheme.textSecondary}`}>{localBrightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={localBrightness}
                onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
                className={`w-full h-2 ${currentTheme.sliderTrack} rounded-full appearance-none cursor-pointer`}
                style={{
                  background: `linear-gradient(to right, ${theme === "dark" ? "#84cc16" : "#06b6d4"} 0%, ${theme === "dark" ? "#84cc16" : "#06b6d4"} ${localBrightness / 2}%, ${theme === "dark" ? "#374151" : "#d1d5db"} ${localBrightness / 2}%, ${theme === "dark" ? "#374151" : "#d1d5db"} 100%)`
                }}
              />
            </div>

            {/* Wireframe */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid3X3 size={18} className={currentTheme.textSecondary} />
                  <span className={`text-sm font-medium ${currentTheme.text}`}>Wireframe</span>
                </div>
                <button
                  onClick={onToggleWireframe}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    isWireframeEnabled ? currentTheme.accentBg : currentTheme.sliderTrack
                  }`}
                >
                  <motion.div
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
                    animate={{ left: isWireframeEnabled ? "calc(100% - 18px)" : "2px" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {isTextured && (
        <div className={`p-4 border-t ${currentTheme.border}`}>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onDownload}
              className={`py-2 ${currentTheme.accentBg} rounded-lg text-white text-sm font-medium ${
                theme === "dark" ? "hover:bg-lime-400" : "hover:bg-cyan-400"
              } transition-colors flex items-center justify-center gap-1`}
            >
              <Download size={14} />
            </button>
            <button
              onClick={onRetexture}
              disabled={isProcessing}
              className={`py-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg ${currentTheme.textSecondary} ${currentTheme.hoverBg} transition-colors flex items-center justify-center gap-1 disabled:opacity-50`}
            >
              <Palette size={14} />
            </button>
            <button
              onClick={() => window.location.reload()}
              className={`py-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg ${currentTheme.textSecondary} ${currentTheme.hoverBg} transition-colors flex items-center justify-center gap-1`}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
