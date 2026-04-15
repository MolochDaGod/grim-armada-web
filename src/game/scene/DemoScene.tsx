import { useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { GLTFModel } from './ModelLoader';
import { BulletRenderer } from './BulletSystem';
import { createAnimState, updateProceduralAnim, triggerShoot, triggerHit, triggerDeath, triggerAttack, triggerStagger, type AnimState } from './ProceduralAnim';
import { ScreenShake, DamageNumbers } from './VFX';
import { PostFX } from './PostFX';
import { WeaponView } from './WeaponSystem';
import { audioManager } from '../audio/AudioManager';
import FullTerrain from '../terrain/TerrainMesh';
// ===== New Engine Systems =====
import { inputManager } from '../player/InputManager';
import { cameraControllerTick } from '../player/CameraController';
import { weaponManagerTick, getCrosshairSpread } from '../weapons/WeaponManager';
import { tickDayNight, getSunPosition, getAmbientIntensity, getSunIntensity, getFogColor } from '../survival/DayNightCycle';
import { MagicSystem } from '../weapons/MagicProjectile';
import { SkillEffects, type SkillEffectsHandle } from '../weapons/SkillEffects';
import { Arrow, type ArrowData } from '../weapons/Arrow';
import { LootChest } from '../world/LootChest';
import { ScenePortal } from '../scenes/ScenePortal';
import { getWeaponConfig, isRangedWeapon } from '../weapons/WeaponConfig';
import { UNIT_REGISTRY } from '../units/UnitRegistry';
import { UnitCharacter } from '../units/UnitCharacter';
import { BulletDecals } from './BulletDecals';
import { ExplosionSystem } from '../vfx/Explosion';
import { MuzzleFlashSystem, triggerMuzzleFlash } from '../vfx/MuzzleFlash';
import { GrenadeRenderer, createGrenadeFromCamera, type GrenadeData } from '../weapons/Grenade';
import { inputManager as grenadeInput } from '../player/InputManager';

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
  // Colony buildings (craftpix space colony pack)
  mainHouse: '/models/colony/main_house.glb',
  mainHouse2: '/models/colony/main_house_2lv.glb',
  researchCenter: '/models/colony/research_center.glb',
  farm: '/models/colony/farm.glb',
  warehouse: '/models/colony/resource_warehouse.glb',
  reactor: '/models/colony/reactor.glb',
  solarPanel: '/models/colony/solar_panel.glb',
  droneCarrier: '/models/colony/drone_carrier.glb',
  gateway: '/models/colony/connecting_gateway.glb',
  runway: '/models/colony/runway_strip.glb',
  geoGenerator: '/models/colony/geothermal_generator.glb',
  colonistHome: '/models/colony/home_colonists.glb',
  // Battle ships (craftpix spaceship pack)
  destroyer1: '/models/ships/destroyer_01.glb',
  destroyer2: '/models/ships/destroyer_02.glb',
  destroyer3: '/models/ships/destroyer_03.glb',
  cruiser1: '/models/ships/light_cruiser_01.glb',
  cruiser2: '/models/ships/light_cruiser_02.glb',
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

// ===== Player Character — proper rendering with fallback =====
function PlayerCharacter() {
  const outerRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const animRef = useRef<AnimState>(createAnimState());
  const prevPos = useRef<[number, number, number]>([0, 0, 0]);
  const position = useGameStore(s => s.playerPosition);
  const rotation = useGameStore(s => s.playerRotation);
  const player = useGameStore(s => s.player);

  // Listen for attack results to trigger combat anims
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prevState) => {
      // Check combat log for player attacks
      if (state.combatLog.length > prevState.combatLog.length) {
        const latest = state.combatLog[state.combatLog.length - 1];
        if (latest.message.includes('Commander hit') || latest.message.includes('Commander healed')) {
          triggerShoot(animRef.current);
        } else if (latest.message.includes('hit Commander')) {
          triggerHit(animRef.current);
        }
      }
    });
    return unsub;
  }, []);

  useFrame((_, dt) => {
    const cdt = Math.min(dt, 0.05);
    if (outerRef.current) {
      outerRef.current.position.set(position[0], 0, position[2]);
      outerRef.current.rotation.y = rotation;
    }
    const dx = position[0] - prevPos.current[0];
    const dz = position[2] - prevPos.current[2];
    const speed = Math.sqrt(dx * dx + dz * dz) / cdt;
    animRef.current.isMoving = speed > 0.5;
    animRef.current.moveSpeed = Math.min(speed / 10, 1);
    animRef.current.isSprinting = speed > 10;
    prevPos.current = [...position];
    if (modelRef.current) updateProceduralAnim(modelRef.current, animRef.current, cdt);
  });

  return (
    <group ref={outerRef}>
      <group ref={modelRef}>
        <GLTFModel url={MODELS.player} normalizedHeight={2.0} fallbackColor="#5588cc" />
      </group>
      {/* Weapon held in right hand area */}
      <group position={[0.5, 1.0, -0.4]} rotation={[0, 0, -0.15]}>
        <GLTFModel url={MODELS.weaponRifle} normalizedHeight={1.0} showFallback={false} />
      </group>
      {/* Selection glow ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 0.95, 32]} />
        <meshBasicMaterial color="#d4af37" side={THREE.DoubleSide} transparent opacity={0.4} />
      </mesh>
      <Text position={[0, 2.5, 0]} fontSize={0.22} color="#d4af37" anchorX="center" font={undefined}>
        {player.name}
      </Text>
    </group>
  );
}

// ===== Enemy NPC with Real Models + Procedural Animations + Aggro AI =====
const ENEMY_FALLBACK_COLORS: Record<string, string> = {
  mutant: '#8844aa',
  alien: '#44aa44',
  spikeball: '#cc4444',
};
const AGGRO_RANGE = 20;
const CHASE_SPEED = 4;
const LEASH_RANGE = 35;

function EnemyNPC({ actorId, name, color, pos, level, modelUrl }: {
  actorId: string; name: string; color: string; pos: [number, number, number]; level: number;
  modelUrl: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const animRef = useRef<AnimState>(createAnimState());
  const wasDead = useRef(false);
  const spawnPos = useRef<[number, number, number]>([...pos]);
  const currentPos = useRef<[number, number, number]>([...pos]);
  const setTarget = useGameStore(s => s.setTarget);
  const targetId = useGameStore(s => s.targetId);
  const enemies = useGameStore(s => s.enemies);
  const enemy = enemies.find(e => e.actorId === actorId);
  const isTargeted = targetId === actorId;
  const isDead = enemy?.ham.isDead ?? false;
  const healthPct = enemy ? enemy.ham.health.percentage : 1;
  const actionPct = enemy ? enemy.ham.action.percentage : 1;

  // Determine fallback color from model type
  const modelType = Object.keys(ENEMY_FALLBACK_COLORS).find(k => modelUrl.includes(k)) || 'mutant';
  const fbColor = ENEMY_FALLBACK_COLORS[modelType];

  useFrame((_, dt) => {
    const cdt = Math.min(dt, 0.05);

    // Detect death transition
    if (isDead && !wasDead.current) { triggerDeath(animRef.current); wasDead.current = true; }
    animRef.current.isDead = isDead;

    if (!isDead && groupRef.current) {
      const playerPos = useGameStore.getState().playerPosition;
      const dx = playerPos[0] - currentPos.current[0];
      const dz = playerPos[2] - currentPos.current[2];
      const distToPlayer = Math.sqrt(dx * dx + dz * dz);

      // Check leash distance from spawn
      const lx = currentPos.current[0] - spawnPos.current[0];
      const lz = currentPos.current[2] - spawnPos.current[2];
      const distFromSpawn = Math.sqrt(lx * lx + lz * lz);

      // Aggro: chase player if within range and not leashed
      const isAggro = (isTargeted || distToPlayer < AGGRO_RANGE) && distFromSpawn < LEASH_RANGE;

      if (isAggro && distToPlayer > 3) {
        // Chase player
        const dir = Math.atan2(dx, dz);
        const moveX = Math.sin(dir) * CHASE_SPEED * cdt;
        const moveZ = Math.cos(dir) * CHASE_SPEED * cdt;
        currentPos.current[0] += moveX;
        currentPos.current[2] += moveZ;
        groupRef.current.rotation.y = dir;
        animRef.current.isMoving = true;
        animRef.current.moveSpeed = 0.6;

        // Update actor position for combat
        if (enemy) {
          enemy.position.x = currentPos.current[0];
          enemy.position.z = currentPos.current[2];
          enemy.positionVec = [...currentPos.current];
        }
      } else if (!isAggro && distFromSpawn > 1) {
        // Return to spawn
        const dir = Math.atan2(-lx, -lz);
        const moveX = Math.sin(dir) * CHASE_SPEED * 0.5 * cdt;
        const moveZ = Math.cos(dir) * CHASE_SPEED * 0.5 * cdt;
        currentPos.current[0] += moveX;
        currentPos.current[2] += moveZ;
        groupRef.current.rotation.y = dir;
        animRef.current.isMoving = true;
        animRef.current.moveSpeed = 0.3;
      } else if (isAggro && distToPlayer <= 3) {
        // Face player in melee range
        groupRef.current.rotation.y = Math.atan2(dx, dz);
        animRef.current.isMoving = false;
        animRef.current.combatStance = 1;
      } else {
        // Idle patrol rotation
        groupRef.current.rotation.y += 0.3 * cdt;
        animRef.current.isMoving = false;
      }

      groupRef.current.position.set(currentPos.current[0], currentPos.current[1], currentPos.current[2]);
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
      {/* Selection ring — pulsing when targeted */}
      {isTargeted && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.0, 1.15, 32]} />
          <meshBasicMaterial color="#ff4444" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}
      {/* Aggro range indicator when not targeted but close */}
      {!isTargeted && !isDead && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.0, 24]} />
          <meshBasicMaterial color={fbColor} side={THREE.DoubleSide} transparent opacity={0.2} />
        </mesh>
      )}

      {/* Real enemy model with procedural animation + fallback */}
      <group ref={modelRef}>
        <GLTFModel
          url={modelUrl}
          normalizedHeight={modelUrl.includes('spikeball') ? 1.2 : 2.0}
          fallbackColor={fbColor}
        />
      </group>

      {/* Health + Action bars */}
      {!isDead && (
        <group position={[0, 2.4, 0]}>
          {/* HP bar background */}
          <mesh>
            <planeGeometry args={[1.2, 0.12]} />
            <meshBasicMaterial color="#111" transparent opacity={0.8} />
          </mesh>
          {/* HP fill */}
          <mesh position={[(healthPct - 1) * 0.6, 0, 0.001]}>
            <planeGeometry args={[1.2 * healthPct, 0.08]} />
            <meshBasicMaterial color={healthPct > 0.5 ? '#4ade80' : healthPct > 0.25 ? '#f59e0b' : '#ef4444'} />
          </mesh>
          {/* Action bar (smaller, below HP) */}
          <mesh position={[0, -0.1, 0]}>
            <planeGeometry args={[1.2, 0.06]} />
            <meshBasicMaterial color="#111" transparent opacity={0.6} />
          </mesh>
          <mesh position={[(actionPct - 1) * 0.6, -0.1, 0.001]}>
            <planeGeometry args={[1.2 * actionPct, 0.04]} />
            <meshBasicMaterial color="#6d95c6" />
          </mesh>
          {/* Level badge */}
          <mesh position={[-0.7, 0, 0.002]}>
            <circleGeometry args={[0.1, 8]} />
            <meshBasicMaterial color="#d4af37" />
          </mesh>
        </group>
      )}

      {/* Name */}
      <Text
        position={[0, isDead ? 0.5 : 2.75, 0]}
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

