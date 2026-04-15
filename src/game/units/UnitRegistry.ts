/**
 * UnitRegistry — defines playable and AI character units.
 * Each unit has a GLB model, combat stats, capsule dimensions, and color.
 * Units can be used as the player character, AI allies (Gouldstone), or NPCs.
 */

export interface UnitDef {
  id: string;
  name: string;
  /** Path to GLB model under /public */
  mesh: string;
  /** Uniform scale for the loaded model */
  scale: number;
  /** Capsule half-height for Rapier physics */
  capsuleHH: number;
  /** Capsule radius for Rapier physics */
  capsuleR: number;
  /** CSS color for HUD character picker + fallback tint */
  color: string;
  /** Icon for UI */
  icon: string;
  /** Short description */
  description: string;
  /** Base combat stats */
  combat: {
    health: number;
    damage: number;
    defense: number;
    speed: number;
  };
  /** Tags for filtering (e.g. 'tank', 'dps', 'support') */
  tags: string[];
}

export const UNIT_REGISTRY: UnitDef[] = [
  {
    id: 'notable-ice',
    name: 'Notable Ice',
    mesh: '/models/units/notable-ice.glb',
    scale: 1.0,
    capsuleHH: 0.5,
    capsuleR: 0.35,
    color: '#69C0FF',
    icon: '🧊',
    description: 'Frost-infused warrior with high defense and crowd control abilities.',
    combat: { health: 1200, damage: 25, defense: 20, speed: 4.0 },
    tags: ['tank', 'frost', 'melee'],
  },
  {
    id: 'superhero-sns',
    name: 'Superhero SNS',
    mesh: '/models/units/superhero-sns.glb',
    scale: 1.0,
    capsuleHH: 0.5,
    capsuleR: 0.35,
    color: '#FF6B6B',
    icon: '🦸',
    description: 'Agile superhero with devastating burst damage and mobility.',
    combat: { health: 800, damage: 45, defense: 10, speed: 6.0 },
    tags: ['dps', 'agile', 'melee'],
  },
  {
    id: 'tge-hero',
    name: 'TGE Hero',
    mesh: '/models/units/tge-hero.glb',
    scale: 1.0,
    capsuleHH: 0.5,
    capsuleR: 0.35,
    color: '#D4AF37',
    icon: '⚔️',
    description: 'The Engine hero — balanced fighter with strong all-around stats.',
    combat: { health: 1000, damage: 35, defense: 15, speed: 5.0 },
    tags: ['balanced', 'versatile', 'melee'],
  },
];

/** Look up a unit by id; falls back to first entry if not found */
export function getUnitDef(id: string): UnitDef {
  return UNIT_REGISTRY.find(u => u.id === id) ?? UNIT_REGISTRY[0];
}

/** Get the next unit id in the registry (wraps around) */
export function nextUnitId(currentId: string): string {
  const idx = UNIT_REGISTRY.findIndex(u => u.id === currentId);
  return UNIT_REGISTRY[(idx + 1) % UNIT_REGISTRY.length].id;
}

/** Get all units matching a tag */
export function getUnitsByTag(tag: string): UnitDef[] {
  return UNIT_REGISTRY.filter(u => u.tags.includes(tag));
}
