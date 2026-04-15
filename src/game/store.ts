import { create } from 'zustand';
import { HAMSystem } from './core/HAMSystem';
import { CombatSystem, type ICombatActor } from './combat/CombatSystem';
import {
  CombatState, Posture, WeaponType, DamageType, SkillModType, HAMType,
  type AttackResult, Species, Faction, Profession,
} from './core/types';
import { fireShot, triggerScreenShake, triggerHitMarker, spawnDamageNumber } from './scene/BulletSystem';
import { audioManager } from './audio/AudioManager';

// ===== Weapon Modes (from Motion) =====
export type WeaponMode = 'pistol' | 'rifle' | 'sword' | 'axe' | 'staff' | 'bow' | 'shield' | 'fishingpole' | 'sandstorm';
export const WEAPON_CYCLE: WeaponMode[] = ['pistol', 'rifle', 'sword', 'axe', 'staff', 'bow', 'shield', 'fishingpole', 'sandstorm'];

// ===== Player Mode =====
export type PlayerMode = 'harvest' | 'combat';

// ===== Camera View Modes (from Motion) =====
export type CameraViewMode = 'tps' | 'action' | 'fps';
export const CAMERA_CYCLE: CameraViewMode[] = ['tps', 'action', 'fps'];

export interface CameraSettings {
  mode: CameraViewMode;
  fov: number;
  sensitivity: number;
  shoulderX: number;
  shoulderY: number;
  shoulderZ: number;
}

export const DEFAULT_CAMERA: CameraSettings = {
  mode: 'tps', fov: 70, sensitivity: 0.002,
  shoulderX: 0.52, shoulderY: 1.30, shoulderZ: 2.55,
};

// ===== Quality Presets (from YAZH) =====
export type QualityLevel = 'low' | 'medium' | 'high';
export interface VisualSettings {
  quality: QualityLevel;
  fog: boolean;
  volumetricFog: boolean;
  raining: boolean;
  raindrops: boolean;
  clouds: number;
  dynamicClouds: boolean;
  lightning: boolean;
  bulletHoles: boolean;
  softParticles: boolean;
  bulletPaths: boolean;
}

export const QUALITY_PRESETS: Record<QualityLevel, VisualSettings> = {
  low: { quality: 'low', fog: true, volumetricFog: false, raining: false, raindrops: false, clouds: 0, dynamicClouds: false, lightning: false, bulletHoles: false, softParticles: false, bulletPaths: false },
  medium: { quality: 'medium', fog: true, volumetricFog: false, raining: true, raindrops: true, clouds: 100, dynamicClouds: true, lightning: true, bulletHoles: true, softParticles: false, bulletPaths: false },
  high: { quality: 'high', fog: true, volumetricFog: true, raining: true, raindrops: true, clouds: 300, dynamicClouds: true, lightning: true, bulletHoles: true, softParticles: true, bulletPaths: true },
};

// ===== NPC Definition =====
export interface NPCActor extends ICombatActor {
  name: string;
  level: number;
  color: string;
  positionVec: [number, number, number];
}

// ===== Combat Log Entry =====
export interface CombatLogEntry {
  id: number;
  time: number;
  message: string;
  type: 'damage' | 'heal' | 'miss' | 'system' | 'death';
}

// ===== Player State =====
export interface PlayerState {
  name: string;
  species: Species;
  faction: Faction;
  profession: Profession;
  level: number;
  xp: number;
}

// ===== Store Shape =====
interface GameStore {
  // Systems
  ham: HAMSystem;
  combat: CombatSystem;

  // Player
  player: PlayerState;
  playerActor: ICombatActor;
  playerPosition: [number, number, number];
  playerRotation: number;

  // Enemies
  enemies: NPCActor[];
  targetId: string | null;

  // Camera (legacy — kept for backward compat)
  cameraYaw: number;
  cameraPitch: number;

  // Camera (new — Motion-style)
  camera: CameraSettings;
  isAiming: boolean;
  cameraShakeIntensity: number;

  // Weapon System (from Motion)
  weaponMode: WeaponMode;
  playerMode: PlayerMode;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  meleeBlocking: boolean;

