/**
 * Collision groups for Rapier physics.
 * Each group is a bit in a 32-bit mask. Rapier uses (membership, filter) pairs.
 * Ported from Motion CollisionLayers.ts.
 */

// Membership bits
export const CG_PLAYER      = 1 << 0;  // 0x0001
export const CG_ENEMY       = 1 << 1;  // 0x0002
export const CG_BULLET      = 1 << 2;  // 0x0004
export const CG_TERRAIN     = 1 << 3;  // 0x0008
export const CG_VEHICLE     = 1 << 4;  // 0x0010
export const CG_CRATE       = 1 << 5;  // 0x0020
export const CG_ENEMY_SENSOR= 1 << 6;  // 0x0040 — zombie proximity sensor

// Collision filter helpers — combines membership (low 16) and filter (high 16)
export function collisionGroups(membership: number, filter: number): number {
  return ((membership & 0xFFFF) << 16) | (filter & 0xFFFF);
}

// Presets
export const CG_PLAYER_GROUPS   = collisionGroups(CG_PLAYER, CG_TERRAIN | CG_ENEMY | CG_CRATE | CG_VEHICLE);
export const CG_ENEMY_GROUPS    = collisionGroups(CG_ENEMY, CG_TERRAIN | CG_PLAYER | CG_BULLET);
export const CG_BULLET_GROUPS   = collisionGroups(CG_BULLET, CG_ENEMY | CG_TERRAIN);
export const CG_TERRAIN_GROUPS  = collisionGroups(CG_TERRAIN, CG_PLAYER | CG_ENEMY | CG_BULLET | CG_VEHICLE);
export const CG_VEHICLE_GROUPS  = collisionGroups(CG_VEHICLE, CG_TERRAIN | CG_PLAYER);
export const CG_ZOMBIE_SENSOR   = collisionGroups(CG_ENEMY_SENSOR, CG_BULLET | CG_PLAYER);
