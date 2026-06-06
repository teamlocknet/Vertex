'use client';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props { errors: number }

function MonolithBlock({ errors }: Props) {
  const solidRef = useRef<THREE.Mesh>(null);
  const wireRef  = useRef<THREE.Mesh>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;

    const amplitude = Math.min(errors * 0.004, 0.22);
    const st = Math.floor(t.current * 10) / 10;

    if (solidRef.current) {
      solidRef.current.position.x = Math.sin(st * 23) * amplitude;
      solidRef.current.position.y = Math.cos(st * 17) * amplitude * 0.8;
      solidRef.current.rotation.z = Math.sin(st * 8)  * amplitude * 0.4;
      solidRef.current.rotation.y += delta * 0.12;

      const mat = solidRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.15 + Math.min(errors / 80, 1) * 0.85;
    }

    if (wireRef.current && solidRef.current) {
      wireRef.current.position.copy(solidRef.current.position);
      wireRef.current.rotation.copy(solidRef.current.rotation);
    }
  });

  return (
    <>
      <mesh ref={solidRef} castShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial
          color="#8b0000"
          emissive="#dc2626"
          emissiveIntensity={0.15}
          roughness={0.25}
          metalness={0.75}
        />
      </mesh>
      <mesh ref={wireRef}>
        <boxGeometry args={[2.08, 2.08, 2.08]} />
        <meshBasicMaterial color="#ef4444" wireframe transparent opacity={0.28} />
      </mesh>
    </>
  );
}

export default function MonolithScene({ errors }: Props) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} gl={{ antialias: true }}>
      <ambientLight intensity={0.18} color="#ff2020" />
      <pointLight position={[4, 4, 4]}   color="#ef4444" intensity={4} />
      <pointLight position={[-4, -3, -3]} color="#7f1d1d" intensity={1.5} />
      <MonolithBlock errors={errors} />
    </Canvas>
  );
}
