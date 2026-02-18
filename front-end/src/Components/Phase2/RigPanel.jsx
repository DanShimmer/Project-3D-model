import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  User, 
  Dog,
  ChevronRight,
  ChevronLeft,
  Check,
  Move,
  Loader2,
  Info,
  AlertTriangle
} from "lucide-react";
import { DemoModelPreview } from "../DemoModels";

// Character types for rigging
const CHARACTER_TYPES = [
  {
    id: "humanoid",
    label: "Humanoid",
    description: "Human character - 2 legs, 2 arms",
    icon: User,
    image: "👤"
  },
  {
    id: "quadruped-dog",
    label: "Quadruped Dog",
    description: "4-legged animal - dog type",
    icon: Dog,
    image: "🐕"
  },
  {
    id: "quadruped-cat",
    label: "Quadruped Cat",
    description: "4-legged animal - cat type",
    icon: Dog,
    image: "🐱",
    comingSoon: true
  }
];

// Rig markers for humanoid
const HUMANOID_MARKERS = [
  { id: "chin", label: "Chin", color: "#06b6d4", position: { x: 50, y: 15 } },
  { id: "shoulder-a", label: "Shoulder A", color: "#f59e0b", position: { x: 30, y: 25 } },
  { id: "shoulder-b", label: "Shoulder B", color: "#f59e0b", position: { x: 70, y: 25 } },
  { id: "elbow-a", label: "Elbow A", color: "#22c55e", position: { x: 22, y: 38 } },
  { id: "elbow-b", label: "Elbow B", color: "#22c55e", position: { x: 78, y: 38 } },
  { id: "wrist-a", label: "Wrist A", color: "#ec4899", position: { x: 18, y: 50 } },
  { id: "wrist-b", label: "Wrist B", color: "#ec4899", position: { x: 82, y: 50 } },
  { id: "groin", label: "Groin", color: "#6b7280", position: { x: 50, y: 52 } },
  { id: "knee-a", label: "Knee A", color: "#f97316", position: { x: 40, y: 70 } },
  { id: "knee-b", label: "Knee B", color: "#f97316", position: { x: 60, y: 70 } },
  { id: "ankle-a", label: "Ankle A", color: "#a855f7", position: { x: 38, y: 88 } },
  { id: "ankle-b", label: "Ankle B", color: "#a855f7", position: { x: 62, y: 88 } },
];

// Rig markers for quadruped
const QUADRUPED_MARKERS = [
  { id: "head", label: "Head", color: "#06b6d4", position: { x: 15, y: 30 } },
  { id: "neck", label: "Neck", color: "#f59e0b", position: { x: 25, y: 35 } },
  { id: "spine", label: "Spine", color: "#6b7280", position: { x: 50, y: 40 } },
  { id: "hip", label: "Hip", color: "#22c55e", position: { x: 75, y: 38 } },
  { id: "tail", label: "Tail", color: "#ec4899", position: { x: 88, y: 45 } },
  { id: "front-leg-a", label: "Front Leg A", color: "#f97316", position: { x: 28, y: 70 } },
  { id: "front-leg-b", label: "Front Leg B", color: "#f97316", position: { x: 35, y: 70 } },
  { id: "back-leg-a", label: "Back Leg A", color: "#a855f7", position: { x: 70, y: 70 } },
  { id: "back-leg-b", label: "Back Leg B", color: "#a855f7", position: { x: 77, y: 70 } },
];

// Marker legend
const MARKER_LEGEND = {
  humanoid: [
    { label: "Chin", color: "#06b6d4" },
    { label: "Shoulders", color: "#f59e0b" },
    { label: "Elbows", color: "#22c55e" },
    { label: "Wrists", color: "#ec4899" },
    { label: "Groin", color: "#6b7280" },
    { label: "Knees", color: "#f97316" },
    { label: "Ankles", color: "#a855f7" },
  ],
  quadruped: [
    { label: "Head", color: "#06b6d4" },
    { label: "Neck", color: "#f59e0b" },
    { label: "Spine", color: "#6b7280" },
    { label: "Hip", color: "#22c55e" },
    { label: "Tail", color: "#ec4899" },
    { label: "Front Legs", color: "#f97316" },
    { label: "Back Legs", color: "#a855f7" },
  ]
};

