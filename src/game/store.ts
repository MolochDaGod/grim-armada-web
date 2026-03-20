import { create } from 'zustand';
import { HAMSystem } from './core/HAMSystem';
import { CombatSystem, type ICombatActor } from './combat/CombatSystem';
import {
  CombatState, Posture, WeaponType, DamageType, SkillModType, HAMType,
  type AttackResult, Species, Faction, Profession,
} from './core/types';

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

  // UI
  combatLog: CombatLogEntry[];
  logCounter: number;
  isGameRunning: boolean;

  // Grudge auth
  grudgeId: string | null;
  isAuthenticated: boolean;

  // Animation callback (set by scene)
  _onAttackVisual: ((result: AttackResult) => void) | null;

  // Actions
  setTarget: (id: string | null) => void;
  useAbility: (abilityId: string) => void;
  movePlayer: (dx: number, dz: number) => void;
  rotatePlayer: (angle: number) => void;
  addLog: (msg: string, type: CombatLogEntry['type']) => void;
  tick: (dt: number) => void;
  setGrudgeId: (id: string | null) => void;
  resetGame: () => void;
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

    // Fire visual bullet
    if (attacker && target) {
      try {
        const { fireShot } = require('./scene/BulletSystem');
        const color = result.attackerId === 'player' ? '#ffaa22' : '#ff4444';
        fireShot(attacker.position, target.position, color);
      } catch { /* BulletSystem not loaded yet */ }
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
    enemies,
    targetId: null,
    combatLog: [],
    logCounter: 0,
    isGameRunning: true,
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
        const newPos: [number, number, number] = [
          Math.max(-30, Math.min(30, px + dx)),
          py,
          Math.max(-30, Math.min(30, pz + dz)),
        ];
        s.playerActor.position = { x: newPos[0], y: newPos[1], z: newPos[2] };
        return { playerPosition: newPos };
      });
    },

    rotatePlayer: (angle) => set(s => ({ playerRotation: s.playerRotation + angle })),

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
      });
    },
  };
});