// ===== New Camera Controller — TPS/Action/FPS + ADS zoom + recoil + shoulder swap =====
function NewCameraController() {
  const { camera, gl } = useThree();
  const position = useGameStore(s => s.playerPosition);

  // Init InputManager + pointer lock on first mount
  useEffect(() => {
    inputManager.init();
    const canvas = gl.domElement;
    const onClick = () => {
      if (!inputManager.isPointerLocked) canvas.requestPointerLock();
    };
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('click', onClick);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const cdt = Math.min(dt, 0.05);
    cameraControllerTick(cdt, camera as THREE.PerspectiveCamera, position);
    inputManager.resetFrame();
  });

  return null;
}

// ===== Engine Loop — ticks weapon manager, day/night, grenades, combat systems =====
function EngineLoop() {
  const tick = useGameStore(s => s.tick);
  const grenadesRef = useRef<GrenadeData[]>([]);

  useFrame((state, dt) => {
    const cdt = Math.min(dt, 0.05);
    // Legacy combat tick
    tick(cdt);

    // Weapon manager tick — handles fire, reload, combo, skills, mana regen
    const weaponResult = weaponManagerTick(cdt);

    // If ranged weapon fired, spawn visual bullet + muzzle flash + audio
    if (weaponResult.fired) {
      const store = useGameStore.getState();
      const cfg = getWeaponConfig(store.weaponMode);
      const cam = state.camera;
      const dir = new THREE.Vector3();
      cam.getWorldDirection(dir);
      const origin = new THREE.Vector3();
      cam.getWorldPosition(origin);
      origin.addScaledVector(dir, 1.0);
      const target = origin.clone().addScaledVector(dir, cfg.range);

      // Muzzle flash at weapon muzzle position
      if (cfg.muzzleFlash) {
        triggerMuzzleFlash(origin.clone(), cfg.trailColor);
      }

      // Spawn arrow for bow, bullet for others
      if (store.weaponMode === 'bow') {
        const arrow: ArrowData = {
          id: `arrow-${Date.now()}-${Math.random()}`,
          position: origin.clone(),
          direction: dir.clone(),
          speed: cfg.projectileSpeed,
          gravity: cfg.projectileGravity,
          lifetime: cfg.projectileLifetime,
          trailColor: cfg.trailColor,
        };
        store.addArrow(arrow);
      } else {
        // Use existing bullet system with weapon-specific colors
        const { fireShot } = require('./BulletSystem');
        fireShot(
          { x: origin.x, y: origin.y, z: origin.z },
          { x: target.x, y: target.y, z: target.z },
          cfg.trailColor,
        );
      }
      audioManager.playGunshot(0);
    }

    // Grenade throw (G key)
    if (grenadeInput.justPressed('KeyG')) {
      const cam = state.camera;
      const dir = new THREE.Vector3();
      cam.getWorldDirection(dir);
      const pos = new THREE.Vector3();
      cam.getWorldPosition(pos);
      grenadesRef.current.push(createGrenadeFromCamera(pos, dir));
    }

    // Day/night cycle
    const newDayTime = tickDayNight(cdt);
    useGameStore.setState({ dayTime: newDayTime });
  });

  // Grenade cleanup
  const handleGrenadeExplode = (id: string) => {
    grenadesRef.current = grenadesRef.current.filter(g => g.id !== id);
  };

  return (
    <GrenadeRenderer grenades={grenadesRef.current} onExplode={handleGrenadeExplode} />
  );
}

