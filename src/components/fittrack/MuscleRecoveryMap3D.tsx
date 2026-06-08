'use client';

import React, { Suspense, useEffect, useMemo, useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';

/**
 * Mappings for recovery colors
 */
const RECOVERY_COLORS = {
  fatigued: '#ef4444', // Red
  recovering: '#f59e0b', // Orange/Yellow
  recovered: '#10b981', // Green
  inactive: '#334155', // Slate-700 (Default)
};

type RecoveryStatus = 'fatigued' | 'recovering' | 'recovered' | 'inactive';

interface MuscleData {
  name: string;
  status: RecoveryStatus;
  lastTrained?: string;
}

interface MuscleRecoveryMap3DProps {
  data: Record<string, MuscleData>;
  modelUrl?: string;
}

/**
 * Muscle Mesh Component
 * Handles the individual muscle parts, their coloring and interactivity
 */
function MuscleModel({ data, modelUrl }: MuscleRecoveryMap3DProps) {
  const { scene } = useGLTF(modelUrl || '/models/human_muscles.glb');
  const [hovered, setHovered] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Pre-process materials and colors
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const muscleName = mesh.name.toLowerCase();
        
        // Find matching data (case-insensitive and partial match support)
        const muscleKey = Object.keys(data).find(key => 
          muscleName.includes(key.toLowerCase()) || key.toLowerCase().includes(muscleName)
        );

        const status = muscleKey ? data[muscleKey].status : 'inactive';
        
        // Ensure material is unique to this mesh for individual coloring
        mesh.material = (mesh.material as THREE.Material).clone();
        (mesh.material as THREE.MeshStandardMaterial).color.set(RECOVERY_COLORS[status]);
        (mesh.material as THREE.MeshStandardMaterial).roughness = 0.4;
        (mesh.material as THREE.MeshStandardMaterial).metalness = 0.2;
      }
    });
  }, [scene, data]);

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(e.object.name);
  };

  const handlePointerMove = (e: any) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <primitive 
        object={scene} 
        scale={2.2} 
        position={[0, -2, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={() => setHovered(null)}
        onPointerMove={handlePointerMove}
      />
      
      {hovered && (
        <Html pointerEvents="none" position={[0, 0, 0]} center>
          <div className="bg-background/95 backdrop-blur-md border border-border/50 p-3 rounded-2xl shadow-2xl min-w-[140px] animate-fade-in-up">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Muscle Group</p>
            <p className="font-black text-sm capitalize mb-2">{hovered}</p>
            
            {(() => {
              const muscleKey = Object.keys(data).find(key => 
                hovered.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(hovered.toLowerCase())
              );
              const info = muscleKey ? data[muscleKey] : null;

              return info ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RECOVERY_COLORS[info.status] }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{info.status}</span>
                  </div>
                  {info.lastTrained && (
                    <p className="text-[9px] text-muted-foreground font-medium">Last trained: {info.lastTrained}</p>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">No recent data</p>
              );
            })()}
          </div>
        </Html>
      )}
    </>
  );
}

/**
 * Main 3D Heatmap Component
 */
export function MuscleRecoveryMap3D({ data }: { data: Record<string, MuscleData> }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="w-full h-[400px] md:h-[500px] bg-slate-900/10 rounded-3xl relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#6366f1_0%,transparent_70%)]" />
      </div>

      <Suspense fallback={
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Initializing 3D Anatomy...</p>
        </div>
      }>
        <Canvas
          shadows
          camera={{ position: [0, 0, 5], fov: 45 }}
          dpr={[1, 2]} // Performance optimization for high-res screens
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          <Environment preset="city" />

          <MuscleModel data={data} />
          
          <OrbitControls 
            enablePan={false}
            minDistance={3}
            maxDistance={7}
            autoRotate
            autoRotateSpeed={0.5}
            enableDamping
            dampingFactor={0.05}
          />
          
          <ContactShadows 
            position={[0, -2, 0]} 
            opacity={0.4} 
            scale={10} 
            blur={2.5} 
            far={4} 
          />
        </Canvas>
      </Suspense>

      {/* Manual UI Overlays */}
      <div className="absolute top-6 left-6 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-3 bg-background/50 backdrop-blur-md px-4 py-2 rounded-xl border border-border/50">
          <RotateCcw className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Interact 360°</span>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex flex-col gap-1.5">
        {Object.entries(RECOVERY_COLORS).filter(([k]) => k !== 'inactive').map(([status, color]) => (
          <div key={status} className="flex items-center gap-2 bg-background/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/50">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{status}</span>
          </div>
        ))}
      </div>

      {/* Mock Model Warning - Since we can't guarantee the file exists yet */}
      <div className="absolute top-6 right-6 group-hover:opacity-100 opacity-0 transition-opacity">
        <div className="flex items-center gap-2 bg-warning/10 text-warning px-4 py-2 rounded-xl border border-warning/20">
          <AlertCircle className="h-3 w-3" />
          <span className="text-[10px] font-black uppercase tracking-widest">Model Path: /models/human_muscles.glb</span>
        </div>
      </div>
    </div>
  );
}
// Pre-load the model to avoid pop-in
useGLTF.preload('/models/human_muscles.glb');

