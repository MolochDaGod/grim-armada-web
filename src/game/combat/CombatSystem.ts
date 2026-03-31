import { HAMSystem } from '../core/HAMSystem';
import {
  HAMType, DamageType, WeaponType, CombatState, Posture, SkillModType,
  type AbilityDefinition, type AttackResult,
} from '../core/types';

export interface ICombatActor {
  actorId: string;
  ham: HAMSystem;
  combatState: CombatState;
  posture: Posture;
  weaponType: WeaponType;
  position: { x: number; y: number; z: number };
  getDefenseValue(dt: DamageType): number;
  getArmorRating(): number;
  getSkillMod(mod: SkillModType): number;
}

interface ActorState {
  targetId: string | null;
  lastCombatAction: number;
  nextAutoAttack: number;
  cooldowns: Map<string, number>;
  executingAbility: string | null;
  executeEndTime: number;
}

export class CombatSystem {
  private actors = new Map<string, ICombatActor>();
  private states = new Map<string, ActorState>();
  private abilities = new Map<string, AbilityDefinition>();

  onAttackResult?: (result: AttackResult) => void;

  private autoAttackInterval = 1.5;
  private combatTimeout = 10;

  constructor() {
    this.initAbilities();
  }

  registerActor(actor: ICombatActor) {
    this.actors.set(actor.actorId, actor);
    this.states.set(actor.actorId, {
      targetId: null, lastCombatAction: 0, nextAutoAttack: 0,
      cooldowns: new Map(), executingAbility: null, executeEndTime: 0,
    });
  }

  setTarget(actorId: string, targetId: string | null) {
    const state = this.states.get(actorId);
    if (!state) return;
    state.targetId = targetId;
    if (targetId) this.enterCombat(actorId);
  }

  getTarget(actorId: string) { return this.states.get(actorId)?.targetId ?? null; }

  enterCombat(actorId: string) {
    const actor = this.actors.get(actorId);
    const state = this.states.get(actorId);
    if (!actor || !state) return;
    if (actor.combatState !== CombatState.Combat) {
      actor.combatState = CombatState.Combat;
      actor.ham.enterCombat();
      state.lastCombatAction = performance.now() / 1000;
      state.nextAutoAttack = performance.now() / 1000 + this.autoAttackInterval;
    }
  }

  useAbility(actorId: string, abilityId: string): AttackResult | null {
    const actor = this.actors.get(actorId);
    const state = this.states.get(actorId);
    const ability = this.abilities.get(abilityId);
    if (!actor || !state || !ability) return null;

    // Check cooldown
    const cd = state.cooldowns.get(abilityId) ?? 0;
    if (cd > performance.now() / 1000) return null;

    // Check cost
    if (ability.costAmount > 0) {
      const pool = actor.ham.getPool(ability.costPool);
      if (pool.current < ability.costAmount) return null;
      pool.modify(-ability.costAmount);
    }

    // Set cooldown
    state.cooldowns.set(abilityId, performance.now() / 1000 + ability.cooldownTime);
    state.lastCombatAction = performance.now() / 1000;

    // Resolve damage
    if (ability.requiresTarget && state.targetId) {
      const target = this.actors.get(state.targetId);
      if (target) {
        const result = this.calculateAttack(actor, target, ability);
        this.applyResult(result, target);
        this.onAttackResult?.(result);
        return result;
      }
    }
    return null;
  }

  update(dt: number) {
    const now = performance.now() / 1000;
    for (const [actorId, state] of this.states) {
      const actor = this.actors.get(actorId);
      if (!actor) continue;

      // Auto-attack
      if (actor.combatState === CombatState.Combat && state.targetId && now >= state.nextAutoAttack) {
        const target = this.actors.get(state.targetId);
        if (target && target.ham.state !== CombatState.Dead) {
          state.nextAutoAttack = now + this.autoAttackInterval;
          state.lastCombatAction = now;
          const autoAtk: AbilityDefinition = {
            id: 'autoAttack', name: 'Auto Attack', description: '', animationTrigger: '',
            cooldownTime: 0, executeTime: 0, range: 35, requiresTarget: true, canUseWhileMoving: true,
            costPool: HAMType.Action, costAmount: 0, damageType: DamageType.Energy,
            minDamage: 30, maxDamage: 60, targetPools: [HAMType.Health, HAMType.Action],
            poolDistribution: 0.5, appliedEffects: [], effectChance: 0, effectDuration: 0,
            accuracyMod: SkillModType.RangedAccuracy, speedMod: SkillModType.RangedSpeed,
            damageMod: SkillModType.WeaponDamage, requiredWeaponTypes: [], validPostures: [], validStates: [],
          };
          const result = this.calculateAttack(actor, target, autoAtk);
          this.applyResult(result, target);
          this.onAttackResult?.(result);
        }
      }

      // Combat timeout
      if (actor.combatState === CombatState.Combat && now - state.lastCombatAction > this.combatTimeout) {
        actor.combatState = CombatState.Peace;
        actor.ham.leaveCombat();
      }
    }
  }

  getCooldownRemaining(actorId: string, abilityId: string): number {
    const cd = this.states.get(actorId)?.cooldowns.get(abilityId) ?? 0;
    return Math.max(0, cd - performance.now() / 1000);
  }

