import { useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { FBXModel } from './ModelLoader';
import { BulletRenderer, fireShot } from './BulletSystem';
import { createAnimState, updateProceduralAnim, updateWeaponAnim, triggerShoot, triggerHit, triggerDeath, type AnimState } from './ProceduralAnim';

// ===== Model paths =====
const MODELS = {
  player: '/models/player/player.fbx',
  weaponRifle: '/models/weapons/assault_rifle.fbx',
  weaponAK: '/models/weapons/ak74u.fbx',
  weaponSMG: '/models/weapons/smg.fbx',
  mutant: '/models/enemies/mutant.fbx',
  alien: '/models/enemies/alien.fbx',
  spikeball: '/models/enemies/spikeball.fbx',
  rock1: '/models/terrain/rock1.fbx',
  rock2: '/models/terrain/rock2.fbx',
  cliff1: '/models/terrain/cliff1.fbx',
  cliff2: '/models/terrain/cliff2.fbx',
  tree1: '/models/terrain/tree1.fbx',
  bush: '/models/terrain/bush.fbx',
  sandbags: '/models/terrain/sandbags.fbx',
  barrel: '/models/terrain/barrel.fbx',
  watchtower: '/models/structures/watchtower.fbx',
  cabin: '/models/structures/cabin.fbx',
  securityPost: '/models/structures/security_post.fbx',
  searchlight: '/models/structures/searchlight.fbx',
};

// ===== Player Character with Procedural Animation =====
function PlayerCharacter() {
  const outerRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const weaponRef = useRef<THREE.Group>(null);
  const animRef = useRef<AnimState>(createAnimState());
  const prevPos = useRef<[number, number, number]>([0, 0, 0]);
  const position = useGameStore(s => s.playerPosition);
  const rotation = useGameStore(s => s.playerRotation);

  // Subscribe to attack events for shoot animation
  useEffect(() => {
    const unsub = useGameStore.subscribe((s) => {
      // Set callback
    });
    useGameStore.setState({
      _onAttackVisual: (result) => {
        if (result.attackerId === 'player') triggerShoot(animRef.current);
        if (result.targetId === 'player' && result.hit) triggerHit(animRef.current);
      },
    });
    return unsub;
  }, []);

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
    if (weaponRef.current) updateWeaponAnim(weaponRef.current, animRef.current, cdt);
  });

  return (
    <group ref={outerRef}>
      <group ref={modelRef}>
        <FBXModel url={MODELS.player} materialPreset="player" normalizedHeight={1.8} />
      </group>
      {/* Weapon with recoil animation */}
      <group ref={weaponRef} position={[0.3, 0.9, -0.2]} rotation={[0, 0, -0.1]}>
        <FBXModel url={MODELS.weaponRifle} materialPreset="weapon" normalizedHeight={0.8} />
      </group>
      <Text position={[0, 2.2, 0]} fontSize={0.2} color="#d4af37" anchorX="center" font={undefined}>
        Commander
      </Text>
    </group>
  );
}

