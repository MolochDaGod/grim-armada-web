/**
 * DayNightCycle — gradual lighting rotation over a 5-minute real-time cycle.
 * dayTime: 0..1 where 0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset.
 * Affects directional light angle, ambient intensity, fog color, and enemy aggro range.
 */

import { useGameStore } from '../store';

const CYCLE_DURATION = 300; // 5 minutes in seconds

/**
 * Tick the day/night cycle. Call every frame.
 * Returns current dayTime (0..1).
 */
export function tickDayNight(dt: number): number {
  const store = useGameStore.getState();
  let t = store.dayTime + dt / CYCLE_DURATION;
  if (t > 1) t -= 1;
  // Update store (batched with other updates, not calling set directly for perf)
  return t;
}

/**
 * Get sun position from dayTime.
 * Returns [x, y, z] for directional light.
 */
export function getSunPosition(dayTime: number): [number, number, number] {
  const angle = dayTime * Math.PI * 2 - Math.PI / 2; // 0.5 = directly overhead
  const x = Math.cos(angle) * 60;
  const y = Math.sin(angle) * 60 + 20; // always some height
  const z = -30;
  return [x, Math.max(5, y), z]; // keep sun above horizon minimum
}

/**
 * Get ambient light intensity from dayTime.
 * Brighter at noon, dimmer at midnight.
 */
export function getAmbientIntensity(dayTime: number): number {
  const noon = Math.cos((dayTime - 0.5) * Math.PI * 2);
  return 0.15 + noon * 0.35; // range: 0.15 (night) to 0.50 (noon)
}

/**
 * Get sun intensity from dayTime.
 */
export function getSunIntensity(dayTime: number): number {
  const noon = Math.cos((dayTime - 0.5) * Math.PI * 2);
  return 0.5 + Math.max(0, noon) * 1.5; // range: 0.5 (night) to 2.0 (noon)
}

/**
 * Get fog color from dayTime — warm during day, cold blue at night.
 */
export function getFogColor(dayTime: number): string {
  const noon = Math.cos((dayTime - 0.5) * Math.PI * 2);
  const t = (noon + 1) / 2; // 0=midnight, 1=noon
  // Lerp between night (#0a1020) and day (#c9dff0)
  const r = Math.round(10 + t * (201 - 10));
  const g = Math.round(16 + t * (223 - 16));
  const b = Math.round(32 + t * (240 - 32));
  return `rgb(${r},${g},${b})`;
}

/**
 * Enemy aggro range multiplier — 1.0 during day, 1.5 at night.
 */
export function getAggroMultiplier(dayTime: number): number {
  const isNight = dayTime < 0.2 || dayTime > 0.8;
  return isNight ? 1.5 : 1.0;
}
