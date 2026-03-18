import React, { useRef, useEffect, useState, Suspense, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Center, Grid, Html, useProgress } from "@react-three/drei";
import { LucideDownload, LucideMaximize2, LucideRotateCcw, LucideZoomIn, LucideZoomOut, LucideMove, LucidePaintbrush } from "lucide-react";
import * as THREE from "three";

// Loading component
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white text-sm">{progress.toFixed(0)}% loaded</p>
      </div>
    </Html>
  );
}

// Paintable 3D Model component with vertex-level brush painting and animation support
function PaintableModel({ url, onLoaded, isPaintMode, paintColor, brushSize, onPaint, wireframe, brightness, playAnimation }) {
  const { scene, animations } = useGLTF(url);
  const ref = useRef();
  const { raycaster, camera, gl } = useThree();
  const isPaintingRef = useRef(false);
  const lastPaintPosRef = useRef(null);
  const mixerRef = useRef(null);
  const actionsRef = useRef([]);
  
  // Animation playback using THREE.AnimationMixer
  useEffect(() => {
    if (!scene) return;
    
    // Dispose old mixer
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current.uncacheRoot(scene);
      mixerRef.current = null;
      actionsRef.current = [];
    }
    
    if (animations && animations.length > 0) {
      console.log(`🎬 Model has ${animations.length} animation(s):`, animations.map(a => a.name));
      const mixer = new THREE.AnimationMixer(scene);
      mixerRef.current = mixer;
      
      // Play all animations if playAnimation is true
      if (playAnimation) {
        animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.play();
          actionsRef.current.push(action);
        });
        console.log("▶️ Playing animations");
      }
    }
    
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
        actionsRef.current = [];
      }
    };
  }, [scene, animations, playAnimation]);
  
  // Update animation mixer each frame
  useFrame((state, delta) => {
    if (mixerRef.current && playAnimation) {
      mixerRef.current.update(delta);
    }
    // Auto rotation (only when not in paint mode and not playing animation)
    if (ref.current && window.autoRotate && !isPaintMode && !playAnimation) {
      ref.current.rotation.y += delta * 0.5;
    }
  });
  
  // ONE-TIME initialization: setup vertex colors and materials for painting
  // NOTE: We do NOT manually scale/center here — <Center> handles that
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const geo = child.geometry;
          
          // Add vertex colors attribute if not present
          if (!geo.attributes.color) {
            const count = geo.attributes.position.count;
            const colors = new Float32Array(count * 3);
            const mat = child.material;
            const baseColor = mat.color ? mat.color : new THREE.Color(1, 1, 1);
            for (let i = 0; i < count; i++) {
              colors[i * 3] = baseColor.r;
              colors[i * 3 + 1] = baseColor.g;
              colors[i * 3 + 2] = baseColor.b;
            }
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          }
          
          // Clone material and enable vertex colors (only once)
          if (!child.material._isPaintSetup) {
            child.material = child.material.clone();
            child.material.vertexColors = true;
            child.material._isPaintSetup = true;
            child.material.needsUpdate = true;
          }
        }
      });
      
      if (onLoaded) {
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        onLoaded({ size, center });
      }
    }
  }, [scene, onLoaded]);
  
  // SEPARATE effect for brightness/wireframe — lightweight, no re-init
  useEffect(() => {
    if (!scene) return;
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.wireframe = wireframe || false;
        const factor = (brightness || 100) / 100;
        if (child.material.color) {
          child.material.emissiveIntensity = Math.max(0, factor - 1.0);
        }
      }
    });
  }, [scene, wireframe, brightness]);

  // Paint vertices near the intersection point with brush radius and falloff
  const paintAtPoint = useCallback((intersect) => {
    if (!intersect || !intersect.object || !intersect.object.geometry) return;
    
    const mesh = intersect.object;
    const geo = mesh.geometry;
    const colorAttr = geo.attributes.color;
    const posAttr = geo.attributes.position;
    
    if (!colorAttr || !posAttr) return;
    
    // Get intersection point in local space
    const localPoint = mesh.worldToLocal(intersect.point.clone());
    
    // Calculate brush radius based on brushSize (10-100) mapped to world units
    const box = new THREE.Box3().setFromBufferAttribute(posAttr);
    const meshSize = box.getSize(new THREE.Vector3()).length();
    const radius = (brushSize / 100) * meshSize * 0.15; // Brush radius relative to mesh size
    
    const newColor = new THREE.Color(paintColor);
    let painted = false;
    
    // Paint all vertices within brush radius
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      
      const dx = vx - localPoint.x;
      const dy = vy - localPoint.y;
      const dz = vz - localPoint.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (dist <= radius) {
        // Smooth falloff: stronger at center, weaker at edges
        const falloff = 1.0 - (dist / radius);
        const strength = falloff * falloff; // Quadratic falloff for smooth edges
        
        // Blend existing color with paint color
        const existingR = colorAttr.getX(i);
        const existingG = colorAttr.getY(i);
        const existingB = colorAttr.getZ(i);
        
        colorAttr.setXYZ(
          i,
          existingR + (newColor.r - existingR) * strength,
          existingG + (newColor.g - existingG) * strength,
          existingB + (newColor.b - existingB) * strength
        );
        painted = true;
      }
    }
    
    if (painted) {
      colorAttr.needsUpdate = true;
      if (onPaint) {
        onPaint({ meshId: mesh.uuid, color: paintColor, point: intersect.point });
      }
    }
  }, [paintColor, brushSize, onPaint]);

  // Raycast and paint at current pointer position
  const doPaint = useCallback((event) => {
    if (!isPaintMode || !paintColor || !ref.current) return;
    
    // Get normalized device coordinates
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(scene, true);
    
    if (intersects.length > 0) {
      paintAtPoint(intersects[0]);
    }
  }, [isPaintMode, paintColor, scene, raycaster, camera, gl, paintAtPoint]);

  // Setup mouse event listeners for click-and-drag painting
  useEffect(() => {
    if (!isPaintMode) return;
    
    const canvas = gl.domElement;
    
    const onMouseDown = (e) => {
      if (e.button !== 0) return; // Left button only
      isPaintingRef.current = true;
      doPaint(e);
    };
    
    const onMouseMove = (e) => {
      if (!isPaintingRef.current) return;
      doPaint(e);
    };
    
    const onMouseUp = () => {
      isPaintingRef.current = false;
      lastPaintPosRef.current = null;
    };
    
    const onMouseLeave = () => {
      isPaintingRef.current = false;
      lastPaintPosRef.current = null;
    };
    
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [isPaintMode, doPaint, gl]);
  
  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
}

