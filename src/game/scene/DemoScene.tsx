import { useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { GLTFModel } from './ModelLoader';
import { BulletRenderer } from './BulletSystem';
import { createAnimState, updateProceduralAnim, triggerShoot, triggerHit, triggerDeath, type AnimState } from './ProceduralAnim';
import { ScreenShake, DamageNumbers } from './VFX';
import { PostFX } from './PostFX';
import { WeaponView } from './WeaponSystem';
import { audioManager } from '../audio/AudioManager';

// ===== Model paths (GLB) =====
const MODELS = {
  player: '/models/player/player.glb',
  weaponRifle: '/models/weapons/assault_rifle.glb',
  weaponAK: '/models/weapons/ak74u.glb',
  weaponSMG: '/models/weapons/smg.glb',
  mutant: '/models/enemies/mutant.glb',
  alien: '/models/enemies/alien.glb',
  spikeball: '/models/enemies/spikeball.glb',
  rock1: '/models/terrain/rock1.glb',
  rock2: '/models/terrain/rock2.glb',
  cliff1: '/models/terrain/cliff1.glb',
  cliff2: '/models/terrain/cliff2.glb',
  tree1: '/models/terrain/tree1.glb',
  bush: '/models/terrain/bush.glb',
  sandbags: '/models/terrain/sandbags.glb',
  barrel: '/models/terrain/barrel.glb',
  watchtower: '/models/structures/watchtower.glb',
  cabin: '/models/structures/cabin.glb',
  securityPost: '/models/structures/security_post.glb',
  searchlight: '/models/structures/searchlight.glb',
};

// ===== Footstep + Audio Tracker =====
function AudioTracker() {
  const prevPos = useRef<[number, number, number]>([0, 0, 0]);

  useFrame((_, dt) => {
    const cdt = Math.min(dt, 0.05);
    const pos = useGameStore.getState().playerPosition;
    const dx = pos[0] - prevPos.current[0];
    const dz = pos[2] - prevPos.current[2];
    const speed = Math.sqrt(dx * dx + dz * dz) / cdt;
    prevPos.current = [...pos];
    audioManager.updateFootsteps(cdt, speed, speed > 10);
  });

  return null;
}

// ===== Player Character with Procedural Animation =====
function PlayerCharacter() {
  const outerRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const animRef = useRef<AnimState>(createAnimState());
  const prevPos = useRef<[number, number, number]>([0, 0, 0]);
  const position = useGameStore(s => s.playerPosition);
  const rotation = useGameStore(s => s.playerRotation);

  useFrame((_, dt) => {
    const cdt = Math.min(dt, 0.05);
    if (outerRef.current) {
      outerRef.current.position.set(position[0], 0, position[2]);
      outerRef.current.rotation.y = rotation;
    }

    // Detect movement
    const dx = position[0] - prevPos.current[0];
    const dz = position[2] - prevPos.current[2];
    const speed = Math.sqrt(dx * dx + dz * dz) / cdt;
    animRef.current.isMoving = speed > 0.5;
    animRef.current.moveSpeed = Math.min(speed / 10, 1);
    prevPos.current = [...position];

    // Apply procedural animations
    if (modelRef.current) updateProceduralAnim(modelRef.current, animRef.current, cdt);
  });

  return (
    <group ref={outerRef}>
      <group ref={modelRef}>
        <GLTFModel url={MODELS.player} normalizedHeight={1.8} />
      </group>
      {/* Weapon rendered on character body */}
      <group position={[0.3, 0.9, -0.2]} rotation={[0, 0, -0.1]}>
        <GLTFModel url={MODELS.weaponRifle} normalizedHeight={0.8} />
      </group>
      <Text position={[0, 2.2, 0]} fontSize={0.2} color="#d4af37" anchorX="center" font={undefined}>
        Commander
      </Text>
    </group>
  );
}

// ===== Enemy NPC with Real Models + Procedural Animations =====
function EnemyNPC({ actorId, name, color, pos, level, modelUrl }: {
  actorId: string; name: string; color: string; pos: [number, number, number]; level: number;
  modelUrl: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const animRef = useRef<AnimState>(createAnimState());
  const wasDead = useRef(false);
  const setTarget = useGameStore(s => s.setTarget);
  const targetId = useGameStore(s => s.targetId);
  const enemies = useGameStore(s => s.enemies);
  const enemy = enemies.find(e => e.actorId === actorId);
  const isTargeted = targetId === actorId;
  const isDead = enemy?.ham.isDead ?? false;
  const healthPct = enemy ? enemy.ham.health.percentage : 1;

  useFrame((_, dt) => {
    const cdt = Math.min(dt, 0.05);

    // Detect death transition
    if (isDead && !wasDead.current) { triggerDeath(animRef.current); wasDead.current = true; }
    animRef.current.isDead = isDead;

    // Idle facing rotation
    if (groupRef.current && !isDead) {
      groupRef.current.rotation.y += 0.3 * cdt;
    }

    // Apply procedural animation
    if (modelRef.current) updateProceduralAnim(modelRef.current, animRef.current, cdt);
  });

  return (
    <group
      ref={groupRef}
      position={[pos[0], pos[1], pos[2]]}
      onClick={(e: any) => { e.stopPropagation(); if (!isDead) setTarget(actorId); }}
    >
      {/* Selection ring */}
      {isTargeted && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.0, 1.15, 32]} />
          <meshBasicMaterial color="#ff4444" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}

      {/* Real enemy model with procedural animation */}
      <group ref={modelRef}>
        <GLTFModel
          url={modelUrl}
          normalizedHeight={modelUrl.includes('spikeball') ? 1.2 : 2.0}
        />
      </group>

      {/* Health bar */}
      {!isDead && (
        <group position={[0, 2.4, 0]}>
          <mesh>
            <planeGeometry args={[1.2, 0.12]} />
            <meshBasicMaterial color="#111" transparent opacity={0.8} />
          </mesh>
          <mesh position={[(healthPct - 1) * 0.6, 0, 0.001]}>
            <planeGeometry args={[1.2 * healthPct, 0.08]} />
            <meshBasicMaterial color={healthPct > 0.5 ? '#4ade80' : healthPct > 0.25 ? '#f59e0b' : '#ef4444'} />
          </mesh>
        </group>
      )}

      {/* Name */}
      <Text
        position={[0, isDead ? 0.5 : 2.7, 0]}
        fontSize={0.22}
        color={isDead ? '#666' : isTargeted ? '#ff6666' : '#ccc'}
        anchorX="center"
        font={undefined}
      >
        {isDead ? `${name} (Dead)` : `[${level}] ${name}`}
      </Text>
    </group>
  );
}

