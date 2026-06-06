'use client';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OrbConfig {
  radius: number;
  speedMul: number;
  phase: number;
  color: string;
  size: number;
  tilt: number;
}

const ORBS: OrbConfig[] = [
  { radius: 1.8, speedMul: 1.0, phase: 0,                    color: '#00ff88', size: 0.12, tilt: 0 },
  { radius: 1.4, speedMul: 1.5, phase: Math.PI / 3,          color: '#22d3ee', size: 0.10, tilt: 0.4 },
  { radius: 2.1, speedMul: 0.7, phase: (2 * Math.PI) / 3,    color: '#34d399', size: 0.14, tilt: -0.3 },
  { radius: 1.6, speedMul: 1.2, phase: Math.PI,              color: '#00ffcc', size: 0.11, tilt: 0.6 },
  { radius: 1.0, speedMul: 1.8, phase: (4 * Math.PI) / 3,   color: '#67e8f9', size: 0.08, tilt: -0.5 },
  { radius: 2.3, speedMul: 0.6, phase: (5 * Math.PI) / 3,   color: '#00ff88', size: 0.13, tilt: 0.2 },
];

function FlowOrb({ radius, speedMul, phase, color, size, tilt, tps }: OrbConfig & { tps: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(phase);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const speed = speedMul * (0.7 + tps / 500);
    t.current += delta * speed;
    ref.current.position.x = Math.cos(t.current) * radius;
    ref.current.position.y = Math.sin(t.current + tilt) * radius * 0.45;
    ref.current.position.z = Math.sin(t.current * 0.8 + tilt) * radius * 0.3;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
    </mesh>
  );
}

function CoreNode() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.35;
    ref.current.rotation.y += delta * 0.55;
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.42, 1]} />
      <meshStandardMaterial
        color="#00ffcc"
        emissive="#00ffcc"
        emissiveIntensity={0.7}
        wireframe
      />
    </mesh>
  );
}

export default function VertexScene({ tps }: { tps: number }) {
  return (
    <Canvas camera={{ position: [0, 0, 5.5], fov: 50 }} gl={{ antialias: true }}>
      <ambientLight intensity={0.12} color="#00ff88" />
      <pointLight position={[0, 0, 0]}   color="#00ffcc" intensity={5} />
      <pointLight position={[4, 2, -2]}  color="#22d3ee" intensity={2} />
      <pointLight position={[-3, -2, 3]} color="#34d399" intensity={1.5} />
      <CoreNode />
      {ORBS.map((orb, i) => (
        <FlowOrb key={i} {...orb} tps={tps} />
      ))}
    </Canvas>
  );
}