// ===== Arrow Renderer — renders all active arrows from store =====
function ArrowRenderer() {
  const arrows = useGameStore(s => s.arrows);
  const removeArrow = useGameStore(s => s.removeArrow);
  return (
    <>
      {arrows.map(a => (
        <Arrow key={a.id} data={a} onExpire={removeArrow} />
      ))}
    </>
  );
}

// ===== Dynamic Lighting — sun position/intensity from day/night cycle =====
function DynamicLighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);

  useFrame(() => {
    const dayTime = useGameStore.getState().dayTime;
    const sunPos = getSunPosition(dayTime);
    if (sunRef.current) {
      sunRef.current.position.set(sunPos[0], sunPos[1], sunPos[2]);
      sunRef.current.intensity = getSunIntensity(dayTime);
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = getAmbientIntensity(dayTime);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.4} color="#6688cc" />
      <directionalLight
        ref={sunRef}
        position={[40, 60, 30]} intensity={2.0} color="#ffeedd" castShadow
        shadow-mapSize={[4096, 4096]} shadow-camera-far={150}
        shadow-camera-left={-60} shadow-camera-right={60}
        shadow-camera-top={60} shadow-camera-bottom={-60}
      />
      <directionalLight position={[-30, 30, -20]} intensity={0.6} color="#aabbff" />
      <pointLight position={[0, 15, 0]} intensity={1.5} color="#d4af37" distance={30} />
    </>
  );
}