  // Mana (for staff/magic)
  mana: number;
  maxMana: number;

  // Survival (from Motion + YAZH)
  wave: number;
  kills: number;
  score: number;
  gold: number;

  // Skill cooldowns (keyed by skill id)
  skillCooldowns: Record<string, number>;

  // Visual Settings (from YAZH)
  visualSettings: VisualSettings;

  // Day/Night
  dayTime: number; // 0..1 (0=midnight, 0.5=noon)

  // Magic projectiles
  magicProjectiles: import('../game/weapons/MagicProjectile').MagicProjectileState[];

  // Arrows
  arrows: import('../game/weapons/Arrow').ArrowData[];

  // Vehicle
  isInVehicle: boolean;
  isMounted: boolean; // flying mount

  // UI
  combatLog: CombatLogEntry[];
  logCounter: number;
  isGameRunning: boolean;
  showMainPanel: boolean;

  // Grudge auth
  grudgeId: string | null;
  isAuthenticated: boolean;

  // Animation callback (set by scene)
  _onAttackVisual: ((result: AttackResult) => void) | null;

  // Actions — Legacy
  setTarget: (id: string | null) => void;
  useAbility: (abilityId: string) => void;
  movePlayer: (dx: number, dz: number) => void;
  rotatePlayer: (angle: number) => void;
  setCameraRotation: (yaw: number, pitch: number) => void;
  addLog: (msg: string, type: CombatLogEntry['type']) => void;
  tick: (dt: number) => void;
  setGrudgeId: (id: string | null) => void;
  resetGame: () => void;

  // Actions — Weapon
  setWeaponMode: (m: WeaponMode) => void;
  cycleWeapon: () => void;
  togglePlayerMode: () => void;
  setAiming: (v: boolean) => void;
  shoot: () => boolean;
  reload: () => void;
  setReloading: (v: boolean) => void;
  setMeleeBlocking: (v: boolean) => void;
  useMana: (amount: number) => boolean;
  regenMana: (amount: number) => void;

  // Actions — Survival
  addKill: () => void;
  addScore: (pts: number) => void;
  addGold: (g: number) => void;
  nextWave: () => void;
  setSkillCooldown: (id: string, cd: number) => void;
  tickSkillCooldowns: (dt: number) => void;

  // Actions — Camera
  setCameraMode: (m: CameraViewMode) => void;
  cycleCameraMode: () => void;
  setCameraShake: (v: number) => void;
  setShoulderSwap: () => void;

  // Actions — Visuals
  setQuality: (q: QualityLevel) => void;

  // Actions — Magic Projectiles
  addMagicProjectile: (p: import('../game/weapons/MagicProjectile').MagicProjectileState) => void;
  removeMagicProjectile: (id: string) => void;

  // Actions — Arrows
  addArrow: (a: import('../game/weapons/Arrow').ArrowData) => void;
  removeArrow: (id: string) => void;

  // Actions — Vehicle
  setInVehicle: (v: boolean) => void;
  setMounted: (v: boolean) => void;
}

function createPlayerActor(ham: HAMSystem): ICombatActor {
  return {
    actorId: 'player',
    ham,
    combatState: CombatState.Peace,
    posture: Posture.Standing,
    weaponType: WeaponType.Rifle,
    position: { x: 0, y: 0, z: 0 },
    getDefenseValue: () => 15,
    getArmorRating: () => 20,
    getSkillMod: (mod: SkillModType) => {
      const mods: Record<string, number> = {
        [SkillModType.RangedAccuracy]: 25,
        [SkillModType.MeleeAccuracy]: 20,
        [SkillModType.CriticalChance]: 8,
        [SkillModType.WeaponDamage]: 15,
      };
      return mods[mod] ?? 0;
    },
  };
}

