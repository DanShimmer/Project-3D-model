import React, { useRef, useEffect, useState, useCallback, Suspense } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { OrbitControls, Environment, Html, useProgress } from "@react-three/drei";
import * as THREE from "three";

// Loading component
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white text-sm">{progress.toFixed(0)}% loaded</p>
      </div>
    </Html>
  );
}

// Paintable mesh component
function PaintableMesh({ 
  geometry, 
  isPainting, 
  brushColor, 
  brushSize,
  paintData,
  onPaint 
}) {
  const meshRef = useRef();
  const raycaster = useRef(new THREE.Raycaster());
  const { camera, gl, scene } = useThree();
  
  // Store painted vertices
  const [vertexColors, setVertexColors] = useState(null);
  
  // Initialize vertex colors
  useEffect(() => {
    if (geometry && !vertexColors) {
      const count = geometry.attributes.position.count;
      const colors = new Float32Array(count * 3);
      
      // Initialize with white/clay color
      for (let i = 0; i < count; i++) {
        colors[i * 3] = 0.88;     // R
        colors[i * 3 + 1] = 0.88; // G
        colors[i * 3 + 2] = 0.88; // B
      }
      
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      setVertexColors(colors);
    }
  }, [geometry, vertexColors]);
  
  // Apply paint data from props
  useEffect(() => {
    if (paintData && geometry && geometry.attributes.color) {
      const colors = geometry.attributes.color.array;
      
      Object.entries(paintData).forEach(([vertexIndex, color]) => {
        const idx = parseInt(vertexIndex);
        if (idx >= 0 && idx < colors.length / 3) {
          const rgb = hexToRgb(color);
          colors[idx * 3] = rgb.r / 255;
          colors[idx * 3 + 1] = rgb.g / 255;
          colors[idx * 3 + 2] = rgb.b / 255;
        }
      });
      
      geometry.attributes.color.needsUpdate = true;
    }
  }, [paintData, geometry]);
  
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 200, g: 200, b: 200 };
  };
  
  const handlePaint = useCallback((event) => {
    if (!isPainting || !meshRef.current || !geometry) return;
    
    // Get mouse position
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    // Raycast
    raycaster.current.setFromCamera(mouse, camera);
    const intersects = raycaster.current.intersectObject(meshRef.current);
    
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const face = intersect.face;
      const position = geometry.attributes.position;
      const colors = geometry.attributes.color;
      
      if (!colors) return;
      
      const rgb = hexToRgb(brushColor);
      const brushRadius = brushSize / 100 * 0.5; // Scale brush size
      
      // Get hit point in local space
      const hitPoint = intersect.point.clone();
      meshRef.current.worldToLocal(hitPoint);
      
      // Paint nearby vertices
      const paintedVertices = {};
      
      for (let i = 0; i < position.count; i++) {
        const vx = position.getX(i);
        const vy = position.getY(i);
        const vz = position.getZ(i);
        
        const distance = hitPoint.distanceTo(new THREE.Vector3(vx, vy, vz));
        
        if (distance <= brushRadius) {
          // Apply color with falloff
          const falloff = 1 - (distance / brushRadius);
          const blend = Math.pow(falloff, 0.5); // Smooth falloff
          
          const currentR = colors.getX(i);
          const currentG = colors.getY(i);
          const currentB = colors.getZ(i);
          
          colors.setXYZ(
            i,
            currentR * (1 - blend) + (rgb.r / 255) * blend,
            currentG * (1 - blend) + (rgb.g / 255) * blend,
            currentB * (1 - blend) + (rgb.b / 255) * blend
          );
          
          paintedVertices[i] = brushColor;
        }
      }
      
      colors.needsUpdate = true;
      
      // Notify parent
      if (onPaint && Object.keys(paintedVertices).length > 0) {
        onPaint(paintedVertices);
      }
    }
  }, [isPainting, brushColor, brushSize, geometry, camera, gl, onPaint]);
  
  // Add event listeners
  useEffect(() => {
    const canvas = gl.domElement;
    
    let isMouseDown = false;
    
    const onMouseDown = (e) => {
      if (isPainting && e.button === 0) {
        isMouseDown = true;
        handlePaint(e);
      }
    };
    
    const onMouseMove = (e) => {
      if (isMouseDown && isPainting) {
        handlePaint(e);
      }
    };
    
    const onMouseUp = () => {
      isMouseDown = false;
    };
    
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
    };
  }, [gl, isPainting, handlePaint]);
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        vertexColors 
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  );
}