// ===== Display pedestal for showroom models =====
function Pedestal({ position, radius = 1.5, height = 0.15 }: { position: [number, number, number]; radius?: number; height?: number }) {
  return (
    <mesh position={[position[0], height / 2, position[2]]} receiveShadow castShadow>
      <cylinderGeometry args={[radius, radius + 0.1, height, 32]} />
      <meshStandardMaterial color="#2a2a35" metalness={0.6} roughness={0.3} />
    </mesh>
  );
}

// ===== Showroom ground + terrain =====
function Terrain() {
  return (
    <group>
      {/* ===== NEW: VoxelSpace-inspired heightmap terrain with biome colormap ===== */}
      <FullTerrain />

      {/* Landing pad — hexagonal platform where player spawns (the "ship") */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} receiveShadow>
        <circleGeometry args={[8, 6]} />
        <meshStandardMaterial color="#1a1a2a" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Pad border ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]}>
        <ringGeometry args={[7.8, 8.2, 6]} />
        <meshStandardMaterial color="#d4af37" emissive="#d4af37" emissiveIntensity={0.4} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* The SHIP — cabin model scaled up as the spawn ship */}
      <GLTFModel url={MODELS.cabin} position={[0, 0.1, 0]} normalizedHeight={6} />

      {/* ===== MINING STATION (wasteland biome, NE) ===== */}
      <Suspense fallback={null}>
        <GLTFModel url="/models/structures/mining-station/scene.gltf" position={[60, 0, 50]} normalizedHeight={20} rotation={[0, -0.5, 0]} />
        <pointLight position={[60, 22, 50]} intensity={2} color="#ffaa44" distance={30} />
        <Text position={[60, 22, 50]} fontSize={0.5} color="#f0c978" anchorX="center" font={undefined}>MINING STATION</Text>
      </Suspense>

      {/* ===== WEAPON DISPLAY AREA (east side, +X) ===== */}
      <Text position={[15, 3, 0]} fontSize={0.6} color="#d4af37" anchorX="center" font={undefined}>ARMORY</Text>
      {/* All 3 weapons on pedestals */}
      <Pedestal position={[12, 0, -3]} />
      <GLTFModel url={MODELS.weaponRifle} position={[12, 0.3, -3]} normalizedHeight={1.5} rotation={[0, 0.5, 0]} />
      <Text position={[12, 2.2, -3]} fontSize={0.18} color="#aaa" anchorX="center" font={undefined}>Assault Rifle</Text>

      <Pedestal position={[15, 0, 0]} />
      <GLTFModel url={MODELS.weaponAK} position={[15, 0.3, 0]} normalizedHeight={1.5} rotation={[0, -0.3, 0]} />
      <Text position={[15, 2.2, 0]} fontSize={0.18} color="#aaa" anchorX="center" font={undefined}>AK-74U</Text>

      <Pedestal position={[12, 0, 3]} />
      <GLTFModel url={MODELS.weaponSMG} position={[12, 0.3, 3]} normalizedHeight={1.5} rotation={[0, 0.8, 0]} />
      <Text position={[12, 2.2, 3]} fontSize={0.18} color="#aaa" anchorX="center" font={undefined}>SMG</Text>

      {/* Spotlights on weapons */}
      <pointLight position={[12, 3, -3]} intensity={1} color="#ffdd88" distance={8} />
      <pointLight position={[15, 3, 0]} intensity={1} color="#ffdd88" distance={8} />
      <pointLight position={[12, 3, 3]} intensity={1} color="#ffdd88" distance={8} />

      {/* ===== MONSTER GALLERY (west side, -X) ===== */}
      <Text position={[-18, 4, 0]} fontSize={0.6} color="#ff4444" anchorX="center" font={undefined}>HOSTILES</Text>

      {/* ALIEN — displayed BIG */}
      <Pedestal position={[-15, 0, -8]} radius={2.5} />
      <GLTFModel url={MODELS.alien} position={[-15, 0.2, -8]} normalizedHeight={5} rotation={[0, 0.4, 0]} />
      <Text position={[-15, 5.5, -8]} fontSize={0.25} color="#4ade80" anchorX="center" font={undefined}>Xenomorph Alien</Text>
      <pointLight position={[-15, 6, -8]} intensity={1.5} color="#22ff44" distance={12} />

      {/* MUTANT — displayed BIG */}
      <Pedestal position={[-18, 0, 0]} radius={2.5} />
      <GLTFModel url={MODELS.mutant} position={[-18, 0.2, 0]} normalizedHeight={5} rotation={[0, 0.6, 0]} />
      <Text position={[-18, 5.5, 0]} fontSize={0.25} color="#a855f7" anchorX="center" font={undefined}>Mutant Berserker</Text>
      <pointLight position={[-18, 6, 0]} intensity={1.5} color="#aa44ff" distance={12} />

      {/* SPIKEBALL — displayed BIG */}
      <Pedestal position={[-15, 0, 8]} radius={2} />
      <GLTFModel url={MODELS.spikeball} position={[-15, 0.2, 8]} normalizedHeight={4} rotation={[0, 1.2, 0]} />
      <Text position={[-15, 4.5, 8]} fontSize={0.25} color="#ef4444" anchorX="center" font={undefined}>Spikeball Drone</Text>
      <pointLight position={[-15, 5, 8]} intensity={1.5} color="#ff2222" distance={12} />

      {/* ===== EXTRA MONSTERS scattered in the wild (south, +Z) ===== */}
      <GLTFModel url={MODELS.alien} position={[-30, 0, 25]} normalizedHeight={4} rotation={[0, 1.0, 0]} />
      <GLTFModel url={MODELS.alien} position={[-25, 0, 30]} normalizedHeight={3.5} rotation={[0, 2.5, 0]} />
      <GLTFModel url={MODELS.mutant} position={[25, 0, 28]} normalizedHeight={4} rotation={[0, -0.5, 0]} />
      <GLTFModel url={MODELS.mutant} position={[30, 0, 20]} normalizedHeight={3} rotation={[0, 1.8, 0]} />
      <GLTFModel url={MODELS.spikeball} position={[0, 0, 35]} normalizedHeight={3} rotation={[0, 0.7, 0]} />
      <GLTFModel url={MODELS.spikeball} position={[-10, 0, 40]} normalizedHeight={2.5} rotation={[0, 3.1, 0]} />
      <GLTFModel url={MODELS.alien} position={[15, 0, 40]} normalizedHeight={5} rotation={[0, -1.2, 0]} />
      <GLTFModel url={MODELS.mutant} position={[-35, 0, -20]} normalizedHeight={4.5} rotation={[0, 0.3, 0]} />

      {/* ===== SPACE COLONY BASE (north, -Z) — craftpix colony pack ===== */}
      <Text position={[0, 8, -20]} fontSize={0.7} color="#6d95c6" anchorX="center" font={undefined}>COLONY OUTPOST</Text>

      {/* Main House — command center, big centerpiece */}
      <GLTFModel url={MODELS.mainHouse2} position={[0, 0, -30]} normalizedHeight={12} rotation={[0, 0, 0]} />
      <pointLight position={[0, 14, -30]} intensity={2.5} color="#6d95c6" distance={30} />

      {/* Research Center — crafting/skills hub */}
      <GLTFModel url={MODELS.researchCenter} position={[-14, 0, -24]} normalizedHeight={8} rotation={[0, 0.4, 0]} />
      <Text position={[-14, 9, -24]} fontSize={0.22} color="#6d95c6" anchorX="center" font={undefined}>Research Lab</Text>
      <pointLight position={[-14, 10, -24]} intensity={1} color="#4488ff" distance={15} />

      {/* Warehouse — storage */}
      <GLTFModel url={MODELS.warehouse} position={[14, 0, -24]} normalizedHeight={7} rotation={[0, -0.3, 0]} />
      <Text position={[14, 8, -24]} fontSize={0.22} color="#d6ac57" anchorX="center" font={undefined}>Warehouse</Text>

      {/* Farm modules — harvesting area */}
      <GLTFModel url={MODELS.farm} position={[-22, 0, -16]} normalizedHeight={5} rotation={[0, 0.2, 0]} />
      <GLTFModel url={MODELS.farm} position={[-28, 0, -12]} normalizedHeight={5} rotation={[0, -0.3, 0]} />
      <Text position={[-25, 6, -14]} fontSize={0.22} color="#6bb78a" anchorX="center" font={undefined}>Hydro Farms</Text>

      {/* Reactor — power core, glowing */}
      <GLTFModel url={MODELS.reactor} position={[22, 0, -16]} normalizedHeight={10} rotation={[0, -0.5, 0]} />
      <pointLight position={[22, 12, -16]} intensity={2} color="#ff8844" distance={20} />
      <Text position={[22, 11, -16]} fontSize={0.22} color="#f0c978" anchorX="center" font={undefined}>Reactor Core</Text>

      {/* Solar panels — energy field */}
      {[-18, -12, -6, 6, 12, 18].map((x, i) => (
        <GLTFModel key={`solar-${i}`} url={MODELS.solarPanel} position={[x, 0, -40]} normalizedHeight={4} rotation={[0, 0, 0]} />
      ))}

      {/* Connecting gateways — walkways between buildings */}
      <GLTFModel url={MODELS.gateway} position={[-7, 0, -27]} normalizedHeight={3} rotation={[0, 0, 0]} />
      <GLTFModel url={MODELS.gateway} position={[7, 0, -27]} normalizedHeight={3} rotation={[0, Math.PI, 0]} />

      {/* Landing runway */}
      <GLTFModel url={MODELS.runway} position={[0, 0.05, -48]} normalizedHeight={3} rotation={[0, 0, 0]} />

      {/* Colonist homes — residential area */}
      <GLTFModel url={MODELS.colonistHome} position={[-30, 0, -28]} normalizedHeight={5} rotation={[0, 0.6, 0]} />
      <GLTFModel url={MODELS.colonistHome} position={[-34, 0, -22]} normalizedHeight={5} rotation={[0, -0.2, 0]} />
      <GLTFModel url={MODELS.mainHouse} position={[30, 0, -28]} normalizedHeight={6} rotation={[0, -0.6, 0]} />

      {/* Geothermal generator */}
      <GLTFModel url={MODELS.geoGenerator} position={[28, 0, -38]} normalizedHeight={6} rotation={[0, 1.2, 0]} />
      <pointLight position={[28, 8, -38]} intensity={1} color="#ff6622" distance={12} />

      {/* Drone carrier — parked near runway */}
      <GLTFModel url={MODELS.droneCarrier} position={[-10, 0, -50]} normalizedHeight={5} rotation={[0, 0.3, 0]} />

      {/* Searchlights around the perimeter */}
      <GLTFModel url={MODELS.searchlight} position={[-20, 0, -15]} normalizedHeight={5} rotation={[0, 0.8, 0]} />
      <GLTFModel url={MODELS.searchlight} position={[20, 0, -15]} normalizedHeight={5} rotation={[0, -0.8, 0]} />

      {/* ===== TERRAIN PROPS everywhere ===== */}
      {/* Rocks — scattered around */}
      {[
        [-8, 0, 15], [20, 0, 18], [-25, 0, -5], [30, 0, -15], [-35, 0, 10],
        [35, 0, 5], [-12, 0, -35], [18, 0, -35], [-40, 0, -10], [40, 0, -25],
      ].map((p, i) => (
        <GLTFModel key={`rock-${i}`} url={i % 2 === 0 ? MODELS.rock1 : MODELS.rock2}
          position={p as [number, number, number]} normalizedHeight={1.5 + Math.sin(i * 2.3) * 1}
          rotation={[0, i * 1.7, 0]} />
      ))}

      {/* Cliffs — map boundaries, BIG */}
      <GLTFModel url={MODELS.cliff1} position={[-50, 0, 0]} normalizedHeight={15} rotation={[0, 0.3, 0]} />
      <GLTFModel url={MODELS.cliff2} position={[50, 0, -10]} normalizedHeight={18} rotation={[0, 2.5, 0]} />
      <GLTFModel url={MODELS.cliff1} position={[0, 0, -55]} normalizedHeight={14} rotation={[0, 1.8, 0]} />
      <GLTFModel url={MODELS.cliff2} position={[-45, 0, 40]} normalizedHeight={16} rotation={[0, 4.0, 0]} />
      <GLTFModel url={MODELS.cliff1} position={[45, 0, 35]} normalizedHeight={12} rotation={[0, 5.5, 0]} />
      <GLTFModel url={MODELS.cliff2} position={[0, 0, 55]} normalizedHeight={14} rotation={[0, 3.2, 0]} />

      {/* Trees */}
      {[
        [-8, 0, 5], [10, 0, -15], [-18, 0, 12], [22, 0, 8], [-5, 0, -25],
        [28, 0, -18], [-15, 0, -20], [12, 0, 22], [-25, 0, 5], [5, 0, 30],
        [-30, 0, -8], [30, 0, 15], [-10, 0, 28], [20, 0, -25],
        [-40, 0, 20], [40, 0, 20], [-35, 0, -35], [35, 0, -35],
      ].map((p, i) => (
        <GLTFModel key={`tree-${i}`} url={MODELS.tree1}
          position={p as [number, number, number]} normalizedHeight={5 + Math.sin(i * 1.7) * 3} rotation={[0, i * 1.3, 0]} />
      ))}

      {/* Barrels — supply dumps */}
      {[
        [8, 0, -12], [9, 0, -11.5], [8.5, 0, -13], [7.5, 0, -12.5],
        [-8, 0, -18], [-7.5, 0, -17], [-9, 0, -17.5],
      ].map((p, i) => (
        <GLTFModel key={`barrel-${i}`} url={MODELS.barrel}
          position={p as [number, number, number]} normalizedHeight={1.2} rotation={[i * 0.1, i * 0.8, 0]} />
      ))}

      {/* Sandbag bunkers */}
      <GLTFModel url={MODELS.sandbags} position={[6, 0, -8]} normalizedHeight={1.2} />
      <GLTFModel url={MODELS.sandbags} position={[7, 0, -7]} normalizedHeight={1.2} rotation={[0, 1.5, 0]} />
      <GLTFModel url={MODELS.sandbags} position={[-12, 0, 15]} normalizedHeight={1.2} rotation={[0, 0.8, 0]} />
      <GLTFModel url={MODELS.sandbags} position={[20, 0, 5]} normalizedHeight={1.2} rotation={[0, -0.7, 0]} />
    </group>
  );
}

