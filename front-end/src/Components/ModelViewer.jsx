import React, { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Center, Grid, Html, useProgress } from "@react-three/drei";
import { LucideDownload, LucideMaximize2, LucideRotateCcw, LucideZoomIn, LucideZoomOut, LucideMove } from "lucide-react";
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

// 3D Model component
function Model({ url, onLoaded }) {
  const { scene } = useGLTF(url);
  const ref = useRef();
  
  useEffect(() => {
    if (scene) {
      // Center and scale model
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      
      scene.scale.setScalar(scale);
      scene.position.sub(center.multiplyScalar(scale));
      
      // Call onLoaded callback
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

// Controls component
function CameraControls({ controlsRef }) {
  const { camera, gl } = useThree();
  
  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={0.5}
      maxDistance={10}
      maxPolarAngle={Math.PI}
    />
  );
}

// Main Viewer Component
export default function ModelViewer({ 
  modelUrl, 
  className = "",
  showControls = true,
  autoRotate = false,
  onDownload
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
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)' }}
      >
        <Suspense fallback={<Loader />}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />
          <pointLight position={[0, 5, 0]} intensity={0.5} />
          
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
          
          {/* Model */}
          <Center>
            <Model url={modelUrl} onLoaded={setModelInfo} />
          </Center>
          
          {/* Controls */}
          <CameraControls controlsRef={controlsRef} />
        </Suspense>
      </Canvas>
      
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