function createEnemies(): NPCActor[] {
  const defs = [
    { name: 'Tusken Raider', level: 5, color: '#a86432', pos: [12, 0, 8] as [number, number, number], hp: 600, ap: 400, mp: 300 },
    { name: 'Stormtrooper', level: 8, color: '#cccccc', pos: [-10, 0, 15] as [number, number, number], hp: 800, ap: 500, mp: 350 },
    { name: 'Dark Acolyte', level: 12, color: '#8b0000', pos: [5, 0, -18] as [number, number, number], hp: 1200, ap: 800, mp: 600 },
  ];

  return defs.map((d, i) => {
    const ham = new HAMSystem(d.hp, d.ap, d.mp);
    return {
      actorId: `npc_${i}`,
      name: d.name,
      level: d.level,
      color: d.color,
      ham,
      combatState: CombatState.Peace,
      posture: Posture.Standing,
      weaponType: WeaponType.Rifle,
      position: { x: d.pos[0], y: d.pos[1], z: d.pos[2] },
      positionVec: d.pos,
      getDefenseValue: () => 5 + d.level * 2,
      getArmorRating: () => 5 + d.level * 1.5,
      getSkillMod: () => d.level * 2,
    };
  });
}

export const useGameStore = create<GameStore>((set, get) => {
  const ham = new HAMSystem(1000, 800, 600);
  const combat = new CombatSystem();
  const playerActor = createPlayerActor(ham);
  const enemies = createEnemies();

  // Register all actors
  combat.registerActor(playerActor);
  enemies.forEach(e => combat.registerActor(e));

  // Wire combat log + visual bullet/animation callbacks
  combat.onAttackResult = (result: AttackResult) => {
    const s = get();
    const attacker = result.attackerId === 'player' ? s.playerActor : s.enemies.find(e => e.actorId === result.attackerId);
    const target = result.targetId === 'player' ? s.playerActor : s.enemies.find(e => e.actorId === result.targetId);
    const attName = result.attackerId === 'player' ? s.player.name : (s.enemies.find(e => e.actorId === result.attackerId)?.name ?? result.attackerId);
    const tgtName = result.targetId === 'player' ? s.player.name : (s.enemies.find(e => e.actorId === result.targetId)?.name ?? result.targetId);

    // Fire visual bullet + VFX + Audio
    if (attacker && target) {
      const isPlayer = result.attackerId === 'player';
      fireShot(attacker.position, target.position, isPlayer ? '#ffaa22' : '#ff4444');

      // Gunshot audio (pan based on attacker position relative to player)
      if (isPlayer) {
        audioManager.playGunshot(0);
      } else {
        const playerPos = get().playerActor.position;
        const dx = attacker.position.x - playerPos.x;
        const pan = Math.max(-1, Math.min(1, dx * 0.1));
        audioManager.playGunshot(pan);
      }

      if (result.hit && result.damageDealt > 0) {
        // Hit marker + damage number + impact sound
        if (isPlayer) triggerHitMarker(result.critical);
        audioManager.playImpact(result.critical);
        spawnDamageNumber(target.position, result.damageDealt, result.critical, false);
      } else if (result.hit && result.damageDealt < 0) {
        // Heal number
        spawnDamageNumber(target.position, result.damageDealt, false, true);
      }

      // Screen shake when player takes damage
      if (result.targetId === 'player' && result.hit && result.damageDealt > 0) {
        triggerScreenShake(result.critical ? 0.25 : 0.1);
      }
    }

    // Notify animation callbacks
    if (s._onAttackVisual) s._onAttackVisual(result);

    if (!result.hit) {
      const reason = result.dodged ? 'dodged' : result.blocked ? 'blocked' : 'parried';
      s.addLog(`${tgtName} ${reason} ${attName}'s attack`, 'miss');
    } else if (result.damageDealt < 0) {
      s.addLog(`${attName} healed ${tgtName} for ${Math.abs(result.damageDealt)} ${result.poolHit}`, 'heal');
    } else {
      let msg = `${attName} hit ${tgtName} for ${result.damageDealt} ${result.poolHit}`;
      if (result.critical) msg += ' CRIT!';
      if (result.glancing) msg += ' (glancing)';
      s.addLog(msg, 'damage');
    }
  };

  return {
    ham,
    combat,
    player: { name: 'Commander', species: Species.Human, faction: Faction.Rebel, profession: Profession.Marksman, level: 10, xp: 0 },
    playerActor,
    playerPosition: [0, 0, 0],
    playerRotation: 0,
    cameraYaw: 0,
    cameraPitch: 0.3,
    enemies,
    targetId: null,

    // Camera (new)
    camera: { ...DEFAULT_CAMERA },
    isAiming: false,
    cameraShakeIntensity: 0,

    // Weapon System
    weaponMode: 'rifle' as WeaponMode,
    playerMode: 'combat' as PlayerMode,
    ammo: 30,
    maxAmmo: 30,
    isReloading: false,
    meleeBlocking: false,

    // Mana
    mana: 100,
    maxMana: 100,

    // Survival
    wave: 1,
    kills: 0,
    score: 0,
    gold: 0,

    // Skill cooldowns
    skillCooldowns: {} as Record<string, number>,

    // Visual Settings
    visualSettings: { ...QUALITY_PRESETS.medium },

    // Day/Night
    dayTime: 0.35, // morning

    // Magic projectiles
    magicProjectiles: [] as any[],

    // Arrows
    arrows: [] as any[],

    // Vehicle
    isInVehicle: false,
    isMounted: false,

    combatLog: [],
    logCounter: 0,
    isGameRunning: true,
    showMainPanel: false,
    grudgeId: null,
    isAuthenticated: false,
    _onAttackVisual: null,

    setTarget: (id) => {
      set({ targetId: id });
      get().combat.setTarget('player', id);
      if (id) {
        const enemy = get().enemies.find(e => e.actorId === id);
        if (enemy) get().addLog(`Targeting: ${enemy.name}`, 'system');
      }
    },

    useAbility: (abilityId) => {
      const s = get();
      const result = s.combat.useAbility('player', abilityId);
      if (!result) {
        const cd = s.combat.getCooldownRemaining('player', abilityId);
        if (cd > 0) s.addLog(`Ability on cooldown (${cd.toFixed(1)}s)`, 'system');
        else s.addLog('Cannot use ability', 'system');
      }
      // Force re-render
      set({});
    },

    movePlayer: (dx, dz) => {
      set(s => {
        const [px, py, pz] = s.playerPosition;
        const BOUND = 150;
        const newPos: [number, number, number] = [
          Math.max(-BOUND, Math.min(BOUND, px + dx)),
          py,
          Math.max(-BOUND, Math.min(BOUND, pz + dz)),
        ];
        s.playerActor.position = { x: newPos[0], y: newPos[1], z: newPos[2] };
        return { playerPosition: newPos };
      });
    },

    rotatePlayer: (angle) => set(s => ({ playerRotation: s.playerRotation + angle })),

    setCameraRotation: (yaw, pitch) => set({ cameraYaw: yaw, cameraPitch: pitch }),

    addLog: (msg, type) => set(s => ({
      logCounter: s.logCounter + 1,
      combatLog: [...s.combatLog.slice(-50), { id: s.logCounter, time: Date.now(), message: msg, type }],
    })),

    tick: (dt) => {
      const s = get();
      s.ham.update(dt);
      s.combat.update(dt);
      s.enemies.forEach(e => e.ham.update(dt));

      // Enemy AI: attack player when targeted
      s.enemies.forEach(e => {
        if (e.ham.state === CombatState.Dead) return;
        if (s.targetId === e.actorId && e.combatState !== CombatState.Combat) {
          s.combat.setTarget(e.actorId, 'player');
        }
      });

      // Check enemy deaths
      s.enemies.forEach(e => {
        if (e.ham.isDead && e.combatState !== CombatState.Dead) {
          e.combatState = CombatState.Dead;
          s.addLog(`${e.name} has been defeated!`, 'death');
          audioManager.playDeath();
        }
      });

      set({});
    },

    setGrudgeId: (id) => set({ grudgeId: id, isAuthenticated: !!id }),

    resetGame: () => {
      const newHam = new HAMSystem(1000, 800, 600);
      const newCombat = new CombatSystem();
      const newPlayer = createPlayerActor(newHam);
      const newEnemies = createEnemies();
      newCombat.registerActor(newPlayer);
      newEnemies.forEach(e => newCombat.registerActor(e));
      newCombat.onAttackResult = combat.onAttackResult;
      set({
        ham: newHam, combat: newCombat, playerActor: newPlayer, enemies: newEnemies,
        targetId: null, combatLog: [], playerPosition: [0, 0, 0], playerRotation: 0,
        weaponMode: 'rifle' as WeaponMode, ammo: 30, maxAmmo: 30, mana: 100,
        wave: 1, kills: 0, score: 0, gold: 0, skillCooldowns: {},
        isInVehicle: false, isMounted: false, dayTime: 0.35,
      });
    },

    // ===== Weapon Actions =====
    setWeaponMode: (m) => set({ weaponMode: m }),
    cycleWeapon: () => set(s => {
      const idx = WEAPON_CYCLE.indexOf(s.weaponMode);
      const next = WEAPON_CYCLE[(idx + 1) % WEAPON_CYCLE.length];
      return { weaponMode: next, ammo: 30, maxAmmo: 30, isReloading: false };
    }),
    togglePlayerMode: () => set(s => ({
      playerMode: s.playerMode === 'combat' ? 'harvest' : 'combat',
    })),
    setAiming: (v) => set({ isAiming: v }),
    shoot: () => {
      const s = get();
      if (s.isReloading || s.ammo <= 0) return false;
      set({ ammo: s.ammo - 1 });
      return true;
    },
    reload: () => {
      const s = get();
      if (s.isReloading || s.ammo >= s.maxAmmo) return;
      set({ isReloading: true });
      setTimeout(() => {
        set({ ammo: get().maxAmmo, isReloading: false });
      }, 2000);
    },
    setReloading: (v) => set({ isReloading: v }),
    setMeleeBlocking: (v) => set({ meleeBlocking: v }),
    useMana: (amount) => {
      const s = get();
      if (s.mana < amount) return false;
      set({ mana: s.mana - amount });
      return true;
    },
    regenMana: (amount) => set(s => ({ mana: Math.min(s.maxMana, s.mana + amount) })),

    // ===== Survival Actions =====
    addKill: () => set(s => ({ kills: s.kills + 1, score: s.score + 50 })),
    addScore: (pts) => set(s => ({ score: s.score + pts })),
    addGold: (g) => set(s => ({ gold: s.gold + g })),
    nextWave: () => set(s => ({ wave: s.wave + 1 })),
    setSkillCooldown: (id, cd) => set(s => ({
      skillCooldowns: { ...s.skillCooldowns, [id]: cd },
    })),
    tickSkillCooldowns: (dt) => set(s => {
      const updated: Record<string, number> = {};
      let changed = false;
      for (const [id, cd] of Object.entries(s.skillCooldowns)) {
        const next = Math.max(0, cd - dt);
        if (next !== cd) changed = true;
        if (next > 0) updated[id] = next;
      }
      return changed ? { skillCooldowns: updated } : {};
    }),

    // ===== Camera Actions =====
    setCameraMode: (m) => set(s => ({ camera: { ...s.camera, mode: m } })),
    cycleCameraMode: () => set(s => {
      const idx = CAMERA_CYCLE.indexOf(s.camera.mode);
      const next = CAMERA_CYCLE[(idx + 1) % CAMERA_CYCLE.length];
      return { camera: { ...s.camera, mode: next } };
    }),
    setCameraShake: (v) => set({ cameraShakeIntensity: v }),
    setShoulderSwap: () => set(s => ({ camera: { ...s.camera, shoulderX: -s.camera.shoulderX } })),

    // ===== Visual Settings =====
    setQuality: (q) => set({ visualSettings: { ...QUALITY_PRESETS[q] } }),

    // ===== Magic Projectile Actions =====
    addMagicProjectile: (p) => set(s => ({ magicProjectiles: [...s.magicProjectiles, p] })),
    removeMagicProjectile: (id) => set(s => ({ magicProjectiles: s.magicProjectiles.filter(p => p.id !== id) })),

    // ===== Arrow Actions =====
    addArrow: (a) => set(s => ({ arrows: [...s.arrows, a] })),
    removeArrow: (id) => set(s => ({ arrows: s.arrows.filter(a => a.id !== id) })),

    // ===== Vehicle Actions =====
    setInVehicle: (v) => set({ isInVehicle: v }),
    setMounted: (v) => set({ isMounted: v }),
  };
});
