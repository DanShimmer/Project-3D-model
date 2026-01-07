import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Environment, Grid, Cylinder, Sphere, Box } from "@react-three/drei";
import * as THREE from "three";

// =============================================
// DEMO 3D MODELS FOR SHOWCASE
// =============================================

// 1. Medieval Sword Model
function SwordModel({ autoRotate = true }) {
  const groupRef = useRef();
  
  useFrame((state, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });
  
  return (
    <group ref={groupRef} rotation={[0, 0, Math.PI / 6]}>
      {/* Blade */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.15, 2, 0.05]} />
        <meshStandardMaterial color="#a8a8a8" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Blade tip */}
      <mesh position={[0, 1.9, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.15, 0.15, 0.05]} />
        <meshStandardMaterial color="#a8a8a8" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Guard */}
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[0.6, 0.1, 0.15]} />
        <meshStandardMaterial color="#8B4513" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.6, 16]} />
        <meshStandardMaterial color="#4a3728" roughness={0.8} />
      </mesh>
      {/* Pommel */}
      <mesh position={[0, -1.05, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#8B4513" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Blade glow line */}
      <mesh position={[0, 0.8, 0.03]}>
        <boxGeometry args={[0.02, 1.8, 0.01]} />
        <meshStandardMaterial color="#e0e0e0" emissive="#ffffff" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

// 2. Cute Robot Model
function RobotModel({ autoRotate = true }) {
  const groupRef = useRef();
  
  useFrame((state, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Body */}
      <RoundedBox args={[1, 1.2, 0.8]} radius={0.15} smoothness={4} position={[0, 0, 0]}>
        <meshStandardMaterial color="#4fc3f7" metalness={0.3} roughness={0.4} />
      </RoundedBox>
      {/* Head */}
      <RoundedBox args={[0.8, 0.7, 0.7]} radius={0.15} smoothness={4} position={[0, 1, 0]}>
        <meshStandardMaterial color="#4fc3f7" metalness={0.3} roughness={0.4} />
      </RoundedBox>
      {/* Eyes */}
      <mesh position={[-0.2, 1.1, 0.35]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" emissive="#00ff00" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.2, 1.1, 0.35]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" emissive="#00ff00" emissiveIntensity={0.8} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
        <meshStandardMaterial color="#ff5722" metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ff5722" emissive="#ff5722" emissiveIntensity={0.5} />
      </mesh>
      {/* Arms */}
      <RoundedBox args={[0.25, 0.8, 0.25]} radius={0.08} position={[-0.7, 0.1, 0]}>
        <meshStandardMaterial color="#64b5f6" metalness={0.3} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.25, 0.8, 0.25]} radius={0.08} position={[0.7, 0.1, 0]}>
        <meshStandardMaterial color="#64b5f6" metalness={0.3} roughness={0.4} />
      </RoundedBox>
      {/* Legs */}
      <RoundedBox args={[0.3, 0.6, 0.3]} radius={0.08} position={[-0.25, -0.9, 0]}>
        <meshStandardMaterial color="#64b5f6" metalness={0.3} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.3, 0.6, 0.3]} radius={0.08} position={[0.25, -0.9, 0]}>
        <meshStandardMaterial color="#64b5f6" metalness={0.3} roughness={0.4} />
      </RoundedBox>
      {/* Chest panel */}
      <mesh position={[0, 0.1, 0.41]}>
        <boxGeometry args={[0.4, 0.5, 0.02]} />
        <meshStandardMaterial color="#263238" />
      </mesh>
      {/* Chest lights */}
      <mesh position={[-0.1, 0.2, 0.43]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#f44336" emissive="#f44336" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.1, 0.2, 0.43]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#4caf50" emissive="#4caf50" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// 3. Sports Car Model
function CarModel({ autoRotate = true }) {
  const groupRef = useRef();
  
  useFrame((state, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });
  
  return (
    <group ref={groupRef} scale={0.8}>
      {/* Main body */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.8, 0.4, 0.9]} />
        <meshStandardMaterial color="#e53935" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Hood - slanted front */}
      <mesh position={[0.7, 0.35, 0]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.6, 0.3, 0.85]} />
        <meshStandardMaterial color="#e53935" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Cabin */}
      <mesh position={[-0.1, 0.65, 0]}>
        <boxGeometry args={[0.9, 0.35, 0.8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0.35, 0.65, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.4, 0.35, 0.75]} />
        <meshStandardMaterial color="#1565c0" metalness={0.9} roughness={0.1} transparent opacity={0.6} />
      </mesh>
      {/* Rear */}
      <mesh position={[-0.8, 0.4, 0]}>
        <boxGeometry args={[0.4, 0.35, 0.85]} />
        <meshStandardMaterial color="#e53935" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Wheels */}
      {[[-0.55, 0, 0.5], [-0.55, 0, -0.5], [0.55, 0, 0.5], [0.55, 0, -0.5]].map((pos, i) => (
        <group key={i} position={pos}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.15, 24]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.16, 8]} />
            <meshStandardMaterial color="#bdbdbd" metalness={0.9} />
          </mesh>
        </group>
      ))}
      {/* Headlights */}
      <mesh position={[1, 0.35, 0.3]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffeb3b" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[1, 0.35, -0.3]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffeb3b" emissiveIntensity={0.8} />
      </mesh>
      {/* Tail lights */}
      <mesh position={[-1, 0.35, 0.3]}>
        <boxGeometry args={[0.02, 0.1, 0.15]} />
        <meshStandardMaterial color="#f44336" emissive="#f44336" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-1, 0.35, -0.3]}>
        <boxGeometry args={[0.02, 0.1, 0.15]} />
        <meshStandardMaterial color="#f44336" emissive="#f44336" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// 4. Cartoon Cat Model
