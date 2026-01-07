import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Environment, Grid } from "@react-three/drei";
import * as THREE from "three";

// Rotating cube component with different styles for variants
function RotatingCube({ variant = 1, autoRotate = true, color }) {
  const meshRef = useRef();
  
  // Different colors for different variants
  const colors = useMemo(() => ({
    1: color || "#22c55e", // Green
    2: color || "#3b82f6", // Blue
    3: color || "#a855f7", // Purple
    4: color || "#f59e0b", // Orange
  }), [color]);
  
  const cubeColor = colors[variant] || colors[1];
  
  // Rotation animation
  useFrame((state, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.x += delta * 0.3;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });
  
  return (
    <RoundedBox
      ref={meshRef}
      args={[1.5, 1.5, 1.5]}
      radius={0.1}
      smoothness={4}
    >
      <meshStandardMaterial
        color={cubeColor}
        metalness={0.3}
        roughness={0.4}
        envMapIntensity={0.8}
      />
    </RoundedBox>
  );
}

// Mini cube preview (for grid view in My Storage)
export function MiniCubePreview({ variant = 1, className = "", color }) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, -5]} intensity={0.3} />
        <Environment preset="city" />
        <RotatingCube variant={variant} autoRotate={true} color={color} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      </Canvas>
    </div>
  );
}

// Full demo cube viewer with controls
export default function DemoCube({ 
  variant = 1, 
  className = "", 
  showControls = true,
  autoRotate = true,
  showGrid = true,
  color
}) {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ antialias: true }}
        style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />
        <pointLight position={[0, 5, 0]} intensity={0.5} />
        
        <Environment preset="city" />
        
        {showGrid && (
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
            position={[0, -1.5, 0]}
          />
        )}
        
        <RotatingCube variant={variant} autoRotate={autoRotate} color={color} />
        
        {showControls && (
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={10}
          />
        )}
      </Canvas>
    </div>
  );
}