// Legacy Model component (non-paintable, for backward compat)
function Model({ url, onLoaded }) {
  const { scene } = useGLTF(url);
  const ref = useRef();
  
  useEffect(() => {
    if (scene) {
      // NOTE: We do NOT manually scale/center here — <Center> handles that
      // Just report size info via onLoaded callback
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      if (onLoaded) {
        onLoaded({ size, center });
      }
    }
  }, [scene, onLoaded]);
  
  // Auto rotation
  useFrame((state, delta) => {
    if (ref.current && window.autoRotate) {
      ref.current.rotation.y += delta * 0.5;
    }
  });
  
  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
}

// Custom brush cursor that follows the mouse - MUST be top-level, not nested
function BrushCursor({ color, size }) {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const onMouseMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    const onMouseLeave = () => setVisible(false);
    const onMouseEnter = () => setVisible(true);
    
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
    };
  }, []);
  
  if (!visible) return null;
  
  const brushPixelSize = Math.max(12, size * 0.4);
  
  return (
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{
        left: pos.x - brushPixelSize / 2,
        top: pos.y - brushPixelSize / 2,
        width: brushPixelSize,
        height: brushPixelSize,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        backgroundColor: `${color}33`,
        boxShadow: `0 0 8px ${color}66`,
        transition: 'width 0.1s, height 0.1s, left 0.02s, top 0.02s'
      }}
    >
      {/* Center dot */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 4,
          height: 4,
          backgroundColor: color
        }}
      />
    </div>
  );
}

// Controls component
function CameraControls({ controlsRef, enableRotate = true }) {
  const { camera, gl } = useThree();
  
  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enablePan={true}
      enableZoom={true}
      enableRotate={enableRotate}
      minDistance={0.5}
      maxDistance={20}
      maxPolarAngle={Math.PI}
    />
  );
}

// Auto-fit camera to model bounding box
function AutoFitCamera() {
  const { camera, scene } = useThree();
  const fitted = useRef(false);
  
  useFrame(() => {
    if (fitted.current) return;
    
    // IMPORTANT: Only measure the model container, NOT the Grid (10x10) or lights.
    // Previously used scene bounding box which included the Grid,
    // making the model appear as a tiny dot.
    const modelContainer = scene.getObjectByName('model-container');
    if (!modelContainer) return;
    
    const box = new THREE.Box3().setFromObject(modelContainer);
    if (box.isEmpty()) return;
    
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    if (maxDim > 0.001) { // Model is loaded
      const center = box.getCenter(new THREE.Vector3());
      const fov = camera.fov * (Math.PI / 180);
      // Distance so model fills ~85% of the viewport
      let distance = (maxDim / 2) / Math.tan(fov / 2) * 1.2;
      distance = Math.max(distance, 1.5);
      
      camera.position.set(center.x, center.y + maxDim * 0.15, center.z + distance);
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      
      fitted.current = true;
    }
  });
  
  return null;
}

