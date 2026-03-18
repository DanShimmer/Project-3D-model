import React, { Suspense, useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";

/**
 * Lightweight 3D model thumbnail for My Storage / Showcase cards.
 * Renders the actual GLB model in a small Three.js canvas with auto-rotation.
 * 
 * PRIORITY ORDER:
 *   1. 3D Canvas (actual spinning model) — always preferred when modelUrl exists
 *   2. Thumbnail image (server-rendered PNG)
 *   3. Placeholder icon
 * 
 * Uses IntersectionObserver to only mount the Canvas when visible,
 * avoiding WebGL context limit issues with many cards on screen.
 */

// Tiny spinning model — no controls, just the mesh rotating
function TinyModel({ url }) {
  const { scene } = useGLTF(url);
  const ref = useRef();
  
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    // Ensure untextured models are visible (bright material on dark bg)
    clone.traverse((child) => {
      if (child.isMesh) {
        const mat = child.material.clone();
        // If material has no map (untextured), make it a visible light gray
        if (!mat.map) {
          mat.color = new THREE.Color(0.75, 0.75, 0.78);
          mat.roughness = 0.6;
          mat.metalness = 0.1;
        }
        child.material = mat;
      }
    });
    return clone;
  }, [scene]);
  
  // Auto-rotate
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.6;
    }
  });
  
  return (
    <group ref={ref}>
      <Center>
        <primitive object={clonedScene} />
      </Center>
    </group>
  );
}

// Error boundary for Three.js loading failures
function ModelErrorFallback({ name }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-800/80">
      <div className="text-center">
        <div className="text-2xl mb-1 opacity-50">📦</div>
        <p className="text-[10px] text-gray-500 px-2 truncate max-w-full">{name || "3D Model"}</p>
      </div>
    </div>
  );
}

export default function ModelThumbnail({ modelUrl, thumbnailUrl, name, className = "" }) {
  const [isVisible, setIsVisible] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const containerRef = useRef(null);
  
  // Reset states when URLs change
  useEffect(() => {
    setCanvasFailed(false);
    setImgFailed(false);
  }, [modelUrl, thumbnailUrl]);
  
  // IntersectionObserver: only mount Canvas when card is visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "100px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  
  const hasModel = modelUrl && (modelUrl.startsWith('http') || modelUrl.startsWith('/'));
  const hasThumbnail = thumbnailUrl && (thumbnailUrl.startsWith('http') || thumbnailUrl.startsWith('/'));
  
  // STRATEGY:
  // 1. ALWAYS prefer 3D Canvas if modelUrl available (shows actual spinning model)
  // 2. Fall back to thumbnail image if Canvas fails
  // 3. Fall back to placeholder if everything fails
  
  // 3D Canvas — preferred path
  if (hasModel && !canvasFailed) {
    return (
      <div ref={containerRef} className={`relative w-full h-full ${className}`}>
        {isVisible ? (
          <ErrorBoundary onError={() => setCanvasFailed(true)} fallback={
            hasThumbnail && !imgFailed 
              ? <img src={thumbnailUrl} alt={name} className="w-full h-full object-contain bg-gray-900" onError={() => { setImgFailed(true); setCanvasFailed(true); }} />
              : <ModelErrorFallback name={name} />
          }>
            <Canvas
              camera={{ position: [0, 0.5, 2.8], fov: 35 }}
              style={{ background: 'rgb(17, 24, 39)' }}
              gl={{ antialias: false, alpha: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true }}
              dpr={1}
              frameloop="always"
              onCreated={({ gl }) => {
                // Reduce memory: small thumbnail doesn't need high quality
                gl.toneMapping = THREE.NoToneMapping;
              }}
            >
              <ambientLight intensity={0.8} />
              <directionalLight position={[3, 5, 4]} intensity={1.0} />
              <directionalLight position={[-3, 2, -2]} intensity={0.4} />
              <hemisphereLight args={['#b1e1ff', '#3d3d3d', 0.5]} />
              <Suspense fallback={null}>
                <TinyModel url={modelUrl} />
              </Suspense>
            </Canvas>
          </ErrorBoundary>
        ) : (
          // Placeholder while not visible (saves WebGL contexts)
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="w-6 h-6 border-2 border-gray-700 border-t-green-500/50 rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }
  
  // Thumbnail image fallback
  if (hasThumbnail && !imgFailed) {
    return (
      <div ref={containerRef} className={`relative w-full h-full ${className}`}>
        <img
          src={thumbnailUrl}
          alt={name || "3D Model"}
          className="w-full h-full object-contain bg-gray-900"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }
  
  // Final fallback — placeholder
  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <ModelErrorFallback name={name} />
    </div>
  );
}

/**
 * Simple React error boundary for catching Three.js / GLTF load errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error) {
    console.warn("ModelThumbnail 3D error:", error?.message);
    this.props.onError?.();
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}