// ===== Enemy NPC with Real Models + Procedural Animations =====
function EnemyNPC({ actorId, name, color, pos, level, modelUrl, materialPreset }: {
  actorId: string; name: string; color: string; pos: [number, number, number]; level: number;
  modelUrl: string; materialPreset: 'mutant' | 'alien' | 'spikeball';
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
        <FBXModel
          url={modelUrl}
          materialPreset={materialPreset}
          normalizedHeight={materialPreset === 'spikeball' ? 1.2 : 2.0}
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

// ===== Third-Person Shooter Camera (over-shoulder) =====
function TPSCamera() {
  const { camera } = useThree();
  const position = useGameStore(s => s.playerPosition);
  const rotation = useGameStore(s => s.playerRotation);
  const targetPos = useRef(new THREE.Vector3());

  useFrame(() => {
    const offset = new THREE.Vector3(1.2, 2.5, 5);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    targetPos.current.set(position[0] + offset.x, position[1] + offset.y, position[2] + offset.z);
    camera.position.lerp(targetPos.current, 0.06);
    camera.lookAt(position[0], position[1] + 1.2, position[2]);
  });

  return null;
}

// ===== Game Loop =====
function GameLoop() {
  const tick = useGameStore(s => s.tick);
  useFrame((_, dt) => { tick(Math.min(dt, 0.1)); });
  return null;
}

// ===== Real Terrain with FBX models =====
function Terrain() {
  return (
    <group>
      {/* Ground — dark military terrain, no grid */}
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

      {/* Real rocks */}
      <FBXModel url={MODELS.rock1} materialPreset="rock" position={[-12, 0, -8]} normalizedHeight={1.5} rotation={[0, 0.5, 0]} />
      <FBXModel url={MODELS.rock1} materialPreset="rock" position={[18, 0, 14]} normalizedHeight={2.0} rotation={[0, 2.1, 0]} />
      <FBXModel url={MODELS.rock2} materialPreset="rock" position={[-20, 0, 20]} normalizedHeight={1.8} rotation={[0, 1.2, 0]} />
      <FBXModel url={MODELS.rock2} materialPreset="rock" position={[25, 0, -5]} normalizedHeight={1.2} rotation={[0, 3.5, 0]} />
      <FBXModel url={MODELS.rock1} materialPreset="rock" position={[8, 0, -22]} normalizedHeight={2.5} rotation={[0, 4.2, 0]} />
      <FBXModel url={MODELS.rock2} materialPreset="rock" position={[-25, 0, -15]} normalizedHeight={1.0} rotation={[0, 0.8, 0]} />

      {/* Real cliffs — map boundaries */}
      <FBXModel url={MODELS.cliff1} materialPreset="cliff" position={[-35, 0, 0]} normalizedHeight={8} rotation={[0, 0.3, 0]} />
      <FBXModel url={MODELS.cliff2} materialPreset="cliff" position={[35, 0, -10]} normalizedHeight={10} rotation={[0, 2.5, 0]} />
      <FBXModel url={MODELS.cliff1} materialPreset="cliff" position={[0, 0, -40]} normalizedHeight={7} rotation={[0, 1.8, 0]} />
      <FBXModel url={MODELS.cliff2} materialPreset="cliff" position={[-30, 0, 30]} normalizedHeight={9} rotation={[0, 4.0, 0]} />

      {/* Real trees */}
      {[
        [-8, 0, 5], [10, 0, -15], [-18, 0, 12], [22, 0, 8], [-5, 0, -25],
        [28, 0, -18], [-15, 0, -20], [12, 0, 22], [-25, 0, 5], [5, 0, 30],
        [-30, 0, -8], [30, 0, 15], [-10, 0, 28], [20, 0, -25],
      ].map((p, i) => (
        <FBXModel key={`tree-${i}`} url={MODELS.tree1} materialPreset="tree"
          position={p as [number, number, number]} normalizedHeight={4 + Math.sin(i * 1.7) * 2} rotation={[0, i * 1.3, 0]} />
      ))}

      {/* Real bushes */}
      {[
        [-3, 0, 2], [7, 0, -8], [-14, 0, 16], [16, 0, 3], [-7, 0, -12],
        [3, 0, 18], [-20, 0, -5], [24, 0, -14], [0, 0, -10],
      ].map((p, i) => (
        <FBXModel key={`bush-${i}`} url={MODELS.bush} materialPreset="bush"
          position={p as [number, number, number]} normalizedHeight={0.5 + Math.sin(i * 2.1) * 0.3} rotation={[0, i * 2.5, 0]} />
      ))}

      {/* Real barrels */}
      <FBXModel url={MODELS.barrel} materialPreset="barrel" position={[3, 0, -5]} normalizedHeight={0.9} />
      <FBXModel url={MODELS.barrel} materialPreset="barrel" position={[4.2, 0, -4.5]} normalizedHeight={0.9} rotation={[0, 0.8, 0]} />
      <FBXModel url={MODELS.barrel} materialPreset="barrel" position={[-15, 0, 8]} normalizedHeight={0.9} rotation={[0.3, 0, 0]} />

      {/* Real sandbags */}
      <FBXModel url={MODELS.sandbags} materialPreset="sandbag" position={[6, 0, -3]} normalizedHeight={0.8} />
      <FBXModel url={MODELS.sandbags} materialPreset="sandbag" position={[-12, 0, 15]} normalizedHeight={0.8} rotation={[0, 1.5, 0]} />
      <FBXModel url={MODELS.sandbags} materialPreset="sandbag" position={[20, 0, 0]} normalizedHeight={0.8} rotation={[0, -0.7, 0]} />
    </group>
  );
}

// ===== Real Structures =====
function Structures() {
  return (
    <group>
      <FBXModel url={MODELS.watchtower} materialPreset="structure" position={[-22, 0, -25]} normalizedHeight={12} rotation={[0, 0.4, 0]} />
      <FBXModel url={MODELS.cabin} materialPreset="structure" position={[-6, 0, 4]} normalizedHeight={4} rotation={[0, -0.3, 0]} />
      <FBXModel url={MODELS.securityPost} materialPreset="concrete" position={[15, 0, -8]} normalizedHeight={3.5} rotation={[0, 1.2, 0]} />
      <FBXModel url={MODELS.searchlight} materialPreset="metal" position={[10, 0, 10]} normalizedHeight={3} rotation={[0, 2.0, 0]} />
      <FBXModel url={MODELS.searchlight} materialPreset="metal" position={[-18, 0, -10]} normalizedHeight={3} rotation={[0, 0.5, 0]} />
    </group>
  );
}

// ===== Main Scene =====
export default function DemoScene() {
  const enemies = useGameStore(s => s.enemies);
  const setTarget = useGameStore(s => s.setTarget);

  const enemyModels = [
    { model: MODELS.mutant, mat: 'mutant' as const },
    { model: MODELS.alien, mat: 'alien' as const },
    { model: MODELS.spikeball, mat: 'spikeball' as const },
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

      <Stars radius={120} depth={60} count={3000} factor={4} fade speed={0.3} />

      <TPSCamera />
      <GameLoop />
      <BulletRenderer />

      {/* Postprocessing: bloom for muzzle flash + bullets, vignette for mood */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.3} intensity={0.6} />
        <Vignette offset={0.3} darkness={0.6} />
      </EffectComposer>

      <Suspense fallback={null}>
        <Terrain />
        <Structures />
        <PlayerCharacter />

        {enemies.map((e, i) => (
          <EnemyNPC
            key={e.actorId} actorId={e.actorId} name={e.name} color={e.color}
            pos={e.positionVec} level={e.level}
            modelUrl={enemyModels[i % enemyModels.length].model}
            materialPreset={enemyModels[i % enemyModels.length].mat}
          />
        ))}
      </Suspense>
    </Canvas>
  );
}