  getAbility(id: string) { return this.abilities.get(id); }
  getAllAbilities() { return Array.from(this.abilities.values()); }

  private calculateAttack(attacker: ICombatActor, target: ICombatActor, ability: AbilityDefinition): AttackResult {
    const result: AttackResult = {
      hit: false, critical: false, glancing: false, blocked: false, dodged: false, parried: false,
      damageDealt: 0, poolHit: HAMType.Health, effectsApplied: [],
      attackerId: attacker.actorId, targetId: target.actorId, abilityUsed: ability.id,
    };

    const baseAcc = 65;
    const accMod = attacker.getSkillMod(ability.accuracyMod);
    const defense = target.getDefenseValue(ability.damageType);
    const hitChance = Math.max(10, Math.min(95, baseAcc + accMod - defense));

    if (Math.random() * 100 > hitChance) {
      const r = Math.random();
      if (r < 0.4) result.dodged = true;
      else if (r < 0.7) result.blocked = true;
      else result.parried = true;
      return result;
    }

    result.hit = true;
    let dmg = ability.minDamage + Math.floor(Math.random() * (ability.maxDamage - ability.minDamage + 1));

    if (dmg < 0) { result.damageDealt = dmg; result.poolHit = ability.targetPools[0]; return result; } // healing

    // Crit
    const critChance = 5 + attacker.getSkillMod(SkillModType.CriticalChance);
    if (Math.random() * 100 < critChance) { result.critical = true; dmg = Math.floor(dmg * 1.5); }

    // Glancing
    if (Math.random() * 100 < defense / 2) { result.glancing = true; dmg = Math.floor(dmg * 0.5); }

    // Armor
    dmg = Math.floor(dmg * (1 - target.getArmorRating() / 100));
    result.damageDealt = Math.max(1, dmg);

    // Pool target
    if (ability.targetPools.length === 1 || ability.poolDistribution >= 1) {
      result.poolHit = ability.targetPools[0];
    } else {
      result.poolHit = Math.random() < ability.poolDistribution ? ability.targetPools[0] : ability.targetPools[1];
    }

    return result;
  }

  private applyResult(result: AttackResult, target: ICombatActor) {
    if (!result.hit) return;
    // Heals are negative damageDealt → negating gives positive (heals pool)
    // Damage is positive damageDealt → negating gives negative (drains pool)
    target.ham.modifyPool(result.poolHit, -result.damageDealt);
  }

  private initAbilities() {
    const defs: Partial<AbilityDefinition>[] = [
      {
        id: 'burstShot', name: 'Burst Shot', description: 'Fire a quick burst',
        cooldownTime: 6, executeTime: 0.5, range: 35, requiresTarget: true,
        costPool: HAMType.Action, costAmount: 40, damageType: DamageType.Energy,
        minDamage: 80, maxDamage: 160, targetPools: [HAMType.Health, HAMType.Action],
        poolDistribution: 0.7, accuracyMod: SkillModType.RangedAccuracy, iconClass: '🔫',
      },
      {
        id: 'headShot', name: 'Head Shot', description: 'Precision shot to the head',
        cooldownTime: 12, executeTime: 1.2, range: 50, requiresTarget: true,
        costPool: HAMType.Mind, costAmount: 60, damageType: DamageType.Energy,
        minDamage: 150, maxDamage: 250, targetPools: [HAMType.Mind],
        accuracyMod: SkillModType.RangedAccuracy, iconClass: '🎯',
      },
      {
        id: 'powerAttack', name: 'Power Attack', description: 'Devastating melee strike',
        cooldownTime: 10, executeTime: 1, range: 5, requiresTarget: true,
        costPool: HAMType.Action, costAmount: 80, damageType: DamageType.Kinetic,
        minDamage: 200, maxDamage: 350, targetPools: [HAMType.Health],
        accuracyMod: SkillModType.MeleeAccuracy, damageMod: SkillModType.WeaponDamage, iconClass: '⚔️',
      },
      {
        id: 'healDamage', name: 'Heal', description: 'Restore health',
        cooldownTime: 5, executeTime: 2, range: 15, requiresTarget: false,
        costPool: HAMType.Mind, costAmount: 40,
        minDamage: -200, maxDamage: -300, targetPools: [HAMType.Health], iconClass: '💚',
      },
    ];

    for (const d of defs) {
      const full: AbilityDefinition = {
        id: '', name: '', description: '', animationTrigger: '', cooldownTime: 0, executeTime: 0,
        range: 0, requiresTarget: false, canUseWhileMoving: false, costPool: HAMType.Action,
        costAmount: 0, damageType: DamageType.Energy, minDamage: 0, maxDamage: 0, targetPools: [],
        poolDistribution: 0, appliedEffects: [], effectChance: 0, effectDuration: 0,
        accuracyMod: SkillModType.RangedAccuracy, speedMod: SkillModType.RangedSpeed,
        damageMod: SkillModType.WeaponDamage, requiredWeaponTypes: [], validPostures: [], validStates: [],
        ...d,
      };
      this.abilities.set(full.id, full);
    }
  }
}