// Demo Robot Geometry for painting
function PaintableRobot({ isPainting, brushColor, brushSize, paintData, onPaint }) {
  const groupRef = useRef();
  const [combinedGeometry, setCombinedGeometry] = useState(null);
  
  useEffect(() => {
    // Create combined geometry for the robot
    const geometries = [];
    const matrix = new THREE.Matrix4();
    
    // Body
    const bodyGeo = new THREE.BoxGeometry(1, 1.2, 0.8);
    bodyGeo.translate(0, 0, 0);
    geometries.push(bodyGeo);
    
    // Head
    const headGeo = new THREE.BoxGeometry(0.8, 0.7, 0.7);
    headGeo.translate(0, 1, 0);
    geometries.push(headGeo);
    
    // Eyes
    const eyeGeoL = new THREE.SphereGeometry(0.12, 16, 16);
    eyeGeoL.translate(-0.2, 1.1, 0.35);
    geometries.push(eyeGeoL);
    
    const eyeGeoR = new THREE.SphereGeometry(0.12, 16, 16);
    eyeGeoR.translate(0.2, 1.1, 0.35);
    geometries.push(eyeGeoR);
    
    // Antenna
    const antennaGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
    antennaGeo.translate(0, 1.5, 0);
    geometries.push(antennaGeo);
    
    const antennaBallGeo = new THREE.SphereGeometry(0.08, 16, 16);
    antennaBallGeo.translate(0, 1.7, 0);
    geometries.push(antennaBallGeo);
    
    // Arms
    const armGeoL = new THREE.CylinderGeometry(0.1, 0.08, 0.8, 12);
    armGeoL.translate(-0.7, 0.1, 0);
    geometries.push(armGeoL);
    
    const armGeoR = new THREE.CylinderGeometry(0.1, 0.08, 0.8, 12);
    armGeoR.translate(0.7, 0.1, 0);
    geometries.push(armGeoR);
    
    // Legs
    const legGeoL = new THREE.CylinderGeometry(0.12, 0.1, 0.8, 12);
    legGeoL.translate(-0.25, -1, 0);
    geometries.push(legGeoL);
    
    const legGeoR = new THREE.CylinderGeometry(0.12, 0.1, 0.8, 12);
    legGeoR.translate(0.25, -1, 0);
    geometries.push(legGeoR);
    
    // Feet
    const footGeoL = new THREE.BoxGeometry(0.25, 0.1, 0.35);
    footGeoL.translate(-0.25, -1.45, 0.05);
    geometries.push(footGeoL);
    
    const footGeoR = new THREE.BoxGeometry(0.25, 0.1, 0.35);
    footGeoR.translate(0.25, -1.45, 0.05);
    geometries.push(footGeoR);
    
    // Merge all geometries
    const mergedGeo = mergeBufferGeometries(geometries);
    setCombinedGeometry(mergedGeo);
    
  }, []);
  
  // Auto rotate when not painting
  useFrame((state, delta) => {
    if (groupRef.current && !isPainting) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });
  
  if (!combinedGeometry) return null;
  
  return (
    <group ref={groupRef}>
      <PaintableMesh
        geometry={combinedGeometry}
        isPainting={isPainting}
        brushColor={brushColor}
        brushSize={brushSize}
        paintData={paintData}
        onPaint={onPaint}
      />
    </group>
  );
}

// Helper function to merge geometries
function mergeBufferGeometries(geometries) {
  let totalVertices = 0;
  let totalIndices = 0;
  
  geometries.forEach(geo => {
    totalVertices += geo.attributes.position.count;
    if (geo.index) {
      totalIndices += geo.index.count;
    } else {
      totalIndices += geo.attributes.position.count;
    }
  });
  
  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const indices = [];
  
  let vertexOffset = 0;
  let indexOffset = 0;
  
  geometries.forEach(geo => {
    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    
    // Copy positions
    for (let i = 0; i < posAttr.count; i++) {
      positions[(vertexOffset + i) * 3] = posAttr.getX(i);
      positions[(vertexOffset + i) * 3 + 1] = posAttr.getY(i);
      positions[(vertexOffset + i) * 3 + 2] = posAttr.getZ(i);
      
      if (normAttr) {
        normals[(vertexOffset + i) * 3] = normAttr.getX(i);
        normals[(vertexOffset + i) * 3 + 1] = normAttr.getY(i);
        normals[(vertexOffset + i) * 3 + 2] = normAttr.getZ(i);
      }
    }
    
    // Copy indices
    if (geo.index) {
      for (let i = 0; i < geo.index.count; i++) {
        indices.push(geo.index.getX(i) + vertexOffset);
      }
    } else {
      for (let i = 0; i < posAttr.count; i++) {
        indices.push(i + vertexOffset);
      }
    }
    
    vertexOffset += posAttr.count;
  });
  
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setIndex(indices);
  merged.computeVertexNormals();
  
  return merged;
}

// Camera controls that disable during painting
function PaintControls({ isPainting }) {
  const controlsRef = useRef();
  const { camera, gl } = useThree();
  
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !isPainting;
    }
  }, [isPainting]);
  
  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enablePan={!isPainting}
      enableZoom={!isPainting}
      enableRotate={!isPainting}
      minDistance={2}
      maxDistance={10}
    />
  );
}

// Main Paint Viewer Component
export default function PaintableModelViewer({
  modelType = "robot",
  isPaintMode = false,
  brushColor = "#4caf50",
  brushSize = 50,
  paintData = {},
  onPaint,
  className = "",
  theme = "dark"
}) {
  const containerRef = useRef();
  
  const handlePaint = useCallback((newPaintData) => {
    if (onPaint) {
      onPaint(newPaintData);
    }
  }, [onPaint]);
  
  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ cursor: isPaintMode ? 'crosshair' : 'grab' }}
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ 
          background: theme === 'dark' 
            ? 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)' 
            : 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%)'
        }}
      >
        <Suspense fallback={<Loader />}>
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 5]} intensity={1} />
          <directionalLight position={[-5, -5, -5]} intensity={0.4} />
          <pointLight position={[0, 5, 0]} intensity={0.3} />
          
          {/* Environment */}
          <Environment preset="studio" />
          
          {/* Grid */}
          <gridHelper args={[10, 10, '#333', '#222']} position={[0, -1.5, 0]} />
          
          {/* Paintable Model */}
          {modelType === "robot" && (
            <PaintableRobot
              isPainting={isPaintMode}
              brushColor={brushColor}
              brushSize={brushSize}
              paintData={paintData}
              onPaint={handlePaint}
            />
          )}
          
          {/* Controls */}
          <PaintControls isPainting={isPaintMode} />
        </Suspense>
      </Canvas>
      
      {/* Paint mode indicator */}
      {isPaintMode && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-black/70 rounded-lg text-white text-sm">
          <div 
            className="w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: brushColor }}
          />
          <span>Paint Mode Active</span>
        </div>
      )}
    </div>
  );
}
