// ===== GRIM ARMADA — Game Types =====
// Ported from Unity SWGSystems

export enum Profession {
  Marksman = 'Marksman', Rifleman = 'Rifleman', Pistoleer = 'Pistoleer', Carbineer = 'Carbineer',
  Brawler = 'Brawler', TeasKasi = 'TeasKasi', Fencer = 'Fencer', Swordsman = 'Swordsman', PikePolearm = 'PikePolearm',
  BountyHunter = 'BountyHunter', Commando = 'Commando', CombatMedic = 'CombatMedic', SquadLeader = 'SquadLeader',
  Scout = 'Scout', Ranger = 'Ranger', CreatureHandler = 'CreatureHandler',
  Entertainer = 'Entertainer', Dancer = 'Dancer', Musician = 'Musician', ImageDesigner = 'ImageDesigner',
  Medic = 'Medic', Doctor = 'Doctor',
  Artisan = 'Artisan', Weaponsmith = 'Weaponsmith', Armorsmith = 'Armorsmith', Droidengineer = 'Droidengineer',
  Tailor = 'Tailor', Chef = 'Chef', Architect = 'Architect', Merchant = 'Merchant',
  Politician = 'Politician', ForceSensitive = 'ForceSensitive', Jedi = 'Jedi',
  Smuggler = 'Smuggler', BioEngineer = 'BioEngineer',
}

export enum CombatState { Peace = 'Peace', Combat = 'Combat', Incapacitated = 'Incapacitated', Dead = 'Dead', Cloning = 'Cloning' }

export enum Posture {
  Standing = 'Standing', Crouching = 'Crouching', Prone = 'Prone', Sitting = 'Sitting',
  Sneaking = 'Sneaking', Climbing = 'Climbing', Flying = 'Flying', Swimming = 'Swimming',
  Driving = 'Driving', RidingMount = 'RidingMount', Incapacitated = 'Incapacitated', Dead = 'Dead',
}

export enum HAMType {
  Health = 'Health', Action = 'Action', Mind = 'Mind',
  HealthRegen = 'HealthRegen', ActionRegen = 'ActionRegen', MindRegen = 'MindRegen',
  HealthWounds = 'HealthWounds', ActionWounds = 'ActionWounds', MindWounds = 'MindWounds',
  HealthEncumbrance = 'HealthEncumbrance', ActionEncumbrance = 'ActionEncumbrance', MindEncumbrance = 'MindEncumbrance',
}

export enum DamageType {
  Kinetic = 'Kinetic', Energy = 'Energy', Blast = 'Blast', Stun = 'Stun',
  Heat = 'Heat', Cold = 'Cold', Acid = 'Acid', Electricity = 'Electricity',
  LightsaberKinetic = 'LightsaberKinetic', LightsaberEnergy = 'LightsaberEnergy',
}

export enum WeaponType {
  Pistol = 'Pistol', Carbine = 'Carbine', Rifle = 'Rifle', HeavyWeapon = 'HeavyWeapon',
  OneHandMelee = 'OneHandMelee', TwoHandMelee = 'TwoHandMelee', Polearm = 'Polearm', Unarmed = 'Unarmed',
  Lightsaber = 'Lightsaber', Thrown = 'Thrown', FlameThrower = 'FlameThrower',
}

export enum ArmorRating { None = 'None', Light = 'Light', Medium = 'Medium', Heavy = 'Heavy', Assault = 'Assault' }

export enum Species {
  Human = 'Human', Twilek = 'Twilek', Rodian = 'Rodian', Trandoshan = 'Trandoshan',
  Wookiee = 'Wookiee', MonCalamari = 'MonCalamari', Bothan = 'Bothan', Zabrak = 'Zabrak',
  Ithorian = 'Ithorian', Sullustan = 'Sullustan',
}

export enum Faction {
  Neutral = 'Neutral', Imperial = 'Imperial', Rebel = 'Rebel',
  Jabba = 'Jabba', Hutt = 'Hutt', Tusken = 'Tusken', Jawa = 'Jawa',
}

