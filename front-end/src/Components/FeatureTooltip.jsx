import React, { useState, useEffect, useRef } from "react";
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
            {/* Tooltip content - Black bg, white text */}
            <div className="bg-black/95 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-white/10 p-4 max-w-xs">
              {/* Arrow indicator */}
              {position === "right" && (
                <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2">
                  <div className="border-8 border-transparent border-r-black/95" />
                </div>
              )}
              {position === "left" && (
                <div className="absolute right-0 top-1/2 translate-x-full -translate-y-1/2">
                  <div className="border-8 border-transparent border-l-black/95" />
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
      </AnimatePresence>
    </>
  );
}

// Feature descriptions for all tools
export const FEATURE_DESCRIPTIONS = {
  generate: {
    title: "Generate",
    description: "Tạo model 3D mới từ text hoặc hình ảnh. Nhập mô tả chi tiết để AI tạo ra model chất lượng cao.",
    shortcut: "Ctrl+G"
  },
  upload: {
    title: "Upload",
    description: "Tải lên model 3D có sẵn (GLB, FBX, OBJ, STL, USDZ, BLEND). Hỗ trợ kéo thả file trực tiếp.",
    shortcut: "Ctrl+U"
  },
  texture: {
    title: "Texture",
    description: "Thêm texture cho model bằng AI hoặc tô màu thủ công. Hỗ trợ nhiều style: Realistic, Stylized, PBR, Hand-painted.",
    shortcut: "T"
  },
  rig: {
    title: "Rig",
    description: "Thêm skeleton (xương) cho model để có thể làm animation. Hỗ trợ Humanoid (người) và Quadruped (4 chân).",
    shortcut: "R"
  },
  animate: {
    title: "Animation",
    description: "Áp dụng animation có sẵn cho model đã rig. Bao gồm: Walk, Run, Jump, Attack, Dance và nhiều hơn nữa.",
    shortcut: "A"
  },
  remesh: {
    title: "Remesh",
    description: "Thay đổi cấu trúc mesh. Quad (hình vuông) tốt cho chỉnh sửa, Triangle (tam giác) tốt cho game engine.",
    shortcut: "M"
  },
  share: {
    title: "Share",
    description: "Chia sẻ model của bạn lên Showcase hoặc tạo link chia sẻ. Mọi người có thể xem và tải về model của bạn.",
    shortcut: "S"
  },
  download: {
    title: "Download",
    description: "Tải model về máy với nhiều định dạng: GLB (web), FBX (game engines), OBJ (3D software), STL (3D printing).",
    shortcut: "Ctrl+D"
  },
  polyva15: {
    title: "Polyva 1.5",
    description: "Model AI nhanh sử dụng Stable Diffusion 1.5. Tốc độ ~30 giây, chất lượng tốt cho đa số use case.",
  },
  polyvaXL: {
    title: "Polyva XL",
    description: "Model AI cao cấp sử dụng SDXL. Tốc độ ~60 giây nhưng chi tiết hơn, texture đẹp hơn, phù hợp cho production.",
  },
  textTo3D: {
    title: "Text to 3D",
    description: "Mô tả model bạn muốn bằng text và AI sẽ tạo ra 4 biến thể. Ví dụ: 'A cute robot with big eyes'",
  },
  imageTo3D: {
    title: "Image to 3D",
    description: "Tải lên hình ảnh 2D và AI sẽ chuyển đổi thành model 3D. Ảnh nền trắng/trong suốt cho kết quả tốt nhất.",
  }
};