// Model type detection helper
const detectModelType = (modelType, prompt = "") => {
  const promptLower = (prompt || "").toLowerCase();
  
  // Check for humanoid indicators
  const humanoidKeywords = ["robot", "human", "person", "character", "man", "woman", "boy", "girl", "soldier", "knight", "wizard", "warrior"];
  const quadrupedKeywords = ["dog", "cat", "horse", "lion", "wolf", "fox", "bear", "deer", "elephant", "animal", "creature", "beast"];
  
  // Check model type first
  if (modelType === "robot") return "humanoid";
  if (modelType === "cat" || modelType === "dog") return "quadruped";
  
  // Then check prompt
  for (const keyword of humanoidKeywords) {
    if (promptLower.includes(keyword)) return "humanoid";
  }
  for (const keyword of quadrupedKeywords) {
    if (promptLower.includes(keyword)) return "quadruped";
  }
  
  // Default to humanoid for unknown types
  return "humanoid";
};

// Check if model can be rigged
const canRigModel = (modelType) => {
  // These model types can be rigged
  const riggableTypes = ["robot", "cat", "dog", "humanoid", "quadruped"];
  return riggableTypes.includes(modelType) || modelType === "uploaded";
};

export default function RigPanel({
  isOpen,
  onClose,
  onConfirmRig,
  onEnableAnimation,
  isProcessing = false,
  theme = "dark",
  modelType = "robot",
  modelVariant = 1,
  modelUrl = null,
  modelPrompt = ""
}) {
  const [step, setStep] = useState(1); // 1: Select type, 2: Place markers
  const [selectedType, setSelectedType] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [symmetryEnabled, setSymmetryEnabled] = useState(true);
  const [draggingMarker, setDraggingMarker] = useState(null);
  const canvasRef = useRef(null);
  
  // Detect if model can be rigged based on type
  const detectedRigType = detectModelType(modelType, modelPrompt);
  const canRig = canRigModel(modelType);
  
  // Auto-select detected type on open
  useEffect(() => {
    if (isOpen && canRig && !selectedType) {
      // Pre-select based on detected type
      const preselect = detectedRigType === "quadruped" ? "quadruped-dog" : "humanoid";
      setSelectedType(preselect);
    }
  }, [isOpen, canRig, detectedRigType, selectedType]);

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

  // Initialize markers when type is selected
  useEffect(() => {
    if (selectedType) {
      const initialMarkers = selectedType.includes("quadruped") 
        ? QUADRUPED_MARKERS 
        : HUMANOID_MARKERS;
      setMarkers(initialMarkers.map(m => ({ ...m })));
    }
  }, [selectedType]);

  const handleSelectType = (type) => {
    if (type.comingSoon) return;
    setSelectedType(type.id);
  };

  const handleNext = () => {
    if (step === 1 && selectedType) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedType(null);
    }
  };

  const handleMarkerDrag = (markerId, newPosition) => {
    setMarkers(prev => {
      // Check if this is a paired marker (has -a or -b suffix)
      const isMarkerA = markerId.endsWith("-a");
      const isMarkerB = markerId.endsWith("-b");
      
      // If symmetry is enabled and this is a paired marker, move both
      if (symmetryEnabled && (isMarkerA || isMarkerB)) {
        const baseId = markerId.replace(/-[ab]$/, "");
        const siblingId = isMarkerA ? `${baseId}-b` : `${baseId}-a`;
        
        // Calculate mirrored X position (symmetric around center line at x=50)
        const mirroredX = 100 - newPosition.x;
        
        return prev.map(m => {
          if (m.id === markerId) {
            return { ...m, position: newPosition };
          }
          if (m.id === siblingId) {
            // Move sibling to mirrored position
            return { ...m, position: { x: mirroredX, y: newPosition.y } };
          }
          return m;
        });
      }
      
      // Non-paired marker or symmetry disabled - just move the one marker
      return prev.map(m => 
        m.id === markerId ? { ...m, position: newPosition } : m
      );
    });
  };

  const handleConfirm = () => {
    onConfirmRig({
      type: selectedType,
      markers: markers,
      symmetry: symmetryEnabled
    });
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
          className={`w-full max-w-4xl ${currentTheme.bg} border ${currentTheme.border} rounded-2xl overflow-hidden flex`}
        >
          {/* Left side - Model preview */}
          <div className="flex-1 bg-black/50 relative min-h-[500px] flex items-center justify-center">
            {/* Model preview with 3D model */}
            <div className="relative w-full h-full" ref={canvasRef}>
              {/* Detected type indicator */}
              {canRig && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 bg-black/70 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${detectedRigType === "humanoid" ? "bg-cyan-400" : "bg-amber-400"}`} />
                  <span className="text-xs text-white">
                    Detected: {detectedRigType === "humanoid" ? "Humanoid" : "Quadruped"}
                  </span>
                </div>
              )}
              
              {/* 3D Model preview */}
              {canRig ? (
                <div className="absolute inset-0">
                  <DemoModelPreview
                    modelType={modelType}
                    variant={modelVariant}
                    autoRotate={step === 1}
                    showGrid={true}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-8">
                    <AlertTriangle size={48} className="mx-auto mb-4 text-amber-500" />
                    <h3 className={`text-lg font-medium ${currentTheme.text} mb-2`}>Cannot Rig This Model</h3>
                    <p className={`text-sm ${currentTheme.textMuted}`}>
                      Only humanoid or quadruped models can be rigged.
                      <br />This model type ({modelType}) is not supported for rigging.
                    </p>
                  </div>
                </div>
              )}

              {/* Symmetry line */}
              {step === 2 && symmetryEnabled && (
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-lime-500/50" />
              )}

              {/* Draggable markers */}
              {step === 2 && markers.map((marker) => (
                <motion.div
                  key={marker.id}
                  drag
                  dragMomentum={false}
                  onDrag={(e, info) => {
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (rect) {
                      const x = ((info.point.x - rect.left) / rect.width) * 100;
                      const y = ((info.point.y - rect.top) / rect.height) * 100;
                      handleMarkerDrag(marker.id, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
                    }
                  }}
                  className="absolute w-8 h-8 -ml-4 -mt-4 cursor-move flex items-center justify-center"
                  style={{
                    left: `${marker.position.x}%`,
                    top: `${marker.position.y}%`,
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white"
                    style={{ 
                      backgroundColor: `${marker.color}33`,
                      borderColor: marker.color 
                    }}
                  >
                    {marker.id.includes("-a") ? "A" : marker.id.includes("-b") ? "B" : ""}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="w-96 flex flex-col">
            {/* Header */}
            <div className={`p-4 border-b ${currentTheme.border} flex items-center justify-between`}>
              <h2 className={`text-lg font-semibold ${currentTheme.text}`}>
                {step === 1 ? "Select Character Type" : "Place Markers"}
              </h2>
              <button
                onClick={onClose}
                disabled={isProcessing}
                className={`p-2 ${currentTheme.hoverBg} rounded-lg transition-colors disabled:opacity-50`}
              >
                <X size={20} className={currentTheme.textSecondary} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {step === 1 ? (
                /* Step 1: Select character type */
                <div className="space-y-4">
                  {/* Info banner */}
                  <div className={`flex items-start gap-2 p-3 ${theme === "dark" ? "bg-cyan-900/30 border-cyan-500/30" : "bg-cyan-100 border-cyan-300"} border rounded-lg`}>
                    <Info size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-cyan-400">
                      Only humanoid & quadruped models are supported
                    </p>
                  </div>

                  {/* Good vs Bad examples */}
                  <div className={`grid grid-cols-2 gap-4 p-4 ${currentTheme.cardBg} rounded-xl`}>
                    <div className="text-center">
                      <div className="text-4xl mb-2">🧍</div>
                      <div className="flex items-center justify-center gap-1 text-green-400 text-sm mb-1">
                        <Check size={14} />
                        Good Example
                      </div>
                      <p className={`text-xs ${currentTheme.textMuted}`}>
                        Close to a T-pose or A-pose, clear gap between limbs and body
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl mb-2">🧎</div>
                      <div className="flex items-center justify-center gap-1 text-red-400 text-sm mb-1">
                        <X size={14} />
                        Bad Example
                      </div>
                      <p className={`text-xs ${currentTheme.textMuted}`}>
                        Obstructed views of limbs, full body not shown
                      </p>
                    </div>
                  </div>

                  {/* Character type selection */}
                  <div className="grid grid-cols-3 gap-3">
                    {CHARACTER_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => handleSelectType(type)}
                        disabled={type.comingSoon}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 relative ${
                          type.comingSoon
                            ? `${currentTheme.border} opacity-50 cursor-not-allowed`
                            : selectedType === type.id
                            ? `${currentTheme.accentBorder} ${theme === "dark" ? "bg-lime-500/10" : "bg-cyan-500/10"}`
                            : `${currentTheme.border} ${currentTheme.hoverBg}`
                        }`}
                      >
                        <span className="text-3xl">{type.image}</span>
                        <span className={`text-xs font-medium ${currentTheme.text} text-center`}>
                          {type.label}
                        </span>
                        {type.comingSoon && (
                          <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-gray-600 rounded text-gray-300">
                            coming soon
                          </span>
                        )}
                        {selectedType === type.id && (
                          <div className={`absolute top-2 left-2 w-5 h-5 ${currentTheme.accentBg} rounded-full flex items-center justify-center`}>
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Step 2: Place markers */
                <div className="space-y-4">
                  {/* Instructions */}
                  <div className={`flex items-start gap-2 p-3 ${theme === "dark" ? "bg-cyan-900/30 border-cyan-500/30" : "bg-cyan-100 border-cyan-300"} border rounded-lg`}>
                    <Info size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-cyan-400">
                      Place markers on the corresponding positions. More precise markers give better animation effects.
                    </p>
                  </div>

                  {/* Reference image */}
                  <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
                    <div className="flex items-center justify-center">
                      <div className="text-6xl">
                        {selectedType?.includes("quadruped") ? "🐕" : "🧍"}
                      </div>
                    </div>
                  </div>

                  {/* Marker legend */}
                  <div className={`${currentTheme.cardBg} rounded-xl p-4`}>
                    <h4 className={`text-sm font-medium mb-3 ${currentTheme.text}`}>Marker Legend</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {MARKER_LEGEND[selectedType?.includes("quadruped") ? "quadruped" : "humanoid"]?.map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className={`text-xs ${currentTheme.textSecondary}`}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Symmetry toggle */}
                  <div className={`${currentTheme.cardBg} rounded-xl p-4 flex items-center justify-between`}>
                    <span className={`font-medium ${currentTheme.text}`}>Symmetry</span>
                    <button
                      onClick={() => setSymmetryEnabled(!symmetryEnabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        symmetryEnabled ? currentTheme.accentBg : "bg-gray-600"
                      }`}
                    >
                      <motion.div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                        animate={{ left: symmetryEnabled ? "calc(100% - 20px)" : "4px" }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t ${currentTheme.border} flex gap-3`}>
              {step === 2 && (
                <button
                  onClick={handleBack}
                  disabled={isProcessing}
                  className={`flex items-center gap-2 px-4 py-3 border ${currentTheme.border} rounded-xl ${currentTheme.textSecondary} ${currentTheme.hoverBg} transition-colors disabled:opacity-50`}
                >
                  <ChevronLeft size={18} />
                  Back
                </button>
              )}
              
              <button
                onClick={step === 1 ? handleNext : handleConfirm}
                disabled={isProcessing || (step === 1 && !selectedType)}
                className={`flex-1 py-3 ${currentTheme.accentBg} rounded-xl text-white font-medium ${
                  theme === "dark" ? "hover:bg-lime-400" : "hover:bg-cyan-400"
                } transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Processing...
                  </>
                ) : step === 1 ? (
                  <>
                    Next
                    <ChevronRight size={18} />
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
