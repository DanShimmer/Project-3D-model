import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Triangle, Grid3X3, Loader2, Check } from "lucide-react";

// Topology types
const TOPOLOGY_OPTIONS = [
  {
    id: "triangle",
    label: "Triangle",
    description: "Dạng tam giác - Phù hợp cho game và render realtime",
    icon: Triangle,
    preview: (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <polygon points="50,10 90,90 10,90" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="30" y1="50" x2="70" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    )
  },
  {
    id: "quad",
    label: "Quad",
    description: "Dạng tứ giác - Dễ chỉnh sửa trong Blender, Maya",
    icon: Grid3X3,
    preview: (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <rect x="30" y="30" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </svg>
    )
  }
];

export default function RemeshModal({
  isOpen,
  onClose,
  onRemesh,
  currentTopology = "triangle",
  isProcessing = false,
  theme = "dark"
}) {
  const [selectedTopology, setSelectedTopology] = useState(currentTopology);

  const currentTheme = {
    dark: {
      bg: "bg-gray-900",
      border: "border-gray-800",
      text: "text-white",
      textSecondary: "text-gray-400",
      textMuted: "text-gray-500",
      cardBg: "bg-gray-800/50",
      accentBg: "bg-lime-500",
      accentColor: "text-lime-400",
      accentBorder: "border-lime-500",
      hoverBg: "hover:bg-white/5"
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
      hoverBg: "hover:bg-black/5"
    }
  }[theme];

  const handleRemesh = () => {
    onRemesh(selectedTopology);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => !isProcessing && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md ${currentTheme.bg} border ${currentTheme.border} rounded-2xl p-6`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-semibold flex items-center gap-2 ${currentTheme.text}`}>
              <Grid3X3 className={currentTheme.accentColor} size={20} />
              Remesh Model
            </h2>
            <button
              onClick={() => !isProcessing && onClose()}
              disabled={isProcessing}
              className={`p-2 ${currentTheme.hoverBg} rounded-lg transition-colors disabled:opacity-50`}
            >
              <X size={20} className={currentTheme.textSecondary} />
            </button>
          </div>

          {/* Description */}
          <p className={`${currentTheme.textSecondary} text-sm mb-6`}>
            Chọn topology cho model. Việc remesh sẽ tái cấu trúc lưới 3D của model.
          </p>

          {/* Topology Options */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {TOPOLOGY_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedTopology(option.id)}
                disabled={isProcessing}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                  selectedTopology === option.id
                    ? `${currentTheme.accentBorder} ${theme === "dark" ? "bg-lime-500/10" : "bg-cyan-500/10"}`
                    : `${currentTheme.border} ${currentTheme.hoverBg}`
                } disabled:opacity-50`}
              >
                {/* Preview */}
                <div className={`${selectedTopology === option.id ? currentTheme.accentColor : currentTheme.textSecondary}`}>
                  {option.preview}
                </div>

                {/* Label */}
                <div className="text-center">
                  <div className={`font-medium ${selectedTopology === option.id ? currentTheme.text : currentTheme.textSecondary}`}>
                    {option.label}
                  </div>
                  <div className={`text-xs mt-1 ${currentTheme.textMuted}`}>
                    {option.description}
                  </div>
                </div>

                {/* Selected indicator */}
                {selectedTopology === option.id && (
                  <div className={`absolute top-2 right-2 w-5 h-5 ${currentTheme.accentBg} rounded-full flex items-center justify-center`}>
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Info box */}
          <div className={`${currentTheme.cardBg} rounded-lg p-3 mb-6`}>
            <p className={`text-xs ${currentTheme.textMuted}`}>
              <strong className={currentTheme.textSecondary}>Lưu ý:</strong> Quad topology phù hợp hơn cho việc chỉnh sửa 
              và animation, trong khi Triangle phù hợp cho game engines và real-time rendering.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className={`flex-1 py-3 border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} ${currentTheme.hoverBg} transition-colors disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              onClick={handleRemesh}
              disabled={isProcessing}
              className={`flex-1 py-3 ${currentTheme.accentBg} rounded-xl text-white font-medium ${
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
                  <Grid3X3 size={18} />
                  Remesh
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
