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
  RotateCcw,
  Wand2,
  Droplets,
  CircleDot,
  Eye
} from "lucide-react";

// Texture styles with icons only
const TEXTURE_STYLES = [
  { id: "realistic", icon: Camera, tooltip: "Realistic" },
  { id: "stylized", icon: Paintbrush, tooltip: "Stylized" },
  { id: "pbr", icon: Layers, tooltip: "PBR" },
  { id: "hand-painted", icon: Brush, tooltip: "Hand-painted" }
];

// AI texture options
const AI_OPTIONS = [
  { id: "auto-color", label: "Auto Color", icon: Palette, description: "AI colors the model based on its shape" },
  { id: "shadows", label: "Shadows", icon: Droplets, description: "Add realistic shadow and ambient occlusion" },
  { id: "depth", label: "Depth", icon: Layers, description: "Add depth and volume to surfaces" },
  { id: "detail", label: "Details", icon: CircleDot, description: "Enhance surface details and micro-textures" }
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

// Two tab modes
const TEXTURE_TABS = [
  { id: "manual", label: "Manual Paint", icon: Brush },
  { id: "ai", label: "AI Texture", icon: Wand2 }
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
  onClearPaint,
  isPaintMode = false,
  setIsPaintMode,
  selectedPaintColor,
  setSelectedPaintColor,
  brushSize: propBrushSize,
  setBrushSize: propSetBrushSize
}) {
  const [localBrightness, setLocalBrightness] = useState(brightness);
  const [selectedColor, setSelectedColor] = useState(selectedPaintColor || "#4caf50");
  const [brushSize, setBrushSize] = useState(propBrushSize || 50);
  const [activeTab, setActiveTab] = useState("manual"); // "manual" or "ai"
  const [selectedAIOptions, setSelectedAIOptions] = useState(["auto-color"]);

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
    if (setSelectedPaintColor) {
      setSelectedPaintColor(color);
    }
    // Enable paint mode when selecting a color
    if (setIsPaintMode) {
      setIsPaintMode(true);
    }
  };

  const handleBrushSizeChange = (value) => {
    setBrushSize(value);
    if (propSetBrushSize) {
      propSetBrushSize(value);
    }
  };

  const handleExitPaintMode = () => {
    if (setIsPaintMode) {
      setIsPaintMode(false);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    // Exit paint mode when switching to AI tab
    if (tab === "ai" && setIsPaintMode) {
      setIsPaintMode(false);
    }
  };

  const toggleAIOption = (optionId) => {
    setSelectedAIOptions(prev => 
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
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

      {/* Tab Switcher - Manual Paint / AI Texture */}
      <div className={`px-4 pt-3 pb-1`}>
        <div className={`flex gap-1 p-1 ${currentTheme.cardBg} rounded-xl`}>
          {TEXTURE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? `${currentTheme.accentBg} text-white shadow-lg`
                    : `${currentTheme.hoverBg} ${currentTheme.textSecondary}`
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
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

        {/* Texture applied status */}
        {isTextured && (
          <div className={`flex items-center gap-2 px-3 py-2 ${theme === "dark" ? "bg-lime-900/30" : "bg-cyan-100"} rounded-lg`}>
            <Check size={16} className={currentTheme.accentColor} />
            <span className={`text-sm ${currentTheme.accentColor}`}>Texture applied</span>
          </div>
        )}

        {/* ======================== MANUAL PAINT TAB ======================== */}
        {activeTab === "manual" && (
          <div className="space-y-4">
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
              
              {/* Paint Mode Indicator */}
              {isPaintMode && (
                <div className={`mb-3 flex items-center justify-between px-3 py-2 ${theme === "dark" ? "bg-lime-900/30 border-lime-500/30" : "bg-cyan-100 border-cyan-300"} border rounded-lg`}>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Brush size={16} className={currentTheme.accentColor} />
                      <div 
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-900"
                        style={{ backgroundColor: selectedColor }}
                      />
                    </div>
                    <span className={`text-xs ${currentTheme.accentColor}`}>Brush Active — Hold & Drag on model</span>
                  </div>
                  <button
                    onClick={handleExitPaintMode}
                    className={`text-xs px-2 py-1 ${currentTheme.hoverBg} rounded transition-colors ${currentTheme.textSecondary}`}
                  >
                    Exit
                  </button>
                </div>
              )}
              
              {/* Color grid */}
              <div className="grid grid-cols-9 gap-1">
                {COLOR_PALETTE.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => handleColorSelect(color)}
                    title={color}
                    className={`w-full aspect-square rounded transition-all hover:scale-110 ${
                      selectedColor === color && isPaintMode
                        ? "ring-2 ring-white ring-offset-1 ring-offset-gray-900 scale-110" 
                        : selectedColor === color
                        ? "ring-2 ring-white/50 ring-offset-1 ring-offset-gray-900"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Paint instruction */}
              <div className={`mt-3 flex items-center gap-2 text-xs ${currentTheme.textMuted}`}>
                <Brush size={14} />
                <span>{isPaintMode ? "Hold left mouse & drag on model to paint" : "Select a color to activate brush"}</span>
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
                onChange={(e) => handleBrushSizeChange(parseInt(e.target.value))}
                className={`w-full h-2 ${currentTheme.sliderTrack} rounded-full appearance-none cursor-pointer`}
                style={{
                  background: `linear-gradient(to right, ${theme === "dark" ? "#84cc16" : "#06b6d4"} 0%, ${theme === "dark" ? "#84cc16" : "#06b6d4"} ${brushSize}%, ${theme === "dark" ? "#374151" : "#d1d5db"} ${brushSize}%, ${theme === "dark" ? "#374151" : "#d1d5db"} 100%)`
                }}
              />
              {/* Brush preview */}
              <div className="flex items-center justify-center mt-3">
                <div 
                  className="rounded-full border-2 transition-all"
                  style={{ 
                    width: `${Math.max(12, brushSize * 0.4)}px`, 
                    height: `${Math.max(12, brushSize * 0.4)}px`,
                    backgroundColor: selectedColor,
                    borderColor: theme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"
                  }}
                />
              </div>
            </div>

            {/* Visual Controls — always available */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4 space-y-3`}>
              <h3 className={`text-sm font-medium ${currentTheme.text}`}>Display</h3>
              
              {/* Brightness */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Sun size={14} className={currentTheme.textSecondary} />
                    <span className={`text-xs ${currentTheme.text}`}>Brightness</span>
                  </div>
                  <span className={`text-xs ${currentTheme.textSecondary}`}>{localBrightness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={localBrightness}
                  onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
                  className={`w-full h-1.5 ${currentTheme.sliderTrack} rounded-full appearance-none cursor-pointer`}
                  style={{
                    background: `linear-gradient(to right, ${theme === "dark" ? "#84cc16" : "#06b6d4"} 0%, ${theme === "dark" ? "#84cc16" : "#06b6d4"} ${localBrightness / 2}%, ${theme === "dark" ? "#374151" : "#d1d5db"} ${localBrightness / 2}%, ${theme === "dark" ? "#374151" : "#d1d5db"} 100%)`
                  }}
                />
              </div>

              {/* Wireframe toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid3X3 size={14} className={currentTheme.textSecondary} />
                  <span className={`text-xs ${currentTheme.text}`}>Wireframe</span>
                </div>
                <button
                  onClick={onToggleWireframe}
                  className={`relative w-9 h-4.5 rounded-full transition-colors ${
                    isWireframeEnabled ? currentTheme.accentBg : currentTheme.sliderTrack
                  }`}
                  style={{ width: 36, height: 20 }}
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

        {/* ======================== AI TEXTURE TAB ======================== */}
        {activeTab === "ai" && (
          <div className="space-y-4">
            {/* Texture Style */}
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
                      className={`flex-1 p-3 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
                        textureStyle === style.id
                          ? `${currentTheme.accentBorder} ${theme === "dark" ? "bg-lime-900/30" : "bg-cyan-100"}`
                          : `${currentTheme.border} ${currentTheme.hoverBg}`
                      }`}
                    >
                      <Icon 
                        size={20} 
                        className={textureStyle === style.id ? currentTheme.accentColor : currentTheme.textSecondary} 
                      />
                      <span className={`text-[10px] ${textureStyle === style.id ? currentTheme.accentColor : currentTheme.textMuted}`}>
                        {style.tooltip}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Options */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <h3 className={`text-sm font-medium mb-3 ${currentTheme.text}`}>AI Options</h3>
              <div className="space-y-2">
                {AI_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedAIOptions.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleAIOption(option.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isSelected
                          ? `${currentTheme.accentBorder} ${theme === "dark" ? "bg-lime-900/20" : "bg-cyan-50"}`
                          : `${currentTheme.border} ${currentTheme.hoverBg}`
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${isSelected ? (theme === "dark" ? "bg-lime-500/20" : "bg-cyan-100") : currentTheme.cardBg}`}>
                        <Icon size={16} className={isSelected ? currentTheme.accentColor : currentTheme.textSecondary} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`text-sm font-medium ${isSelected ? currentTheme.accentColor : currentTheme.text}`}>
                          {option.label}
                        </div>
                        <div className={`text-xs ${currentTheme.textMuted}`}>
                          {option.description}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        isSelected 
                          ? `${currentTheme.accentBg} border-transparent` 
                          : currentTheme.border
                      }`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PBR Shading toggle */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={16} className={currentTheme.textSecondary} />
                  <span className={`text-sm font-medium ${currentTheme.text}`}>PBR Shading</span>
                </div>
                <button
                  onClick={onTogglePBR}
                  className={`relative rounded-full transition-colors ${
                    isPBREnabled ? currentTheme.accentBg : currentTheme.sliderTrack
                  }`}
                  style={{ width: 36, height: 20 }}
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
                  <Sun size={16} className={currentTheme.textSecondary} />
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
                  <Grid3X3 size={16} className={currentTheme.textSecondary} />
                  <span className={`text-sm font-medium ${currentTheme.text}`}>Wireframe</span>
                </div>
                <button
                  onClick={onToggleWireframe}
                  className={`relative rounded-full transition-colors ${
                    isWireframeEnabled ? currentTheme.accentBg : currentTheme.sliderTrack
                  }`}
                  style={{ width: 36, height: 20 }}
                >
                  <motion.div
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
                    animate={{ left: isWireframeEnabled ? "calc(100% - 18px)" : "2px" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>

            {/* Apply AI Texture Button */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <button
                onClick={() => onApplyTexture?.({ textureStyle, aiOptions: selectedAIOptions, mode: "ai" })}
                disabled={isProcessing || selectedAIOptions.length === 0}
                className={`w-full py-3 ${currentTheme.accentBg} rounded-xl text-white font-medium ${
                  theme === "dark" ? "hover:bg-lime-400" : "hover:bg-cyan-400"
                } transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    AI Processing...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Apply AI Texture
                  </>
                )}
              </button>
              <p className={`text-xs ${currentTheme.textMuted} mt-2 text-center`}>
                {selectedAIOptions.length} option{selectedAIOptions.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className={`p-4 border-t ${currentTheme.border}`}>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onDownload}
            className={`py-2 ${currentTheme.accentBg} rounded-lg text-white text-sm font-medium ${
              theme === "dark" ? "hover:bg-lime-400" : "hover:bg-cyan-400"
            } transition-colors flex items-center justify-center gap-1`}
            title="Download"
          >
            <Download size={14} />
          </button>
          <button
            onClick={onRetexture}
            disabled={isProcessing}
            className={`py-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg ${currentTheme.textSecondary} ${currentTheme.hoverBg} transition-colors flex items-center justify-center gap-1 disabled:opacity-50`}
            title="Reset texture"
          >
            <Palette size={14} />
          </button>
          <button
            onClick={() => window.location.reload()}
            className={`py-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg ${currentTheme.textSecondary} ${currentTheme.hoverBg} transition-colors flex items-center justify-center gap-1`}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