// ===== Sky Fleet — Battle ships drifting in the sky =====
function SkyFleet() {
  const groupRef = useRef<THREE.Group>(null);

  // Slow drift animation
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    // Entire fleet drifts slowly across the sky
    groupRef.current.rotation.y += dt * 0.003;
    // Subtle bob
    groupRef.current.position.y = 60 + Math.sin(Date.now() * 0.0003) * 2;
  });

  return (
    <group ref={groupRef} position={[0, 60, 0]}>
      {/* === Flagship Destroyer — huge, center-back, high === */}
      <group position={[0, 15, -80]}>
        <GLTFModel url={MODELS.destroyer1} normalizedHeight={30} rotation={[0, Math.PI * 0.1, 0]} />
        <pointLight position={[0, -5, 0]} intensity={3} color="#4488ff" distance={40} />
        <pointLight position={[0, -2, -10]} intensity={1.5} color="#ff4444" distance={20} />
      </group>

      {/* === Escort Destroyers — flanking === */}
      <group position={[-45, 8, -50]}>
        <GLTFModel url={MODELS.destroyer2} normalizedHeight={20} rotation={[0, 0.15, 0]} />
        <pointLight position={[0, -3, 0]} intensity={2} color="#4488ff" distance={25} />
      </group>
      <group position={[45, 10, -55]}>
        <GLTFModel url={MODELS.destroyer3} normalizedHeight={22} rotation={[0, -0.12, 0]} />
        <pointLight position={[0, -3, 0]} intensity={2} color="#4488ff" distance={25} />
      </group>

      {/* === Light Cruisers — patrol formation, closer to player === */}
      <group position={[-25, 0, -20]}>
        <GLTFModel url={MODELS.cruiser1} normalizedHeight={12} rotation={[0, 0.3, 0]} />
        <pointLight position={[0, -2, 0]} intensity={1.5} color="#66aaff" distance={15} />
      </group>
      <group position={[30, 2, -25]}>
        <GLTFModel url={MODELS.cruiser2} normalizedHeight={14} rotation={[0, -0.25, 0]} />
        <pointLight position={[0, -2, 0]} intensity={1.5} color="#66aaff" distance={15} />
      </group>

      {/* === Distant Destroyer — far background === */}
      <group position={[70, 25, -120]}>
        <GLTFModel url={MODELS.destroyer1} normalizedHeight={18} rotation={[0, 0.8, 0]} />
        <pointLight position={[0, -3, 0]} intensity={1} color="#3366cc" distance={20} />
      </group>
      <group position={[-65, 20, -110]}>
        <GLTFModel url={MODELS.destroyer2} normalizedHeight={16} rotation={[0, -0.5, 0]} />
        <pointLight position={[0, -3, 0]} intensity={1} color="#3366cc" distance={20} />
      </group>
    </group>
  );
}

