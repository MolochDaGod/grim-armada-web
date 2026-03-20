import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, Text, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { CombatState } from '../core/types';

// ===== Player Character =====
function PlayerCharacter() {
  const meshRef = useRef<THREE.Group>(null);
  const position = useGameStore(s => s.playerPosition);
  const rotation = useGameStore(s => s.playerRotation);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(position[0], 0.75, position[2]);
      meshRef.current.rotation.y = rotation;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.3, 1, 8, 16]} />
        <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#e8dfc8" />
      </mesh>
      {/* Weapon indicator */}
      <mesh position={[0.4, -0.1, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
        <meshStandardMaterial color="#8b8b8b" metalness={0.8} />
      </mesh>
      {/* Name plate */}
      <Text position={[0, 1.5, 0]} fontSize={0.2} color="#d4af37" anchorX="center" font={undefined}>
        Commander
      </Text>
    </group>
  );
}

// ===== Enemy NPC =====
function EnemyNPC({ actorId, name, color, pos, level }: {
  actorId: string; name: string; color: string; pos: [number, number, number]; level: number;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const setTarget = useGameStore(s => s.setTarget);
  const targetId = useGameStore(s => s.targetId);
  const enemies = useGameStore(s => s.enemies);
  const enemy = enemies.find(e => e.actorId === actorId);
  const isTargeted = targetId === actorId;
  const isDead = enemy?.ham.isDead ?? false;
  const healthPct = enemy ? enemy.ham.health.percentage : 1;

  // Floating animation
  useFrame((_, dt) => {
    if (meshRef.current && !isDead) {
      meshRef.current.position.y = pos[1] + 0.75 + Math.sin(Date.now() * 0.002) * 0.05;
    }
  });

  if (isDead) {
    return (
      <group position={[pos[0], 0.1, pos[2]]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <capsuleGeometry args={[0.3, 1, 8, 16]} />
          <meshStandardMaterial color="#333" transparent opacity={0.5} />
        </mesh>
        <Text position={[0, 0, -0.5]} fontSize={0.18} color="#666" anchorX="center" rotation={[-Math.PI / 2, 0, 0]} font={undefined}>
          {name} (Dead)
        </Text>
      </group>
    );
  }

  return (
    <group ref={meshRef} position={[pos[0], 0.75, pos[2]]}
      onClick={(e) => { e.stopPropagation(); setTarget(actorId); }}>
      {/* Selection ring */}
      {isTargeted && (
        <mesh position={[0, -0.75, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.7, 32]} />
          <meshBasicMaterial color="#ff4444" side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Body */}
      <mesh>
        <capsuleGeometry args={[0.3, 1, 8, 16]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Health bar background */}
      <mesh position={[0, 1.3, 0]}>
        <planeGeometry args={[0.8, 0.08]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* Health bar fill */}
      <mesh position={[(healthPct - 1) * 0.4, 1.3, 0.001]}>
        <planeGeometry args={[0.8 * healthPct, 0.06]} />
        <meshBasicMaterial color={healthPct > 0.5 ? '#4ade80' : healthPct > 0.25 ? '#f59e0b' : '#ef4444'} />
      </mesh>
      {/* Name */}
      <Text position={[0, 1.5, 0]} fontSize={0.16} color={isTargeted ? '#ff6666' : '#ccc'} anchorX="center" font={undefined}>
        {`[${level}] ${name}`}
      </Text>
    </group>
  );
}

// ===== Third-Person Camera (over-shoulder, W = forward) =====
function ThirdPersonCamera() {
  const { camera } = useThree();
  const position = useGameStore(s => s.playerPosition);
  const rotation = useGameStore(s => s.playerRotation);

  useFrame(() => {
    const offset = new THREE.Vector3(1.5, 3, 6);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    camera.position.lerp(
      new THREE.Vector3(position[0] + offset.x, position[1] + offset.y, position[2] + offset.z),
      0.08
    );
    camera.lookAt(position[0], position[1] + 1, position[2]);
  });

  return null;
}

// ===== Game Loop =====
function GameLoop() {
  const tick = useGameStore(s => s.tick);
  useFrame((_, dt) => { tick(Math.min(dt, 0.1)); });
  return null;
}

// ===== Terrain =====
function Terrain() {
  return (
    <>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#1a2a1a" roughness={0.9} />
      </mesh>
      <Grid
        position={[0, 0, 0]}
        args={[80, 80]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#2a3a2a"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#3a4a3a"
        fadeDistance={60}
        infiniteGrid={false}
      />
      {/* Decorative rocks */}
      {[[-8, 0.3, -5], [15, 0.5, 12], [-12, 0.4, 20], [20, 0.3, -8]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <dodecahedronGeometry args={[p[1] * 2, 0]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
        </mesh>
      ))}
      {/* Trees (simple cones) */}
      {[[-6, 3], [8, -12], [-15, 10], [18, 5], [-3, -20], [22, -15]].map((p, i) => (
        <group key={`tree-${i}`} position={[p[0], 0, p[1]]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <coneGeometry args={[1.2, 3, 6]} />
            <meshStandardMaterial color="#1a4a1a" />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 0.6, 8]} />
            <meshStandardMaterial color="#5a3a1a" />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ===== Main Scene Component =====
export default function DemoScene() {
  const enemies = useGameStore(s => s.enemies);
  const setTarget = useGameStore(s => s.setTarget);

  return (
    <Canvas
      shadows
      camera={{ fov: 55, near: 0.1, far: 200, position: [0, 5, 10] }}
      style={{ position: 'absolute', inset: 0 }}
      onPointerMissed={() => setTarget(null)}
    >
      <color attach="background" args={['#0a0e14']} />
      <fog attach="fog" args={['#0a0e14', 30, 80]} />

      {/* Lighting */}
      <ambientLight intensity={0.3} color="#6688aa" />
      <directionalLight position={[20, 30, 10]} intensity={1.2} color="#ffeedd" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-far={100} />
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#d4af37" />

      <Stars radius={100} depth={50} count={2000} factor={3} fade speed={0.5} />

      <ThirdPersonCamera />
      <GameLoop />
      <Terrain />
      <PlayerCharacter />

      {enemies.map(e => (
        <EnemyNPC key={e.actorId} actorId={e.actorId} name={e.name} color={e.color} pos={e.positionVec} level={e.level} />
      ))}
    </Canvas>
  );
}
