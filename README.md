# GRIM ARMADA

Space survival shooter. 9 weapons, goal-driven AI, magic spells, grenades, day/night, 4 biomes, loot economy.
Three.js R3F + Rapier + Zustand. **Grudge Studio** — *Racalvin The Pirate King*.

**Live:** grim-armada-web.vercel.app | **Backend:** grudgewarlords.com | **Assets:** assets.grudge-studio.com

---

## Engine

- **Weapons** — 9 modes x 4 skills = 36 total. Damage, combos, projectile physics, trail VFX, recoil, spread.
- **Camera** — TPS/Action/FPS + ADS zoom (RMB, FOV 70-50, DOF blur). Smooth height, R reset, scroll zoom, V shoulder swap.
- **AI** — Goal-driven brain (Dive/three-fps): Attack, Hunt, Explore, Dodge, GetHealth evaluators. 20s memory, 120deg vision, aim noise, 0.8s reaction time.
- **Pathfinding** — A* NavGrid 150x150, 8-directional, LOS string-pull smoothing.
- **VFX** — Explosions, muzzle flash, magic projectiles (orb/javelin/wave/nova), skill effects, arrow trails, bullet decals, grenades.
- **PostFX** — SSAO, Bloom (dynamic), DOF (ADS), Chromatic Aberration, ACES, Vignette.
- **World** — Day/night (5min cycle), 4 scene portals, loot chests, content registry with loot tables.
- **Units** — 3 hero characters (Notable Ice, Superhero SNS, TGE Hero).

## Object Storage

Production assets from Cloudflare R2 at `assets.grudge-studio.com/grim-armada/`. Local fallback in dev.

```
models/enemies/     mutant, alien, spikeball (GLB)
models/weapons/     assault_rifle, ak74u, smg
models/colony/      12 space colony buildings
models/ships/       3 destroyers + 2 cruisers
models/structures/  cabin, watchtower, mining-station (voxel)
models/terrain/     rocks, cliffs, trees, barrels
models/units/       3 hero GLBs (CDN-only, 44-51MB each)
textures/terrain/   grass, sand, stone, snow (tileable)
```

Resolver: `src/lib/assetResolver.ts` — `resolveModel(path)` returns CDN in prod, local in dev.

## Controls

| Key | Action | Key | Action |
|-----|--------|-----|--------|
| WASD | Move | LMB | Fire/melee |
| Q | Cycle weapon | RMB | ADS/block |
| E | Interact | G | Grenade |
| Shift | Sprint | R | Reload/cam reset |
| Space | Jump | V | Shoulder swap |
| C | Crouch | Tab | Combat/harvest |
| 1-4 | Skills | Scroll | Zoom |
| F | Mount | I/P/K | Inventory/char/skills |

## Stack

Three.js r172 + R3F 9, Rapier WASM, React 19, Tailwind v4, Zustand 5, Vite 6, Vercel, Grudge Backend.

## Structure

```
src/game/ai/          BotBrain, EnemyFSM, NavGrid, WaveSpawner
src/game/weapons/     WeaponConfig, SkillSystem, Arrow, Grenade, MagicProjectile
src/game/vfx/         Explosion, MuzzleFlash
src/game/scene/       DemoScene, BulletSystem, BulletDecals, PostFX
src/game/scenes/      useSceneStore, ScenePortal
src/game/player/      InputManager, CameraController, CharacterController
src/game/content/     enemies, harvestables, npcs, spells
src/game/units/       UnitRegistry, UnitCharacter
src/game/world/       LootChest
src/game/survival/    DayNightCycle
src/lib/              assetResolver, grudge-sdk, grudge-services
```

## Dev

```bash
npm install && npm run dev    # :5173
npm run build                 # Gzip + Brotli
```

Vercel auto-deploys from main. API rewrites to grudgewarlords.com + id.grudge-studio.com. CORS headers for CDN assets.

---

*GRIM ARMADA (c) Grudge Studio. Racalvin The Pirate King.*