// ===== Loot Chest Placements =====
function WorldLoot() {
  return (
    <>
      <LootChest position={[8, 0.25, -12]} goldAmount={15} />
      <LootChest position={[-20, 0.25, 10]} goldAmount={25} />
      <LootChest position={[30, 0.25, -25]} goldAmount={40} />
      <LootChest position={[-35, 0.25, -15]} goldAmount={20} />
      <LootChest position={[25, 0.25, 30]} goldAmount={30} />
      <LootChest position={[-10, 0.25, -40]} goldAmount={50} />
    </>
  );
}

// ===== Scene Portals at biome borders =====
function WorldPortals() {
  return (
    <>
      <ScenePortal position={[70, 0, 70]} targetScene="wasteland" />
      <ScenePortal position={[0, 0, -70]} targetScene="dungeon" />
      <ScenePortal position={[-70, 0, 0]} targetScene="forge" />
    </>
  );
}

// ===== Unit Showcase — the 3 hero characters on display =====
function UnitShowcase() {
  return (
    <group>
      <Text position={[0, 3.5, 18]} fontSize={0.6} color="#d4af37" anchorX="center" font={undefined}>HEROES</Text>
      {UNIT_REGISTRY.map((unit, i) => {
        const spacing = 5;
        const x = (i - (UNIT_REGISTRY.length - 1) / 2) * spacing;
        return (
          <Suspense key={unit.id} fallback={null}>
            <UnitCharacter
              def={unit}
              position={[x, 0, 20]}
              rotation={Math.PI}
              height={2.2}
              selected
            />
            <Pedestal position={[x, 0, 20]} radius={1.2} />
            <pointLight position={[x, 4, 20]} intensity={1.2} color={unit.color} distance={8} />
          </Suspense>
        );
      })}
    </group>
  );
}

