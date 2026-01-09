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
  Zap
} from "lucide-react";

const TEXTURE_STYLES = [
  { id: "realistic", label: "Realistic", desc: "Photorealistic textures" },
  { id: "stylized", label: "Stylized", desc: "Artistic/cartoon style" },
  { id: "pbr", label: "PBR", desc: "Physically based rendering" },
  { id: "hand-painted", label: "Hand-painted", desc: "Hand-painted look" }
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
  texturePrompt = "",
  setTexturePrompt,
  textureStyle = "realistic",
  setTextureStyle,
  gpuEnabled = false
}) {
  const [localBrightness, setLocalBrightness] = useState(brightness);

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
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* GPU Status Indicator */}
        <div className={`flex items-center gap-2 px-3 py-2 ${gpuEnabled ? (theme === "dark" ? "bg-lime-900/30" : "bg-cyan-100") : "bg-gray-800/50"} rounded-lg`}>
          {gpuEnabled ? (
            <>
              <Zap size={16} className={currentTheme.accentColor} />
              <span className={`text-sm ${currentTheme.accentColor}`}>GPU Mode - Full AI rendering</span>
            </>
          ) : (
            <>
              <Cpu size={16} className={currentTheme.textMuted} />
              <span className={`text-sm ${currentTheme.textMuted}`}>Demo Mode - Connect GPU for full features</span>
            </>
          )}
        </div>

        {!isTextured ? (
          /* Apply Texture Section */
          <div className="space-y-4">
            {/* Texture Prompt Input */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <h3 className={`font-medium mb-2 ${currentTheme.text}`}>Texture Prompt (Optional)</h3>
              <textarea
                value={texturePrompt}
                onChange={(e) => setTexturePrompt?.(e.target.value)}
                placeholder="Describe the texture style... e.g., 'weathered metal with rust', 'smooth ceramic glaze'"
                className={`w-full px-3 py-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-lg text-sm ${currentTheme.text} placeholder:${currentTheme.textMuted} focus:outline-none focus:ring-2 focus:ring-lime-500/50 resize-none`}
                rows={3}
              />
            </div>

            {/* Texture Style Selection */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <h3 className={`font-medium mb-3 ${currentTheme.text}`}>Texture Style</h3>
              <div className="grid grid-cols-2 gap-2">
                {TEXTURE_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setTextureStyle?.(style.id)}
                    className={`p-3 rounded-lg border transition-all ${
                      textureStyle === style.id
                        ? `${currentTheme.accentBorder} ${theme === "dark" ? "bg-lime-900/30" : "bg-cyan-100"}`
                        : `${currentTheme.border} ${currentTheme.hoverBg}`
                    }`}
                  >
                    <div className={`text-sm font-medium ${textureStyle === style.id ? currentTheme.accentColor : currentTheme.text}`}>
                      {style.label}
                    </div>
                    <div className={`text-xs ${currentTheme.textMuted} mt-1`}>
                      {style.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Apply Button */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <h3 className={`font-medium mb-2 ${currentTheme.text}`}>AI Auto Texture</h3>
              <p className={`text-sm ${currentTheme.textMuted} mb-4`}>
                {gpuEnabled 
                  ? "AI sẽ tạo texture chất lượng cao dựa trên prompt và style của bạn."
                  : "Demo mode: AI sẽ mô phỏng quá trình texturing."
                }
              </p>
              <button
                onClick={onApplyTexture}
                disabled={isProcessing}
                className={`w-full py-3 ${currentTheme.accentBg} rounded-xl text-white font-medium ${
                  theme === "dark" ? "hover:bg-lime-400" : "hover:bg-cyan-400"
                } transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    {gpuEnabled ? "AI đang xử lý..." : "Đang mô phỏng..."}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Apply Texture
                  </>
                )}
              </button>
            </div>

            <div className={`text-xs ${currentTheme.textMuted} text-center`}>
              {gpuEnabled ? "Texture sẽ được tạo bằng AI" : "Demo mode - texture mô phỏng"}
            </div>
          </div>
        ) : (
          /* Texture Controls - After texturing */
          <div className="space-y-6">
            {/* Status */}
            <div className={`flex items-center gap-2 px-3 py-2 ${theme === "dark" ? "bg-lime-900/30" : "bg-cyan-100"} rounded-lg`}>
              <Check size={16} className={currentTheme.accentColor} />
              <span className={`text-sm ${currentTheme.accentColor}`}>Texture đã được áp dụng</span>
            </div>

            {/* PBR Toggle */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers size={18} className={currentTheme.textSecondary} />
                  <span className={`font-medium ${currentTheme.text}`}>PBR Shading</span>
                </div>
                <button
                  onClick={onTogglePBR}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isPBREnabled ? currentTheme.accentBg : currentTheme.sliderTrack
                  }`}
                >
                  <motion.div
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    animate={{ left: isPBREnabled ? "calc(100% - 20px)" : "4px" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
              <p className={`text-xs ${currentTheme.textMuted}`}>
                Bật để thêm hiệu ứng đổ bóng PBR realistic
              </p>
            </div>

            {/* Brightness Control */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sun size={18} className={currentTheme.textSecondary} />
                  <span className={`font-medium ${currentTheme.text}`}>Brightness</span>
                </div>
                <span className={`text-sm ${currentTheme.textSecondary}`}>{localBrightness}%</span>
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

            {/* Wireframe Toggle */}
            <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Grid3X3 size={18} className={currentTheme.textSecondary} />
                  <span className={`font-medium ${currentTheme.text}`}>Wireframe</span>
                </div>
                <button
                  onClick={onToggleWireframe}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isWireframeEnabled ? currentTheme.accentBg : currentTheme.sliderTrack
                  }`}
                >
                  <motion.div
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    animate={{ left: isWireframeEnabled ? "calc(100% - 20px)" : "4px" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
              <p className={`text-xs ${currentTheme.textMuted}`}>
                Hiển thị lưới {currentTopology === "quad" ? "tứ giác" : "tam giác"} trên model
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions - Only show after texturing */}
      {isTextured && (
        <div className={`p-4 border-t ${currentTheme.border} space-y-2`}>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onDownload}
              className={`py-2.5 ${currentTheme.accentBg} rounded-xl text-white font-medium ${
                theme === "dark" ? "hover:bg-lime-400" : "hover:bg-cyan-400"
              } transition-colors flex items-center justify-center gap-1`}
            >
              <Download size={16} />
              <span className="text-sm">Download</span>
            </button>
            <button
              onClick={onRetexture}
              disabled={isProcessing}
              className={`py-2.5 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} ${currentTheme.hoverBg} transition-colors flex items-center justify-center gap-1 disabled:opacity-50`}
            >
              <Palette size={16} />
              <span className="text-sm">Retexture</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className={`py-2.5 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} ${currentTheme.hoverBg} transition-colors flex items-center justify-center gap-1`}
            >
              <RefreshCw size={16} />
              <span className="text-sm">Retry</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
