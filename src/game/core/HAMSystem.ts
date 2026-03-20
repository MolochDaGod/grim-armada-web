import { HAMType, CombatState, type DamageResult } from './types';

type HAMCallback = (current: number, max: number) => void;

export class HAMPool {
  private baseCurrent: number;
  private baseMax: number;
  private wounds = 0;
  private encumbrance = 0;
  private regenRate: number;
  private regenTimer = 0;
  private bonusMax = 0;
  private bonusRegen = 0;

  onChange?: HAMCallback;
  onDepleted?: () => void;

  constructor(baseMax: number, regenRate = 1) {
    this.baseMax = baseMax;
    this.baseCurrent = baseMax;
    this.regenRate = regenRate;
  }

  get current() { return Math.max(0, this.baseCurrent); }
  get max() { return Math.max(1, this.baseMax + this.bonusMax - this.wounds - this.encumbrance); }
  get woundsVal() { return this.wounds; }
  get percentage() { return this.current / this.max; }
  get isEmpty() { return this.current <= 0; }
  get isFull() { return this.current >= this.max; }

  modify(amount: number): number {
    const old = this.baseCurrent;
    this.baseCurrent = Math.max(0, Math.min(this.baseCurrent + amount, this.max));
    if (this.baseCurrent !== old) {
      this.onChange?.(this.baseCurrent, this.max);
      if (this.baseCurrent <= 0) this.onDepleted?.();
    }
    return this.baseCurrent - old;
  }

  applyWounds(amount: number) {
    this.wounds = Math.max(0, this.wounds + amount);
    if (this.baseCurrent > this.max) this.baseCurrent = this.max;
    this.onChange?.(this.baseCurrent, this.max);
  }

  healWounds(amount: number) { this.applyWounds(-amount); }

  setEncumbrance(amount: number) {
    this.encumbrance = Math.max(0, amount);
    if (this.baseCurrent > this.max) this.baseCurrent = this.max;
    this.onChange?.(this.baseCurrent, this.max);
  }

  addBonusMax(amount: number) {
    this.bonusMax += amount;
    this.onChange?.(this.baseCurrent, this.max);
  }

  addBonusRegen(amount: number) { this.bonusRegen += amount; }

  updateRegen(dt: number) {
    if (this.isFull || this.isEmpty) return;
    this.regenTimer += dt;
    const interval = 1 / (this.regenRate + this.bonusRegen);
    if (this.regenTimer >= interval) {
      this.regenTimer = 0;
      const regenAmt = Math.max(1, Math.round(this.max * 0.01));
      this.modify(regenAmt);
    }
  }

  reset() { this.baseCurrent = this.max; this.onChange?.(this.baseCurrent, this.max); }

  fullReset() {
    this.wounds = 0;
    this.encumbrance = 0;
    this.bonusMax = 0;
    this.bonusRegen = 0;
    this.baseCurrent = this.baseMax;
    this.onChange?.(this.baseCurrent, this.max);
  }
}

export class HAMSystem {
  health: HAMPool;
  action: HAMPool;
  mind: HAMPool;

  private combatState = CombatState.Peace;
  private incapCount = 0;
  private readonly MAX_INCAP = 3;
  private incapTimer = 0;
  private readonly INCAP_DURATION = 10;

  onCombatStateChanged?: (state: CombatState) => void;
  onIncapacitated?: () => void;
  onDeath?: () => void;
  onRevived?: () => void;

  constructor(healthMax = 1000, actionMax = 800, mindMax = 600) {
    this.health = new HAMPool(healthMax, 1);
    this.action = new HAMPool(actionMax, 1.2);
    this.mind = new HAMPool(mindMax, 0.8);
    this.health.onDepleted = () => this.handlePoolDepleted();
    this.action.onDepleted = () => this.handlePoolDepleted();
    this.mind.onDepleted = () => this.handlePoolDepleted();
  }

  get state() { return this.combatState; }
  get isIncapacitated() { return this.combatState === CombatState.Incapacitated; }
  get isDead() { return this.combatState === CombatState.Dead; }

  getPool(type: HAMType): HAMPool {
    switch (type) {
      case HAMType.Health: return this.health;
      case HAMType.Action: return this.action;
      case HAMType.Mind: return this.mind;
      default: return this.health;
    }
  }

  modifyPool(type: HAMType, amount: number) {
    return this.getPool(type).modify(amount);
  }

  applyDamage(amount: number, targetPool: HAMType, canWound = false, woundChance = 0.1): DamageResult {
    if (this.combatState === CombatState.Dead) return { finalDamage: 0, absorbed: amount, woundsApplied: 0, wasCritical: false, wasGlancing: false };
    const pool = this.getPool(targetPool);
    const result: DamageResult = { finalDamage: 0, absorbed: 0, woundsApplied: 0, wasCritical: false, wasGlancing: false };
    result.finalDamage = Math.abs(pool.modify(-amount));
    if (canWound && Math.random() < woundChance) {
      const w = Math.max(1, Math.floor(amount / 20));
      pool.applyWounds(w);
      result.woundsApplied = w;
    }
    return result;
  }

  private handlePoolDepleted() {
    if (this.combatState === CombatState.Dead) return;
    if (this.health.isEmpty || this.action.isEmpty || this.mind.isEmpty) {
      this.incapCount++;
      if (this.incapCount >= this.MAX_INCAP) {
        this.setCombatState(CombatState.Dead);
        this.onDeath?.();
      } else {
        this.setCombatState(CombatState.Incapacitated);
        this.onIncapacitated?.();
        this.incapTimer = this.INCAP_DURATION;
      }
    }
  }

  update(dt: number) {
    switch (this.combatState) {
      case CombatState.Peace:
      case CombatState.Combat:
        this.health.updateRegen(dt);
        this.action.updateRegen(dt);
        this.mind.updateRegen(dt);
        break;
      case CombatState.Incapacitated:
        this.incapTimer -= dt;
        if (this.incapTimer <= 0) this.revive(0.1);
        break;
    }
  }

  revive(pct = 0.25) {
    if (this.combatState !== CombatState.Incapacitated) return;
    this.health.modify(Math.round(this.health.max * pct));
    this.action.modify(Math.round(this.action.max * pct));
    this.mind.modify(Math.round(this.mind.max * pct));
    this.setCombatState(CombatState.Peace);
    this.onRevived?.();
  }

  clone() {
    this.incapCount = 0;
    this.health.fullReset();
    this.action.fullReset();
    this.mind.fullReset();
    this.setCombatState(CombatState.Peace);
    this.onRevived?.();
  }

  enterCombat() {
    if (this.combatState === CombatState.Peace) this.setCombatState(CombatState.Combat);
  }

  leaveCombat() {
    if (this.combatState === CombatState.Combat) {
      this.setCombatState(CombatState.Peace);
      this.incapCount = 0;
    }
  }

  private setCombatState(s: CombatState) {
    if (this.combatState !== s) {
      this.combatState = s;
      this.onCombatStateChanged?.(s);
    }
  }
}
