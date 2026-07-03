'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { MuscleState, SubMuscleId } from '@/workout/muscleCoverage';

/**
 * Lightweight stylized 3D muscle mannequin.
 * Built entirely from parametric low-poly meshes (no downloaded model),
 * one region per muscle, drag-to-rotate with slow auto-spin.
 * Loaded ONLY via next/dynamic (ssr:false) so three.js stays out of the main bundle.
 */

const STATE_COLORS: Record<MuscleState, { color: string; emissive: string; intensity: number }> = {
  covered: { color: '#22c55e', emissive: '#15803d', intensity: 0.55 },
  secondary: { color: '#86efac', emissive: '#22c55e', intensity: 0.25 },
  pending: { color: '#ef4444', emissive: '#991b1b', intensity: 0.45 },
  idle: { color: '#52525b', emissive: '#000000', intensity: 0 },
};

type RegionDef = {
  muscle: SubMuscleId;
  pos: [number, number, number];
  scale: [number, number, number];
  mirror?: boolean;
};

/** Muscle regions positioned proud of the mannequin scaffold. */
const REGIONS: RegionDef[] = [
  // Chest (front)
  { muscle: 'chest-upper', pos: [0.2, 1.6, 0.2], scale: [0.16, 0.075, 0.08], mirror: true },
  { muscle: 'chest-mid', pos: [0.21, 1.48, 0.225], scale: [0.17, 0.08, 0.085], mirror: true },
  { muscle: 'chest-lower', pos: [0.19, 1.36, 0.21], scale: [0.15, 0.065, 0.08], mirror: true },
  // Core (front/side)
  { muscle: 'abs-upper', pos: [0, 1.1, 0.21], scale: [0.17, 0.14, 0.07] },
  { muscle: 'abs-lower', pos: [0, 0.84, 0.2], scale: [0.15, 0.12, 0.07] },
  { muscle: 'obliques', pos: [0.26, 0.98, 0.14], scale: [0.075, 0.19, 0.08], mirror: true },
  // Shoulders
  { muscle: 'front-delts', pos: [0.55, 1.62, 0.11], scale: [0.095, 0.1, 0.085], mirror: true },
  { muscle: 'side-delts', pos: [0.64, 1.62, 0], scale: [0.085, 0.11, 0.095], mirror: true },
  { muscle: 'rear-delts', pos: [0.55, 1.62, -0.11], scale: [0.095, 0.1, 0.085], mirror: true },
  // Arms
  { muscle: 'biceps', pos: [0.62, 1.28, 0.09], scale: [0.085, 0.16, 0.075], mirror: true },
  { muscle: 'triceps-long', pos: [0.6, 1.26, -0.1], scale: [0.08, 0.17, 0.075], mirror: true },
  { muscle: 'triceps-lateral', pos: [0.7, 1.3, -0.06], scale: [0.06, 0.14, 0.06], mirror: true },
  { muscle: 'forearms', pos: [0.68, 0.82, 0], scale: [0.075, 0.2, 0.075], mirror: true },
  // Back
  { muscle: 'traps', pos: [0, 1.76, -0.14], scale: [0.26, 0.11, 0.08] },
  { muscle: 'mid-back', pos: [0, 1.5, -0.21], scale: [0.2, 0.13, 0.06] },
  { muscle: 'lats', pos: [0.27, 1.28, -0.18], scale: [0.13, 0.22, 0.07], mirror: true },
  { muscle: 'lower-back', pos: [0, 1.0, -0.19], scale: [0.13, 0.13, 0.06] },
  // Legs
  { muscle: 'glutes', pos: [0.15, 0.48, -0.18], scale: [0.14, 0.13, 0.1], mirror: true },
  { muscle: 'quads', pos: [0.22, 0.02, 0.11], scale: [0.13, 0.3, 0.09], mirror: true },
  { muscle: 'adductors', pos: [0.1, 0.08, 0.04], scale: [0.07, 0.22, 0.08], mirror: true },
  { muscle: 'hamstrings', pos: [0.22, -0.02, -0.11], scale: [0.115, 0.28, 0.08], mirror: true },
  { muscle: 'calves', pos: [0.22, -0.88, -0.09], scale: [0.09, 0.24, 0.08], mirror: true },
];