export enum SkillModType {
  RangedAccuracy = 'RangedAccuracy', RangedSpeed = 'RangedSpeed', RangedDefense = 'RangedDefense',
  MeleeAccuracy = 'MeleeAccuracy', MeleeSpeed = 'MeleeSpeed', MeleeDefense = 'MeleeDefense',
  WeaponDamage = 'WeaponDamage', CriticalChance = 'CriticalChance', CriticalDamage = 'CriticalDamage',
  Armor = 'Armor', Dodge = 'Dodge', Block = 'Block', Parry = 'Parry',
  HealthBonus = 'HealthBonus', ActionBonus = 'ActionBonus', MindBonus = 'MindBonus',
  HealthRegen = 'HealthRegen', ActionRegen = 'ActionRegen', MindRegen = 'MindRegen',
  AssemblySuccess = 'AssemblySuccess', ExperimentSuccess = 'ExperimentSuccess',
  HealingDance = 'HealingDance', HealingMusic = 'HealingMusic', BuffStrength = 'BuffStrength',
  HealingRange = 'HealingRange', HealingPower = 'HealingPower', WoundHealing = 'WoundHealing',
  CreatureControl = 'CreatureControl', CreatureEmpathy = 'CreatureEmpathy',
  Luck = 'Luck', Terrain = 'Terrain', Camouflage = 'Camouflage',
}

export enum BuffCategory { Medical = 'Medical', Entertainer = 'Entertainer', Food = 'Food', Spice = 'Spice', Combat = 'Combat', Force = 'Force', Creature = 'Creature', Item = 'Item' }

export enum StatusEffect {
  None = 0, Stunned = 1, Blinded = 2, Dizzy = 4, Intimidated = 8,
  Snared = 16, Rooted = 32, Bleeding = 64, Poisoned = 128,
  Diseased = 256, OnFire = 512, Knockdown = 1024, PostureDown = 2048,
  BattleFatigue = 4096, Inspired = 8192, Focused = 16384,
}

// ===== Runtime Structs =====

export interface AttackResult {
  hit: boolean;
  critical: boolean;
  glancing: boolean;
  blocked: boolean;
  dodged: boolean;
  parried: boolean;
  damageDealt: number;
  poolHit: HAMType;
  effectsApplied: StatusEffect[];
  attackerId: string;
  targetId: string;
  abilityUsed: string;
}

export interface DamageResult {
  finalDamage: number;
  absorbed: number;
  woundsApplied: number;
  wasCritical: boolean;
  wasGlancing: boolean;
}

export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  animationTrigger: string;
  cooldownTime: number;
  executeTime: number;
  range: number;
  requiresTarget: boolean;
  canUseWhileMoving: boolean;
  costPool: HAMType;
  costAmount: number;
  damageType: DamageType;
  minDamage: number;
  maxDamage: number;
  targetPools: HAMType[];
  poolDistribution: number;
  appliedEffects: StatusEffect[];
  effectChance: number;
  effectDuration: number;
  accuracyMod: SkillModType;
  speedMod: SkillModType;
  damageMod: SkillModType;
  requiredWeaponTypes: WeaponType[];
  validPostures: Posture[];
  validStates: CombatState[];
  iconClass?: string;
}

export interface BuffDefinition {
  id: string;
  name: string;
  description: string;
  category: BuffCategory;
  isDebuff: boolean;
  stackable: boolean;
  maxStacks: number;
  defaultDuration: number;
  dispellable: boolean;
  effects: BuffEffect[];
}

export enum BuffEffectType {
  ModHealth = 'ModHealth', ModAction = 'ModAction', ModMind = 'ModMind',
  ModHealthRegen = 'ModHealthRegen', ModActionRegen = 'ModActionRegen', ModMindRegen = 'ModMindRegen',
  ModMeleeAccuracy = 'ModMeleeAccuracy', ModRangedAccuracy = 'ModRangedAccuracy',
  ModMeleeDefense = 'ModMeleeDefense', ModRangedDefense = 'ModRangedDefense',
  ModDamage = 'ModDamage', ModCritChance = 'ModCritChance', ModSpeed = 'ModSpeed', ModArmorRating = 'ModArmorRating',
  DamageOverTime = 'DamageOverTime', HealOverTime = 'HealOverTime', ActionDrain = 'ActionDrain', MindDrain = 'MindDrain',
  Stun = 'Stun', Root = 'Root', Snare = 'Snare', Blind = 'Blind', Silence = 'Silence', Taunt = 'Taunt', Stealth = 'Stealth', Invulnerable = 'Invulnerable',
}

export interface BuffEffect {
  type: BuffEffectType;
  value: number;
  isPercentage: boolean;
}

export interface ActiveBuff {
  definition: BuffDefinition;
  sourceId: string;
  remainingDuration: number;
  totalDuration: number;
  stacks: number;
  tickTimer: number;
}