// Main Viewer Component
export default function ModelViewer({ 
  modelUrl, 
  className = "",
  showControls = true,
  autoRotate = false,
  onDownload,
  // Paint mode props
  isPaintMode = false,
  paintColor = "#4caf50",
  brushSize = 50,
  onPaint,
  // Visual props
  wireframe = false,
  brightness = 100,
  // Animation props
  playAnimation = false
}) {
  const controlsRef = useRef();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef();
  const [modelInfo, setModelInfo] = useState(null);
  
  // Set global auto rotate
  useEffect(() => {
    window.autoRotate = autoRotate;
  }, [autoRotate]);
  
  // Reset camera
  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };
  
  // Zoom controls
  const handleZoomIn = () => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      camera.position.multiplyScalar(0.8);
      controlsRef.current.update();
    }
  };
  
  const handleZoomOut = () => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      camera.position.multiplyScalar(1.2);
      controlsRef.current.update();
    }
  };
  
  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  // Download handler
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (modelUrl) {
      const link = document.createElement("a");
      link.href = modelUrl;
      link.download = "model.glb";
      link.click();
    }
  };
  
  if (!modelUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-900/50 rounded-xl border border-gray-800/30 ${className}`}>
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
            <LucideMove size={32} className="text-gray-500" />
          </div>
          <p>3D preview will appear here</p>
          <p className="text-sm mt-1 text-gray-500">Generate a model to see the preview</p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className={`relative bg-gray-900/50 rounded-xl border border-gray-800/30 overflow-hidden ${className}`}
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0.3, 2.5], fov: 45 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)' }}
        className={isPaintMode ? 'paint-cursor' : ''}
      >
        <Suspense fallback={<Loader />}>
          {/* Auto-fit camera to model bounds */}
          <AutoFitCamera />
          
          {/* Lighting */}
          <ambientLight intensity={0.5 * (brightness / 100)} />
          <directionalLight position={[10, 10, 5]} intensity={1 * (brightness / 100)} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5 * (brightness / 100)} />
          <pointLight position={[0, 5, 0]} intensity={0.5 * (brightness / 100)} />
          
          {/* Environment for reflections */}
          <Environment preset="city" />
          
          {/* Grid */}
          <Grid
            args={[10, 10]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#333"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#444"
            fadeDistance={10}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={true}
            position={[0, -1, 0]}
          />
          
          {/* Model - wrapped in named group for AutoFitCamera bbox (excludes Grid) */}
          <group name="model-container">
            <Center>
              <PaintableModel 
                url={modelUrl} 
                onLoaded={setModelInfo} 
                isPaintMode={isPaintMode}
                paintColor={paintColor}
                brushSize={brushSize}
                onPaint={onPaint}
                wireframe={wireframe}
                brightness={brightness}
                playAnimation={playAnimation}
              />
            </Center>
          </group>
          
          {/* Controls - disable rotate when painting */}
          <CameraControls controlsRef={controlsRef} enableRotate={!isPaintMode} />
        </Suspense>
      </Canvas>
      
      {/* Paint mode indicator */}
      {isPaintMode && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-purple-900/80 backdrop-blur-sm text-purple-200 rounded-lg px-3 py-2 text-sm">
          <LucidePaintbrush size={16} />
          <span>Brush Mode — Hold & Drag to paint</span>
          <div className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: paintColor }} />
        </div>
      )}

      {/* Custom brush cursor overlay */}
      {isPaintMode && (
        <style>{`
          .paint-cursor canvas, .paint-cursor { cursor: none !important; }
        `}</style>
      )}
      {isPaintMode && <BrushCursor color={paintColor} size={brushSize} />}

      {/* Control buttons */}
      {showControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm rounded-lg p-2 border border-gray-700/50">
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            title="Reset view"
          >
            <LucideRotateCcw size={18} />
          </button>
          
          <div className="w-px h-6 bg-gray-700" />
          
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            title="Zoom out"
          >
            <LucideZoomOut size={18} />
          </button>
          
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            title="Zoom in"
          >
            <LucideZoomIn size={18} />
          </button>
          
          <div className="w-px h-6 bg-gray-700" />
          
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            title="Fullscreen"
          >
            <LucideMaximize2 size={18} />
          </button>
          
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            title="Download"
          >
            <LucideDownload size={18} />
          </button>
        </div>
      )}
      
      {/* Keyboard shortcuts hint */}
      <div className="absolute top-4 right-4 text-xs text-gray-500 bg-gray-900/80 backdrop-blur-sm rounded px-2 py-1">
        Drag to rotate • Scroll to zoom • Shift+Drag to pan
      </div>
    </div>
  );
}

// Preload helper
export function preloadModel(url) {
  useGLTF.preload(url);
}
