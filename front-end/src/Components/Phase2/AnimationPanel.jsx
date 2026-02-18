import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Play, 
  Pause,
  Check,
  Film,
  User,
  Sword,
  Heart,
  Footprints,
  Zap,
  Hand,
  Skull,
  Music
} from "lucide-react";

// Animation presets
const ANIMATIONS = [
  {
    id: "agree",
    label: "Agree Gesture",
    description: "Gật đầu đồng ý",
    icon: Hand,
    category: "gesture",
    duration: "1.5s"
  },
  {
    id: "alert",
    label: "Alert",
    description: "Tư thế cảnh giác",
    icon: Zap,
    category: "idle",
    duration: "2.0s"
  },
  {
    id: "dance",
    label: "Dance",
    description: "Nhảy múa vui vẻ",
    icon: Music,
    category: "action",
    duration: "4.0s"
  },
  {
    id: "arise",
    label: "Arise",
    description: "Đứng dậy từ ngồi/nằm",
    icon: User,
    category: "transition",
    duration: "2.5s"
  },
  {
    id: "behit-flyup",
    label: "Be Hit Fly Up",
    description: "Bị đánh bay lên",
    icon: Zap,
    category: "combat",
    duration: "1.8s"
  },
  {
    id: "walk",
    label: "Walk",
    description: "Đi bộ bình thường",
    icon: Footprints,
    category: "locomotion",
    duration: "1.0s",
    loop: true
  },
  {
    id: "dead",
    label: "Dead",
    description: "Ngã xuống chết",
    icon: Skull,
    category: "combat",
    duration: "2.0s"
  },
  {
    id: "run",
    label: "Run",
    description: "Chạy nhanh",
    icon: Footprints,
    category: "locomotion",
    duration: "0.8s",
    loop: true
  },
  {
    id: "attack",
    label: "Attack",
    description: "Tấn công cơ bản",
    icon: Sword,
    category: "combat",
    duration: "1.2s"
  }
];

// Animation categories for filtering
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "gesture", label: "Gesture" },
  { id: "idle", label: "Idle" },
  { id: "locomotion", label: "Locomotion" },
  { id: "combat", label: "Combat" },
  { id: "action", label: "Action" },
];

export default function AnimationPanel({
  isOpen,
  onClose,
  onSelectAnimation,
  onPlayAnimation,
  onStopAnimation,
  currentAnimation = null,
  isPlaying = false,
  isRigConfigured = false,
  theme = "dark"
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAnimation, setSelectedAnimation] = useState(currentAnimation);

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

  const filteredAnimations = selectedCategory === "all" 
    ? ANIMATIONS 
    : ANIMATIONS.filter(a => a.category === selectedCategory);

  const handleSelectAnimation = (animation) => {
    setSelectedAnimation(animation.id);
    onSelectAnimation?.(animation);
    // Auto play after selection
    setTimeout(() => {
      onPlayAnimation?.(animation.id);
    }, 100);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      onStopAnimation?.();
    } else {
      onPlayAnimation?.(selectedAnimation);
    }
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
          <Film className={currentTheme.accentColor} size={20} />
          Animations
        </h2>
        <button
          onClick={onClose}
          className={`p-2 ${currentTheme.hoverBg} rounded-lg transition-colors`}
        >
          <X size={20} className={currentTheme.textSecondary} />
        </button>
      </div>

      {/* Rig status */}
      {!isRigConfigured && (
        <div className="p-4">
          <div className="flex items-center gap-2 p-3 bg-amber-900/30 border border-amber-500/30 rounded-lg">
            <User size={16} className="text-amber-400" />
            <p className="text-xs text-amber-400">
              Vui lòng cấu hình Rig trước khi sử dụng Animation
            </p>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className={`p-4 border-b ${currentTheme.border}`}>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              disabled={!isRigConfigured}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 ${
                selectedCategory === category.id
                  ? `${currentTheme.accentBg} text-white`
                  : `${currentTheme.cardBg} ${currentTheme.textSecondary} ${currentTheme.hoverBg}`
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Animation list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-2">
          {filteredAnimations.map((animation) => (
            <button
              key={animation.id}
              onClick={() => handleSelectAnimation(animation)}
              disabled={!isRigConfigured}
              className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 text-left disabled:opacity-50 ${
                selectedAnimation === animation.id
                  ? `${currentTheme.accentBorder} ${theme === "dark" ? "bg-lime-500/10" : "bg-cyan-500/10"}`
                  : `${currentTheme.border} ${currentTheme.hoverBg}`
              }`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                selectedAnimation === animation.id
                  ? currentTheme.accentBg
                  : currentTheme.cardBg
              }`}>
                <animation.icon 
                  size={20} 
                  className={selectedAnimation === animation.id ? "text-white" : currentTheme.textSecondary} 
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${currentTheme.text}`}>
                  {animation.label}
                </div>
                <div className={`text-xs ${currentTheme.textMuted} truncate`}>
                  {animation.description}
                </div>
              </div>

              {/* Duration & loop */}
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs ${currentTheme.textMuted}`}>{animation.duration}</span>
                {animation.loop && (
                  <span className={`text-[10px] px-1.5 py-0.5 ${currentTheme.cardBg} rounded ${currentTheme.textMuted}`}>
                    Loop
                  </span>
                )}
              </div>

              {/* Selected indicator */}
              {selectedAnimation === animation.id && (
                <Check size={16} className={currentTheme.accentColor} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Playback controls */}
      <div className={`p-4 border-t ${currentTheme.border}`}>
        {/* Selected animation info */}
        {selectedAnimation && (
          <div className={`${currentTheme.cardBg} rounded-lg p-3 mb-3`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${currentTheme.text}`}>
                {ANIMATIONS.find(a => a.id === selectedAnimation)?.label}
              </span>
              <span className={`text-xs ${currentTheme.textMuted}`}>
                {ANIMATIONS.find(a => a.id === selectedAnimation)?.duration}
              </span>
            </div>
          </div>
        )}

        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          disabled={!isRigConfigured || !selectedAnimation}
          className={`w-full py-3 ${currentTheme.accentBg} rounded-xl text-white font-medium ${
            theme === "dark" ? "hover:bg-lime-400" : "hover:bg-cyan-400"
          } transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
        >
          {isPlaying ? (
            <>
              <Pause size={18} />
              Stop Animation
            </>
          ) : (
            <>
              <Play size={18} />
              Play Animation
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