// ===== Fortnite-Style Third-Person Camera =====
function ThirdPersonCamera() {
  const { camera, gl } = useThree();
  const position = useGameStore(s => s.playerPosition);
  const cameraYaw = useGameStore(s => s.cameraYaw);
  const cameraPitch = useGameStore(s => s.cameraPitch);
  const setCameraRotation = useGameStore(s => s.setCameraRotation);
  const smoothPos = useRef(new THREE.Vector3());
  const smoothCamPos = useRef(new THREE.Vector3());
  const isLocked = useRef(false);

  // Pointer lock on click
  useEffect(() => {
    const canvas = gl.domElement;
    const onClick = () => {
      if (!isLocked.current) canvas.requestPointerLock();
    };
    const onLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return;
      const sensitivity = 0.002;
      const newYaw = cameraYawRef.current - e.movementX * sensitivity;
      const newPitch = Math.max(-0.35, Math.min(1.2, cameraPitchRef.current + e.movementY * sensitivity));
      cameraYawRef.current = newYaw;
      cameraPitchRef.current = newPitch;
      setCameraRotation(newYaw, newPitch);
    };
    canvas.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    return () => {
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [gl, setCameraRotation]);

  // Refs to avoid stale closure in mousemove
  const cameraYawRef = useRef(cameraYaw);
  const cameraPitchRef = useRef(cameraPitch);
  useEffect(() => { cameraYawRef.current = cameraYaw; }, [cameraYaw]);
  useEffect(() => { cameraPitchRef.current = cameraPitch; }, [cameraPitch]);

  useFrame((_, dt) => {
    const lerpFactor = 1 - Math.pow(0.001, dt); // ~smooth at any framerate

    // Smooth follow player position
    smoothPos.current.lerp(
      new THREE.Vector3(position[0], position[1], position[2]),
      lerpFactor,
    );

    // Over-the-shoulder offset in spherical coords
    const distance = 5.0;
    const shoulderX = 1.0;
    const heightOffset = 2.0;

    const camX = smoothPos.current.x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * distance + Math.cos(cameraYaw) * shoulderX;
    const camY = smoothPos.current.y + heightOffset + Math.sin(cameraPitch) * distance;
    const camZ = smoothPos.current.z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * distance - Math.sin(cameraYaw) * shoulderX;

    const targetCamPos = new THREE.Vector3(camX, camY, camZ);
    smoothCamPos.current.lerp(targetCamPos, lerpFactor);

    camera.position.copy(smoothCamPos.current);
    camera.lookAt(
      smoothPos.current.x,
      smoothPos.current.y + 1.4,
      smoothPos.current.z,
    );
  });

  return null;
}

// ===== Game Loop =====
function GameLoop() {
  const tick = useGameStore(s => s.tick);
  useFrame((_, dt) => { tick(Math.min(dt, 0.1)); });
  return null;
}

// ===== Terrain with GLB models =====
function Terrain() {
  return (
    <group>
      {/* Ground — dark military terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[120, 120, 32, 32]} />
        <meshStandardMaterial color="#1a2610" roughness={0.95} />
      </mesh>
      {/* Dirt patches */}
      {[[5, 0, -3], [-8, 0, 10], [15, 0, 5], [-5, 0, -15], [20, 0, -10]].map((p, i) => (
        <mesh key={`dirt-${i}`} rotation={[-Math.PI / 2, 0, i * 1.2]} position={p as [number, number, number]} receiveShadow>
          <circleGeometry args={[2 + i * 0.5, 16]} />
          <meshStandardMaterial color="#2a2210" roughness={1} />
        </mesh>
      ))}

      {/* Rocks */}
      <GLTFModel url={MODELS.rock1} position={[-12, 0, -8]} normalizedHeight={1.5} rotation={[0, 0.5, 0]} />
      <GLTFModel url={MODELS.rock1} position={[18, 0, 14]} normalizedHeight={2.0} rotation={[0, 2.1, 0]} />
      <GLTFModel url={MODELS.rock2} position={[-20, 0, 20]} normalizedHeight={1.8} rotation={[0, 1.2, 0]} />
      <GLTFModel url={MODELS.rock2} position={[25, 0, -5]} normalizedHeight={1.2} rotation={[0, 3.5, 0]} />
      <GLTFModel url={MODELS.rock1} position={[8, 0, -22]} normalizedHeight={2.5} rotation={[0, 4.2, 0]} />
      <GLTFModel url={MODELS.rock2} position={[-25, 0, -15]} normalizedHeight={1.0} rotation={[0, 0.8, 0]} />

      {/* Cliffs — map boundaries */}
      <GLTFModel url={MODELS.cliff1} position={[-35, 0, 0]} normalizedHeight={8} rotation={[0, 0.3, 0]} />
      <GLTFModel url={MODELS.cliff2} position={[35, 0, -10]} normalizedHeight={10} rotation={[0, 2.5, 0]} />
      <GLTFModel url={MODELS.cliff1} position={[0, 0, -40]} normalizedHeight={7} rotation={[0, 1.8, 0]} />
      <GLTFModel url={MODELS.cliff2} position={[-30, 0, 30]} normalizedHeight={9} rotation={[0, 4.0, 0]} />

      {/* Trees */}
      {[
        [-8, 0, 5], [10, 0, -15], [-18, 0, 12], [22, 0, 8], [-5, 0, -25],
        [28, 0, -18], [-15, 0, -20], [12, 0, 22], [-25, 0, 5], [5, 0, 30],
        [-30, 0, -8], [30, 0, 15], [-10, 0, 28], [20, 0, -25],
      ].map((p, i) => (
        <GLTFModel key={`tree-${i}`} url={MODELS.tree1}
          position={p as [number, number, number]} normalizedHeight={4 + Math.sin(i * 1.7) * 2} rotation={[0, i * 1.3, 0]} />
      ))}

      {/* Bushes */}
      {[
        [-3, 0, 2], [7, 0, -8], [-14, 0, 16], [16, 0, 3], [-7, 0, -12],
        [3, 0, 18], [-20, 0, -5], [24, 0, -14], [0, 0, -10],
      ].map((p, i) => (
        <GLTFModel key={`bush-${i}`} url={MODELS.bush}
          position={p as [number, number, number]} normalizedHeight={0.5 + Math.sin(i * 2.1) * 0.3} rotation={[0, i * 2.5, 0]} />
      ))}

      {/* Barrels */}
      <GLTFModel url={MODELS.barrel} position={[3, 0, -5]} normalizedHeight={0.9} />
      <GLTFModel url={MODELS.barrel} position={[4.2, 0, -4.5]} normalizedHeight={0.9} rotation={[0, 0.8, 0]} />
      <GLTFModel url={MODELS.barrel} position={[-15, 0, 8]} normalizedHeight={0.9} rotation={[0.3, 0, 0]} />

      {/* Sandbags */}
      <GLTFModel url={MODELS.sandbags} position={[6, 0, -3]} normalizedHeight={0.8} />
      <GLTFModel url={MODELS.sandbags} position={[-12, 0, 15]} normalizedHeight={0.8} rotation={[0, 1.5, 0]} />
      <GLTFModel url={MODELS.sandbags} position={[20, 0, 0]} normalizedHeight={0.8} rotation={[0, -0.7, 0]} />
    </group>
  );
}

// ===== Structures =====
function Structures() {
  return (
    <group>
      <GLTFModel url={MODELS.watchtower} position={[-22, 0, -25]} normalizedHeight={12} rotation={[0, 0.4, 0]} />
      <GLTFModel url={MODELS.cabin} position={[-6, 0, 4]} normalizedHeight={4} rotation={[0, -0.3, 0]} />
      <GLTFModel url={MODELS.securityPost} position={[15, 0, -8]} normalizedHeight={3.5} rotation={[0, 1.2, 0]} />
      <GLTFModel url={MODELS.searchlight} position={[10, 0, 10]} normalizedHeight={3} rotation={[0, 2.0, 0]} />
      <GLTFModel url={MODELS.searchlight} position={[-18, 0, -10]} normalizedHeight={3} rotation={[0, 0.5, 0]} />
    </group>
  );
}

// ===== Main Scene =====
export default function DemoScene() {
  const enemies = useGameStore(s => s.enemies);
  const setTarget = useGameStore(s => s.setTarget);

  const enemyModels = [
    MODELS.mutant,
    MODELS.alien,
    MODELS.spikeball,
  ];

  return (
    <Canvas
      shadows
      camera={{ fov: 60, near: 0.1, far: 250, position: [0, 5, 10] }}
      style={{ position: 'absolute', inset: 0 }}
      onPointerMissed={() => setTarget(null)}
    >
      <color attach="background" args={['#080c10']} />
      <fog attach="fog" args={['#080c10', 40, 100]} />

      {/* Dramatic outdoor military lighting */}
      <ambientLight intensity={0.2} color="#4466aa" />
      <directionalLight
        position={[30, 40, 20]} intensity={1.5} color="#ffeedd" castShadow
        shadow-mapSize={[4096, 4096]} shadow-camera-far={120}
        shadow-camera-left={-50} shadow-camera-right={50}
        shadow-camera-top={50} shadow-camera-bottom={-50}
      />
      <pointLight position={[0, 10, 0]} intensity={0.3} color="#d4af37" />
      {/* Colored rim lights near enemy positions */}
      <pointLight position={[12, 3, 8]} intensity={0.5} color="#ff4444" distance={15} />
      <pointLight position={[-10, 3, 15]} intensity={0.4} color="#4488ff" distance={15} />
      <pointLight position={[5, 3, -18]} intensity={0.6} color="#aa22aa" distance={15} />

      {/* Environment lighting for realistic reflections */}
      <Environment preset="night" background={false} />
      <Stars radius={120} depth={60} count={3000} factor={4} fade speed={0.3} />

      <ThirdPersonCamera />
      <GameLoop />
      <AudioTracker />
      <BulletRenderer />
      <ScreenShake />
      <DamageNumbers />

      {/* Enhanced post-processing stack */}
      <PostFX />

      <Suspense fallback={null}>
        <Terrain />
        <Structures />
        <PlayerCharacter />

        {enemies.map((e, i) => (
          <EnemyNPC
            key={e.actorId} actorId={e.actorId} name={e.name} color={e.color}
            pos={e.positionVec} level={e.level}
            modelUrl={enemyModels[i % enemyModels.length]}
          />
        ))}
      </Suspense>
    </Canvas>
  );
}
