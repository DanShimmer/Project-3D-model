import React, { useRef, useEffect, useState, Suspense, useCallback, forwardRef, useImperativeHandle } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Center, Grid, Html, useProgress } from "@react-three/drei";
import { LucideDownload, LucideMaximize2, LucideRotateCcw, LucideZoomIn, LucideZoomOut, LucideMove, LucidePaintbrush, LucideAlertTriangle, LucideRefreshCw } from "lucide-react";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

/**
 * Error boundary to catch Three.js / GLTF loading crashes.
 * Without this, a failed useGLTF() call would crash the entire React tree.
 */
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.warn("ModelViewer 3D load error:", error?.message);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

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
function PaintableModel({ url, onLoaded, isPaintMode, paintColor, brushSize, brushMode, onPaint, wireframe, brightness, playAnimation, onSceneReady }) {
  const { scene, animations } = useGLTF(url);
  const ref = useRef();
  const { raycaster, camera, gl } = useThree();
  const isPaintingRef = useRef(false);
  const lastPaintPosRef = useRef(null);
  const mixerRef = useRef(null);
  const actionsRef = useRef([]);
  const skeletonFixedRef = useRef(false);
  
  // Expose scene to parent for GLB export
  useEffect(() => {
    if (scene && onSceneReady) {
      onSceneReady(scene);
    }
  }, [scene, onSceneReady]);
  
  // Fix SkinnedMesh skeleton binding after <Center> repositions the model.
  // <Center> wraps the scene in a translated group, which shifts bone matrixWorld
  // values but does NOT update inverseBindMatrices. This mismatch causes:
  // - Skinned vertices to be offset from where they should be
  // - Animation to appear broken (some verts move, others stuck)
  // Fix: After the first render frame (when matrixWorld is up-to-date),
  // recalculate the skeleton's inverse bind matrices.
  useEffect(() => {
    skeletonFixedRef.current = false;
  }, [scene]);
  
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
    // Fix skeleton binding on the first frame after scene loads.
    // Must happen in useFrame (not useEffect) because <Center>'s useLayoutEffect
    // sets the group position, but matrixWorld isn't updated until Three.js renders.
    // On the first frame, all matrixWorld values are current → safe to recalculate.
    if (!skeletonFixedRef.current && scene) {
      // Force update world matrices through the entire hierarchy
      let root = scene;
      while (root.parent) root = root.parent;
      root.updateMatrixWorld(true);
      
      scene.traverse((child) => {
        if (child.isSkinnedMesh && child.skeleton) {
          // Recalculate inverse bind matrices from current bone world positions
          // This accounts for any parent transforms (like <Center>'s offset)
          child.skeleton.calculateInverses();
          // Update bind matrix to match current mesh world position
          child.bindMatrix.copy(child.matrixWorld);
          child.bindMatrixInverse.copy(child.bindMatrix).invert();
          console.log("🦴 Fixed SkinnedMesh skeleton binding (inverses recalculated)");
        }
      });
      skeletonFixedRef.current = true;
    }
    
    if (mixerRef.current && playAnimation) {
      mixerRef.current.update(delta);
    }
    // Auto rotation (only when not in paint mode and not playing animation)
    if (ref.current && window.autoRotate && !isPaintMode && !playAnimation) {
      ref.current.rotation.y += delta * 0.5;
    }
  });
  
  // ONE-TIME initialization: setup paint surfaces (texture-based or vertex fallback)
  // NOTE: We do NOT manually scale/center here — <Center> handles that
  const PAINT_TEX_SIZE = 2048; // High-res canvas for crisp painting
  
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        // Disable frustum culling for SkinnedMesh — during animation, bone
        // deformations can move vertices outside the rest-pose bounding box,
        // causing Three.js to incorrectly cull (hide) the mesh
        if (child.isSkinnedMesh) {
          child.frustumCulled = false;
        }
        if (child.isMesh && child.geometry) {
          if (child.material._isPaintSetup) return;
          
          const geo = child.geometry;
          const mat = child.material;
          const hasUV = !!geo.attributes.uv;
          const hasTextureMap = !!(mat.map || mat.emissiveMap);
          
          child.material = child.material.clone();
          
          if (hasUV) {
            // ═══ TEXTURE-BASED PAINTING (high quality, pixel-perfect) ═══
            // Paint on a 2048×2048 canvas mapped via UV — resolution-independent,
            // crisp colors regardless of mesh vertex count.
            const canvas = document.createElement('canvas');
            canvas.width = PAINT_TEX_SIZE;
            canvas.height = PAINT_TEX_SIZE;
            const ctx = canvas.getContext('2d');
            
            // Initialize canvas: preserve existing texture or use base color
            let initialized = false;
            if (hasTextureMap && mat.map && mat.map.image) {
              try {
                ctx.drawImage(mat.map.image, 0, 0, PAINT_TEX_SIZE, PAINT_TEX_SIZE);
                initialized = true;
              } catch(e) { /* CORS or incomplete image — fall through */ }
            }
            if (!initialized) {
              const baseHex = mat.color ? `#${mat.color.getHexString()}` : '#b0b0b0';
              ctx.fillStyle = baseHex;
              ctx.fillRect(0, 0, PAINT_TEX_SIZE, PAINT_TEX_SIZE);
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.flipY = false; // Match glTF convention
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.needsUpdate = true;
            
            child.material.map = texture;
            child.material.color.set(0xffffff);
            child.material.vertexColors = false;
            child.material._paintCanvas = canvas;
            child.material._paintCtx = ctx;
            child.material._paintTexture = texture;
            child.material._paintMode = 'texture';
          } else {
            // ═══ VERTEX-COLOR FALLBACK (no UVs available) ═══
            const count = geo.attributes.position.count;
            const colors = new Float32Array(count * 3);
            const baseColor = mat.color || new THREE.Color(1, 1, 1);
            for (let i = 0; i < count; i++) {
              colors[i * 3] = baseColor.r;
              colors[i * 3 + 1] = baseColor.g;
              colors[i * 3 + 2] = baseColor.b;
            }
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            child.material.vertexColors = true;
            child.material.color.set(0xffffff);
            child.material._paintMode = 'vertex';
          }
          
          child.material._isPaintSetup = true;
          child.material.needsUpdate = true;
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

  // Paint — texture-based (high quality) with vertex-color fallback
  const paintAtPoint = useCallback((intersect) => {
    if (!intersect || !intersect.object) return;
    
    const mesh = intersect.object;
    const mat = mesh.material;
    const paintMode = mat._paintMode;
    if (!paintMode) return;
    
    if (paintMode === 'texture') {
      // ═══ TEXTURE PAINTING — pixel-perfect, crisp, beautiful colors ═══
      const ctx = mat._paintCtx;
      const canvas = mat._paintCanvas;
      const texture = mat._paintTexture;
      if (!ctx || !canvas || !texture) return;
      
      const w = canvas.width;
      const h = canvas.height;
      
      if (brushMode === 'fill') {
        // Fill entire texture with solid color — instant, clean
        ctx.fillStyle = paintColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        // Brush mode — paint soft circle at UV position
        const uv = intersect.uv;
        if (!uv) return;
        
        const x = uv.x * w;
        const y = (1 - uv.y) * h; // UV v=0 is bottom, canvas y=0 is top
        const radius = Math.max(4, (brushSize / 100) * 80);
        
        // Parse hex color for gradient
        const hexStr = paintColor.replace('#', '');
        const cr = parseInt(hexStr.substring(0, 2), 16);
        const cg = parseInt(hexStr.substring(2, 4), 16);
        const cb = parseInt(hexStr.substring(4, 6), 16);
        
        // Soft-edged brush: solid center 65%, smooth fade to edge
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${cr},${cg},${cb},1)`);
        gradient.addColorStop(0.65, `rgba(${cr},${cg},${cb},1)`);
        gradient.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
      }
      
      texture.needsUpdate = true;
      if (onPaint) {
        onPaint({ meshId: mesh.uuid, color: paintColor, point: intersect.point });
      }
      
    } else {
      // ═══ VERTEX-COLOR FALLBACK (for meshes without UVs) ═══
      const geo = mesh.geometry;
      const colorAttr = geo.attributes.color;
      const posAttr = geo.attributes.position;
      if (!colorAttr || !posAttr) return;
      
      const newColor = new THREE.Color(paintColor);
      let painted = false;
      
      if (brushMode === 'fill') {
        for (let i = 0; i < posAttr.count; i++) {
          colorAttr.setXYZ(i, newColor.r, newColor.g, newColor.b);
        }
        painted = true;
      } else {
        const localPoint = mesh.worldToLocal(intersect.point.clone());
        const box = new THREE.Box3().setFromBufferAttribute(posAttr);
        const meshSize = box.getSize(new THREE.Vector3()).length();
        const radius = (brushSize / 100) * meshSize * 0.15;
        const radiusSq = radius * radius;
        
        for (let i = 0; i < posAttr.count; i++) {
          const dx = posAttr.getX(i) - localPoint.x;
          const dy = posAttr.getY(i) - localPoint.y;
          const dz = posAttr.getZ(i) - localPoint.z;
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq <= radiusSq) {
            colorAttr.setXYZ(i, newColor.r, newColor.g, newColor.b);
            painted = true;
          }
        }
      }
      
      if (painted) {
        colorAttr.needsUpdate = true;
        if (onPaint) {
          onPaint({ meshId: mesh.uuid, color: paintColor, point: intersect.point });
        }
      }
    }
  }, [paintColor, brushSize, brushMode, onPaint]);

  // Raycast and paint — with stroke interpolation for smooth continuous strokes
  const doPaint = useCallback((event) => {
    if (!isPaintMode || !paintColor || !ref.current) return;
    
    // Get normalized device coordinates
    const rect = gl.domElement.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const mouse = new THREE.Vector2(mouseX, mouseY);
    
    // Interpolate between last and current position for smooth strokes
    const lastPos = lastPaintPosRef.current;
    const positions = [mouse];
    
    if (lastPos) {
      const dx = mouseX - lastPos.x;
      const dy = mouseY - lastPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Interpolation step size — smaller = smoother but more raycasts
      const stepSize = 0.008;
      if (dist > stepSize) {
        const steps = Math.min(Math.ceil(dist / stepSize), 20); // Cap at 20 sub-steps
        positions.length = 0;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          positions.push(new THREE.Vector2(
            lastPos.x + dx * t,
            lastPos.y + dy * t
          ));
        }
      }
    }
    
    lastPaintPosRef.current = { x: mouseX, y: mouseY };
    
    // Paint at each interpolated position
    for (const pos of positions) {
      raycaster.setFromCamera(pos, camera);
      const intersects = raycaster.intersectObject(scene, true);
      if (intersects.length > 0) {
        paintAtPoint(intersects[0]);
      }
    }
  }, [isPaintMode, paintColor, scene, raycaster, camera, gl, paintAtPoint]);

  // Setup pointer event listeners for click-and-drag painting
  // Use pointer events (not mouse events) because OrbitControls uses pointerdown/
  // pointermove internally and can suppress mousedown via preventDefault.
  useEffect(() => {
    if (!isPaintMode) return;
    
    const canvas = gl.domElement;
    
    const onPointerDown = (e) => {
      if (e.button !== 0) return; // Left button only
      e.stopPropagation(); // Prevent OrbitControls from consuming this
      isPaintingRef.current = true;
      canvas.setPointerCapture(e.pointerId); // Capture so we get moves even outside canvas
      doPaint(e);
    };
    
    const onPointerMove = (e) => {
      if (!isPaintingRef.current) return;
      e.stopPropagation();
      doPaint(e);
    };
    
    const onPointerUp = (e) => {
      if (isPaintingRef.current) {
        canvas.releasePointerCapture(e.pointerId);
      }
      isPaintingRef.current = false;
      lastPaintPosRef.current = null;
    };
    
    const onPointerLeave = () => {
      isPaintingRef.current = false;
      lastPaintPosRef.current = null;
    };
    
    // Use capture phase to intercept before OrbitControls
    canvas.addEventListener('pointerdown', onPointerDown, { capture: true });
    canvas.addEventListener('pointermove', onPointerMove, { capture: true });
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown, { capture: true });
      canvas.removeEventListener('pointermove', onPointerMove, { capture: true });
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
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
function CameraControls({ controlsRef, enableRotate = true, enabled = true }) {
  const { camera, gl } = useThree();
  
  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enabled={enabled}
      enablePan={enabled}
      enableZoom={true}
      enableRotate={enableRotate}
      minDistance={0.5}
      maxDistance={20}
      maxPolarAngle={Math.PI}
    />
  );
}

// Auto-fit camera to model bounding box
function AutoFitCamera({ modelUrl, controlsRef }) {
  const { camera, scene } = useThree();
  const fitted = useRef(false);
  const prevUrl = useRef(null);
  
  // Reset when model URL changes so camera re-fits to new model bounds
  useEffect(() => {
    if (modelUrl !== prevUrl.current) {
      fitted.current = false;
      prevUrl.current = modelUrl;
      // Clear GLTF cache for old URL to prevent stale model
      // (new URL will be loaded fresh by useGLTF)
    }
  }, [modelUrl]);
  
  useFrame(() => {
    if (fitted.current) return;
    
    // IMPORTANT: Only measure the model container, NOT the Grid (10x10) or lights.
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
      
      // CRITICAL: Update OrbitControls target to match model center.
      // Without this, zoom/pan/rotate orbit around (0,0,0) while the model
      // is at a different position → user can't control the view properly.
      if (controlsRef?.current) {
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }
      
      fitted.current = true;
    }
  });
  
  return null;
}

// Main Viewer Component
const ModelViewer = forwardRef(function ModelViewer({ 
  modelUrl, 
  className = "",
  showControls = true,
  autoRotate = false,
  onDownload,
  // Paint mode props
  isPaintMode = false,
  paintColor = "#4caf50",
  brushSize = 50,
  brushMode = "brush",
  onPaint,
  // Visual props
  wireframe = false,
  brightness = 100,
  // Animation props
  playAnimation = false
}, ref) {
  const controlsRef = useRef();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef();
  const [modelInfo, setModelInfo] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const sceneRef = useRef(null);
  
  // Expose exportAsGLB to parent via ref
  useImperativeHandle(ref, () => ({
    exportAsGLB: () => {
      return new Promise((resolve, reject) => {
        if (!sceneRef.current) {
          reject(new Error("No scene loaded"));
          return;
        }
        const exporter = new GLTFExporter();
        exporter.parse(
          sceneRef.current,
          (result) => {
            // result is ArrayBuffer for binary=true
            resolve(result);
          },
          (error) => {
            reject(error);
          },
          { binary: true }  // Export as GLB (binary)
        );
      });
    },
    hasVertexColors: () => {
      if (!sceneRef.current) return false;
      let hasPaint = false;
      sceneRef.current.traverse((child) => {
        if (child.isMesh && child.geometry?.attributes?.color) {
          hasPaint = true;
        }
      });
      return hasPaint;
    }
  }), []);
  
  // Callback to receive scene from PaintableModel
  const handleSceneReady = useCallback((scene) => {
    sceneRef.current = scene;
  }, []);

  // Reset error state and clear old model cache when modelUrl changes
  const prevModelUrlRef = useRef(null);
  useEffect(() => {
    // Clear useGLTF cache for the PREVIOUS URL to prevent stale model display
    if (prevModelUrlRef.current && prevModelUrlRef.current !== modelUrl) {
      try { useGLTF.clear(prevModelUrlRef.current); } catch(e) {}
    }
    prevModelUrlRef.current = modelUrl;
    setLoadError(null);
    setRetryKey(k => k + 1);
  }, [modelUrl]);

  const handleRetry = () => {
    // Clear useGLTF cache for this URL so it re-fetches
    try { useGLTF.clear(modelUrl); } catch(e) {}
    setLoadError(null);
    setRetryKey(k => k + 1);
  };
  
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
  
  // Error fallback UI
  if (loadError) {
    return (
      <div 
        ref={containerRef}
        className={`relative bg-gray-900/50 rounded-xl border border-red-900/30 overflow-hidden flex items-center justify-center ${className}`}
      >
        <div className="text-center p-6">
          <LucideAlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
          <p className="text-white font-medium mb-1">Model could not be loaded</p>
          <p className="text-gray-400 text-sm mb-4 max-w-xs">
            {loadError.message?.includes('Failed to fetch')
              ? 'The AI service may not be running. Start the AI service and try again.'
              : 'The model file may be unavailable or corrupted.'}
          </p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-lime-600 hover:bg-lime-500 text-white rounded-lg text-sm flex items-center gap-2 mx-auto transition-colors"
          >
            <LucideRefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative bg-gray-900/50 rounded-xl border border-gray-800/30 overflow-hidden ${className}`}
    >
      {/* 3D Canvas — wrapped in ErrorBoundary to catch GLTF load failures */}
      <ModelErrorBoundary
        key={retryKey}
        onError={(err) => setLoadError(err || new Error('Model load failed'))}
        fallback={null}
      >
      <Canvas
        camera={{ position: [0, 0.3, 2.5], fov: 45 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)' }}
        className={isPaintMode ? 'paint-cursor' : ''}
      >
        <Suspense fallback={<Loader />}>
          {/* Auto-fit camera to model bounds (resets when modelUrl changes) */}
          <AutoFitCamera modelUrl={modelUrl} controlsRef={controlsRef} />
          
          {/* Lighting — bright enough to show textures clearly */}
          <ambientLight intensity={0.8 * (brightness / 100)} />
          <directionalLight position={[10, 10, 5]} intensity={1.2 * (brightness / 100)} />
          <directionalLight position={[-10, -10, -5]} intensity={0.6 * (brightness / 100)} />
          <pointLight position={[0, 5, 0]} intensity={0.4 * (brightness / 100)} />
          
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
          
          {/* Model - wrapped in named group for AutoFitCamera bbox (excludes Grid) 
              key={modelUrl} forces full remount when URL changes — prevents stale 
              scene/skeleton state from previous model bleeding into new one */}
          <group name="model-container" key={modelUrl}>
            <Center>
              <PaintableModel 
                url={modelUrl} 
                onLoaded={setModelInfo} 
                isPaintMode={isPaintMode}
                paintColor={paintColor}
                brushSize={brushSize}
                brushMode={brushMode}
                onPaint={onPaint}
                wireframe={wireframe}
                brightness={brightness}
                playAnimation={playAnimation}
                onSceneReady={handleSceneReady}
              />
            </Center>
          </group>
          
          {/* Controls - disable rotate when painting */}
          <CameraControls controlsRef={controlsRef} enableRotate={!isPaintMode} enabled={!isPaintMode} />
        </Suspense>
      </Canvas>
      </ModelErrorBoundary>
      
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
});

export default ModelViewer;

// Preload helper
export function preloadModel(url) {
  useGLTF.preload(url);
}