// ===== Main Scene =====
export default function DemoScene() {
  const enemies = useGameStore(s => s.enemies);
  const setTarget = useGameStore(s => s.setTarget);
  const skillEffectsRef = useRef<SkillEffectsHandle>(null!);

  const enemyModels = [
    MODELS.mutant,
    MODELS.alien,
    MODELS.spikeball,
  ];

  return (
    <Canvas
      shadows
      camera={{ fov: 70, near: 0.1, far: 500, position: [0, 5, 10] }}
      style={{ position: 'absolute', inset: 0 }}
      onPointerMissed={() => setTarget(null)}
    >
      <color attach="background" args={['#060a10']} />
      <fog attach="fog" args={['#060a10', 60, 300]} />

      {/* Dynamic lighting — driven by day/night cycle */}
      <DynamicLighting />

      {/* Environment lighting for realistic reflections */}
      <Environment preset="night" background={false} />
      <Stars radius={120} depth={60} count={5000} factor={4} fade speed={0.3} />

      {/* ===== SKY FLEET ===== */}
      <SkyFleet />

      {/* ===== NEW ENGINE SYSTEMS ===== */}
      <NewCameraController />
      <EngineLoop />
      <AudioTracker />
      <BulletRenderer />
      <ArrowRenderer />
      <ScreenShake />
      <DamageNumbers />
      <BulletDecals />

      {/* Explosion + muzzle flash VFX */}
      <ExplosionSystem />
      <MuzzleFlashSystem />

      {/* Magic projectile VFX (orbs, javelins, waves) */}
      <MagicSystem />

      {/* Skill ground-plane VFX (rings, bursts, sparks) */}
      <SkillEffects ref={skillEffectsRef} />

      {/* Enhanced post-processing stack */}
      <PostFX />

      <Suspense fallback={null}>
        <Terrain />
        <PlayerCharacter />

        {/* Loot chests scattered across the world */}
        <WorldLoot />

        {/* Scene portals at biome borders */}
        <WorldPortals />

        {/* Hero unit showcase */}
        <UnitShowcase />

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