function CatModel({ autoRotate = true }) {
  const groupRef = useRef();
  
  useFrame((state, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });
  
  return (
    <group ref={groupRef} position={[0, -0.3, 0]}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.6, 24, 24]} />
        <meshStandardMaterial color="#ff9800" roughness={0.9} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.8, 0.2]}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshStandardMaterial color="#ff9800" roughness={0.9} />
      </mesh>
      {/* Ears */}
      <mesh position={[-0.3, 1.3, 0.1]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.15, 0.3, 3]} />
        <meshStandardMaterial color="#ff9800" roughness={0.9} />
      </mesh>
      <mesh position={[0.3, 1.3, 0.1]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.15, 0.3, 3]} />
        <meshStandardMaterial color="#ff9800" roughness={0.9} />
      </mesh>
      {/* Inner ears */}
      <mesh position={[-0.28, 1.25, 0.15]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.08, 0.15, 3]} />
        <meshStandardMaterial color="#ffccbc" roughness={0.9} />
      </mesh>
      <mesh position={[0.28, 1.25, 0.15]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.08, 0.15, 3]} />
        <meshStandardMaterial color="#ffccbc" roughness={0.9} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.15, 0.9, 0.55]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.15, 0.9, 0.55]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Pupils */}
      <mesh position={[-0.15, 0.9, 0.67]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.15, 0.9, 0.67]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Nose */}
      <mesh position={[0, 0.75, 0.65]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#e91e63" />
      </mesh>
      {/* Mouth lines - simplified */}
      <mesh position={[0, 0.65, 0.62]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.02, 0.1, 0.02]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
      {/* Whiskers */}
      {[[-0.4, 0.72, 0.5], [-0.42, 0.68, 0.48], [0.4, 0.72, 0.5], [0.42, 0.68, 0.48]].map((pos, i) => (
        <mesh key={i} position={pos} rotation={[0, i < 2 ? 0.3 : -0.3, 0]}>
          <boxGeometry args={[0.25, 0.01, 0.01]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* Front paws */}
      <mesh position={[-0.25, -0.45, 0.3]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#ff9800" roughness={0.9} />
      </mesh>
      <mesh position={[0.25, -0.45, 0.3]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#ff9800" roughness={0.9} />
      </mesh>
      {/* Tail */}
      <mesh position={[-0.5, 0.2, -0.3]} rotation={[0.5, 0.3, 0.8]}>
        <cylinderGeometry args={[0.08, 0.05, 0.6, 12]} />
        <meshStandardMaterial color="#ff9800" roughness={0.9} />
      </mesh>
      {/* Stripes on body */}
      {[0.1, 0, -0.1].map((y, i) => (
        <mesh key={i} position={[0, y, 0.55]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.4, 0.05, 0.02]} />
          <meshStandardMaterial color="#e65100" />
        </mesh>
      ))}
    </group>
  );
}

// =============================================
// DEMO MODEL COMPONENTS EXPORTS
// =============================================

// Model type mapping
const MODEL_COMPONENTS = {
  sword: SwordModel,
  robot: RobotModel,
  car: CarModel,
  cat: CatModel,
};

// Demo model preview (for generate page variants)
export function DemoModelPreview({ modelType = "robot", autoRotate = true, className = "" }) {
  const ModelComponent = MODEL_COMPONENTS[modelType] || RobotModel;
  
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.5} />
        <pointLight position={[0, 5, 0]} intensity={0.5} />
        <Environment preset="city" />
        <ModelComponent autoRotate={autoRotate} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}

// Full demo model viewer with grid
export function DemoModelViewer({ 
  modelType = "robot", 
  autoRotate = true, 
  showGrid = true,
  className = "" 
}) {
  const ModelComponent = MODEL_COMPONENTS[modelType] || RobotModel;
  
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 1, 5], fov: 45 }}
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
        
        <ModelComponent autoRotate={autoRotate} />
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={10}
        />
      </Canvas>
    </div>
  );
}

// Export model types for reference
export const DEMO_MODEL_TYPES = {
  "A medieval-style sword": "sword",
  "A cute robot with rounded edges": "robot", 
  "A modern sports car": "car",
  "A cartoon cat sitting": "cat",
};

export default DemoModelViewer;
