import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FeatureTooltip - Shows detailed feature description on long hover
 * Design: Black background, white text
 * Appears after hovering for 1 second
 */
export default function FeatureTooltip({ 
  children, 
  title, 
  description,
  shortcut = null,
  delay = 1000, // 1 second delay
  position = "right" // right, left, top, bottom
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef(null);
  const elementRef = useRef(null);

  const handleMouseEnter = (e) => {
    const rect = elementRef.current?.getBoundingClientRect();
    if (rect) {
      let x = 0, y = 0;
      
      switch (position) {
        case "right":
          x = rect.right + 10;
          y = rect.top + rect.height / 2;
          break;
        case "left":
          x = rect.left - 10;
          y = rect.top + rect.height / 2;
          break;
        case "top":
          x = rect.left + rect.width / 2;
          y = rect.top - 10;
          break;
        case "bottom":
          x = rect.left + rect.width / 2;
          y = rect.bottom + 10;
          break;
        default:
          x = rect.right + 10;
          y = rect.top + rect.height / 2;
      }
      
      setTooltipPosition({ x, y });
    }
    
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Calculate transform origin based on position
  const getTransformOrigin = () => {
    switch (position) {
      case "right": return "left center";
      case "left": return "right center";
      case "top": return "center bottom";
      case "bottom": return "center top";
      default: return "left center";
    }
  };

  // Calculate tooltip style based on position
  const getTooltipStyle = () => {
    const base = {
      position: "fixed",
      zIndex: 9999,
    };

    switch (position) {
      case "right":
        return {
          ...base,
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: "translateY(-50%)",
        };
      case "left":
        return {
          ...base,
          right: window.innerWidth - tooltipPosition.x,
          top: tooltipPosition.y,
          transform: "translateY(-50%)",
        };
      case "top":
        return {
          ...base,
          left: tooltipPosition.x,
          bottom: window.innerHeight - tooltipPosition.y,
          transform: "translateX(-50%)",
        };
      case "bottom":
        return {
          ...base,
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: "translateX(-50%)",
        };
      default:
        return {
          ...base,
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: "translateY(-50%)",
        };
    }
  };

  return (
    <>
      <div
        ref={elementRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>

      {/* Portal tooltip to document.body so it escapes sidebar backdrop-blur stacking context */}
      {createPortal(
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              style={{
                ...getTooltipStyle(),
                transformOrigin: getTransformOrigin(),
              }}
              className="pointer-events-none"
            >
              {/* Tooltip content - Solid black bg, white text */}
              <div className="bg-black text-white rounded-xl shadow-2xl border border-white/10 p-4 max-w-xs">
                {/* Arrow indicator */}
                {position === "right" && (
                  <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2">
                    <div className="border-8 border-transparent border-r-black" />
                  </div>
                )}
                {position === "left" && (
                  <div className="absolute right-0 top-1/2 translate-x-full -translate-y-1/2">
                    <div className="border-8 border-transparent border-l-black" />
                  </div>
                )}
                
                {/* Title */}
                <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-2">
                  {title}
                  {shortcut && (
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">
                      {shortcut}
                    </kbd>
                  )}
                </h4>
                
                {/* Description */}
                <p className="text-xs text-gray-300 leading-relaxed">
                  {description}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// Feature descriptions for all tools
export const FEATURE_DESCRIPTIONS = {
  generate: {
    title: "Generate",
    description: "Create a new 3D model from text or image. Provide a detailed description for high-quality AI generation.",
    shortcut: "Ctrl+G"
  },
  upload: {
    title: "Upload",
    description: "Upload an existing 3D model (GLB, FBX, OBJ, STL, USDZ, BLEND). Drag & drop supported.",
    shortcut: "Ctrl+U"
  },
  texture: {
    title: "Texture",
    description: "Add textures via AI or paint manually. Supports styles: Realistic, Stylized, PBR, Hand-painted.",
    shortcut: "T"
  },
  rig: {
    title: "Rig",
    description: "Add a skeleton to your model for animation. Supports Humanoid and Quadruped rigs.",
    shortcut: "R"
  },
  animate: {
    title: "Animation",
    description: "Apply preset animations to rigged models. Includes: Walk, Run, Jump, Attack, Dance and more.",
    shortcut: "A"
  },
  remesh: {
    title: "Remesh",
    description: "Change mesh topology. Quad is better for editing, Triangle is optimized for game engines.",
    shortcut: "M"
  },
  share: {
    title: "Share",
    description: "Share your model to the Showcase or generate a shareable link for others to view and download.",
    shortcut: "S"
  },
  download: {
    title: "Download",
    description: "Download your model in multiple formats: GLB (web), FBX (game engines), OBJ (3D software), STL (3D printing).",
    shortcut: "Ctrl+D"
  },
  polyva15: {
    title: "Polyva 1.5",
    description: "Fast AI model using Stable Diffusion 1.5. ~30 seconds, good quality for most use cases.",
  },
  polyvaXL: {
    title: "Polyva XL",
    description: "Premium AI model using SDXL. ~60 seconds but more detailed, better textures, production-ready.",
  },
  textTo3D: {
    title: "Text to 3D",
    description: "Describe your model in text and AI generates 4 variants. Example: 'A cute robot with big eyes'",
  },
  imageTo3D: {
    title: "Image to 3D",
    description: "Upload a 2D image and AI converts it to a 3D model. White/transparent backgrounds give best results.",
  }
};