/** Neutral mannequin scaffold the muscle regions sit on. */
const SCAFFOLD: { pos: [number, number, number]; scale: [number, number, number] }[] = [
  { pos: [0, 2.02, 0], scale: [0.28, 0.33, 0.3] }, // head
  { pos: [0, 1.72, 0], scale: [0.11, 0.14, 0.11] }, // neck
  { pos: [0, 1.32, 0], scale: [0.46, 0.5, 0.24] }, // upper torso
  { pos: [0, 0.9, 0], scale: [0.34, 0.3, 0.21] }, // waist
  { pos: [0, 0.55, 0], scale: [0.38, 0.26, 0.22] }, // pelvis
  { pos: [0.62, 1.28, 0], scale: [0.1, 0.26, 0.1] }, // upper arm L/R via mirror below
  { pos: [0.68, 0.82, 0], scale: [0.085, 0.24, 0.085] }, // forearm
  { pos: [0.71, 0.52, 0], scale: [0.08, 0.1, 0.08] }, // hand
  { pos: [0.22, 0.0, 0], scale: [0.14, 0.36, 0.13] }, // thigh
  { pos: [0.22, -0.9, 0], scale: [0.1, 0.34, 0.1] }, // shin
  { pos: [0.22, -1.42, 0.07], scale: [0.1, 0.06, 0.16] }, // foot
];

function Region({
  def,
  state,
  highlighted,
}: {
  def: RegionDef;
  state: MuscleState;
  highlighted: boolean;
}) {
  const { color, emissive, intensity } = STATE_COLORS[state];
  const emissiveIntensity = highlighted ? Math.max(intensity, 0.9) : intensity;
  const positions: [number, number, number][] = def.mirror
    ? [def.pos, [-def.pos[0], def.pos[1], def.pos[2]]]
    : [def.pos];

  return (
    <>
      {positions.map((pos, i) => (
        <mesh key={`${def.muscle}-${i}`} position={pos} scale={def.scale}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            roughness={0.5}
            metalness={0.05}
          />
        </mesh>
      ))}
    </>
  );
}

function Mannequin({
  states,
  highlight,
  rotYRef,
  draggingRef,
}: {
  states: Record<SubMuscleId, MuscleState>;
  highlight: Set<SubMuscleId>;
  rotYRef: React.MutableRefObject<number>;
  draggingRef: React.MutableRefObject<boolean>;
}) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!draggingRef.current) rotYRef.current += delta * 0.45; // slow auto-spin
    if (group.current) group.current.rotation.y = rotYRef.current;
  });

  const scaffoldMeshes = useMemo(() => {
    const meshes: { pos: [number, number, number]; scale: [number, number, number] }[] = [];
    for (const part of SCAFFOLD) {
      meshes.push(part);
      if (part.pos[0] !== 0) {
        meshes.push({ pos: [-part.pos[0], part.pos[1], part.pos[2]], scale: part.scale });
      }
    }
    return meshes;
  }, []);

  return (
    <group ref={group} position={[0, -0.25, 0]}>
      {scaffoldMeshes.map((part, i) => (
        <mesh key={`scaffold-${i}`} position={part.pos} scale={part.scale}>
          <sphereGeometry args={[1, 12, 9]} />
          <meshStandardMaterial color="#3f3f46" roughness={0.65} metalness={0.05} />
        </mesh>
      ))}
      {REGIONS.map((def) => (
        <Region
          key={def.muscle}
          def={def}
          state={states[def.muscle] ?? 'idle'}
          highlighted={highlight.has(def.muscle)}
        />
      ))}
    </group>
  );
}

export interface MuscleBody3DProps {
  states: Record<SubMuscleId, MuscleState>;
  /** Regions to glow brighter (e.g. previewing a suggested exercise). */
  highlight?: SubMuscleId[];
}

export default function MuscleBody3D({ states, highlight = [] }: MuscleBody3DProps) {
  const rotYRef = useRef(0.4);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const highlightSet = useMemo(() => new Set(highlight), [highlight]);

  return (
    <div
      className="h-full w-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        draggingRef.current = true;
        lastXRef.current = e.clientX;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current) return;
        rotYRef.current += (e.clientX - lastXRef.current) * 0.012;
        lastXRef.current = e.clientX;
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.9, 4.4], fov: 38 }}
        gl={{ antialias: true, powerPreference: 'low-power', alpha: true }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} />
        <directionalLight position={[-3, 2, -4]} intensity={0.45} />
        <Mannequin
          states={states}
          highlight={highlightSet}
          rotYRef={rotYRef}
          draggingRef={draggingRef}
        />
      </Canvas>
    </div>
  );
}
