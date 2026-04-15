/**
 * Spell Content Registry — spell definitions for the magic projectile system.
 * Ported from Motion content/spells.ts.
 */

import type { SpellType } from '../weapons/MagicProjectile';

export interface SpellDef {
  id: SpellType;
  name: string;
  icon: string;
  color: string;
  coreColor: string;
  damage: number;
  speed: number;
  radius: number;
  manaCost: number;
  cooldown: number;
  description: string;
}

export const SPELLS: SpellDef[] = [
  {
    id: 'orb', name: 'Arcane Orb', icon: '🔮',
    color: '#FFE600', coreColor: '#FFEACC',
    damage: 40, speed: 14, radius: 0.6,
    manaCost: 25, cooldown: 0.8,
    description: 'Slow orb of arcane energy',
  },
  {
    id: 'javelin', name: 'Frost Javelin', icon: '❄',
    color: '#69C0FF', coreColor: '#CCE0FF',
    damage: 20, speed: 38, radius: 0.2,
    manaCost: 15, cooldown: 0.25,
    description: 'Fast piercing bolt of frost',
  },
  {
    id: 'wave', name: 'Void Wave', icon: '〰',
    color: '#7783FF', coreColor: '#FFE1DF',
    damage: 25, speed: 16, radius: 4.0,
    manaCost: 35, cooldown: 1.4,
    description: 'Expanding ring of void energy',
  },
  {
    id: 'nova', name: 'Fire Nova', icon: '💥',
    color: '#F15B00', coreColor: '#FDEAB2',
    damage: 70, speed: 0, radius: 7.0,
    manaCost: 55, cooldown: 2.2,
    description: 'Explosive burst of fire',
  },
];

export function getSpell(id: SpellType): SpellDef | undefined {
  return SPELLS.find(s => s.id === id);
}
