# GRIM ARMADA — Web Combat Demo

> SWG-inspired tactical combat game built with Three.js, React, and the Grudge Backend.
> A **Grudge Studio** production.

![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-r172-000000?logo=three.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)

---

## Live Demo

**Production:** [grim-armada-web.vercel.app](https://grim-armada-web.vercel.app)

---

## Game Systems

All systems were ported from the original Unity C# `SWGSystems` codebase to TypeScript for browser-native execution.

### HAM System (Health, Action, Mind)

The core stat system from Star Wars Galaxies. Each character has three resource pools:

- **Health** — Physical vitality. Gold bar. Depleted = incapacitation.
- **Action** — Stamina for abilities. Blue bar. Most combat skills cost Action.
- **Mind** — Mental focus. Purple bar. Precision abilities cost Mind.

Each pool supports:
- Base + bonus max values
- Wounds (permanently reduce max until healed)
- Encumbrance (from armor weight)
- Regeneration (ticks per second, faster out of combat)
- Incapacitation chain: 3 incaps → death

**Source:** `src/game/core/HAMSystem.ts`

### Combat System

Full ability-based combat with auto-attacks:

- **Hit calculation:** `baseAccuracy(65) + skillMods - targetDefense`, clamped 10-95%
- **Miss types:** Dodge (40%), Block (30%), Parry (30%)
- **Critical hits:** `5% + CriticalChance skillMod`, deals 1.5x damage
- **Glancing blows:** Based on target defense, deals 0.5x damage
- **Armor mitigation:** Flat % reduction from `armorRating`
- **Pool targeting:** Damage distributed between HAM pools based on ability config
- **Auto-attack:** Every 1.5s while in combat with a target
- **Combat timeout:** 10s of no action → return to Peace state

**Abilities:**

| Key | Ability | Cost | Cooldown | Damage | Description |
|-----|---------|------|----------|--------|-------------|
| 1 | Burst Shot | 40 AP | 6s | 80-160 | Quick ranged burst |
| 2 | Head Shot | 60 MP | 12s | 150-250 | Precision mind damage |
| 3 | Power Attack | 80 AP | 10s | 200-350 | Heavy melee strike |
| 4 | Heal | 40 MP | 5s | 200-300 heal | Restore health |

**Hotbar layout:** Slots 1-4 = skills, slot 5 = empty, slots 6-8 = consumables (food, potions, relics — placeholder).

**Source:** `src/game/combat/CombatSystem.ts`

### Enums & Types

Full SWG-style type definitions:

- **35 Professions** — Marksman, Brawler, Medic, Artisan, Jedi, etc.
- **10 Species** — Human, Twilek, Rodian, Wookiee, Zabrak, etc.
- **7 Factions** — Neutral, Imperial, Rebel, Jabba, Hutt, Tusken, Jawa
- **11 Weapon Types** — Pistol, Carbine, Rifle, Lightsaber, Polearm, etc.
- **10 Damage Types** — Kinetic, Energy, Blast, Acid, Electricity, etc.
- **30+ Skill Mod Types** — Accuracy, Speed, Defense, Crafting, Healing, etc.
- **15 Status Effects** — Stunned, Blinded, Snared, Rooted, Bleeding, OnFire, etc.

**Source:** `src/game/core/types.ts`

---

## 3D Engine

### GLB Model Pipeline
All 19 FBX models converted to optimized GLB format:
- **FBX → GLB conversion** via `fbx2gltf` (Facebook's converter)
- **Mesh optimization** via `@gltf-transform` pipeline: dedup, prune, weld, quantize, meshopt reorder
- **Original materials preserved** — no more flat-color overrides
- **42% file size reduction** (10.4MB → 6.0MB) through vertex quantization and deduplication
- Asset pipeline: `npm run assets:pipeline`

**Models:** `public/models/` (enemies, player, structures, terrain, weapons)

### Fortnite-Style Third-Person Camera
- **Pointer lock** — click canvas to capture mouse
- **Mouse orbit** — yaw + pitch control, over-the-shoulder offset
- **Smooth follow** — framerate-independent lerp on player position
- **Pitch clamped** — -20° to +70°
- **Escape** to release cursor

### Procedural Audio System (Howler.js + Web Audio API)
Full audio engine with no external sound files:
- **3-layer gunshot** — low-freq boom + noise crack + pink noise tail
- **Spatial panning** — enemy gunfire panned by position relative to player
- **Footsteps** — timed to movement speed, faster when sprinting
- **Impact sounds** — different for normal hits vs crits
- **Death sound** — frequency sweep on enemy kill
- **Ambient drone** — low oscillator + wind noise loop
- **Volume categories** — master/sfx/music/ambient/ui, independently adjustable

**Source:** `src/game/audio/AudioManager.ts`

### Spring Weapon System
Physics-based weapon feel using custom spring interpolation:
- **Camera sway** — weapon lags behind mouse with spring delay
- **Movement bob** — spring-driven oscillation scaled to speed
- **Idle breathing** — subtle weapon drift at rest
- **Recoil kick** — impulse on fire with spring return (position + rotation)
- **Crosshair bloom** — dynamic spread on fire, tightens over time

**Source:** `src/game/scene/WeaponSystem.tsx`

### Enhanced Post-Processing
- **SSAO** — screen-space ambient occlusion for depth grounding
- **Bloom** — tuned for muzzle flashes and lights
- **Chromatic aberration** — subtle lens effect, increases on damage
- **ACES filmic tone mapping** — cinematic color grading
- **Vignette** — darkened edges for focus
- **Environment map** — night preset for realistic reflections

**Source:** `src/game/scene/PostFX.tsx`

### Scene Contents
- **19 GLB models** — player, 3 weapons, 3 enemies, 8 terrain props, 4 structures, searchlights
- **3 Enemy NPCs** — Tusken Raider (L5), Stormtrooper (L8), Dark Acolyte (L12)
- **Procedural terrain** — ground plane, dirt patches, 14 trees, 9 bushes, rocks, cliffs, barrels, sandbags
- **Dynamic lighting** — directional sun, colored rim lights, point lights
- **Stars + fog** — atmosphere with distance fog

**Source:** `src/game/scene/DemoScene.tsx`

---

## Controls

| Key | Action |
|-----|--------|
| W | Move forward (away from camera) |
| S | Move backward |
| A / D | Turn character left / right |
| Q / E | Strafe left / right |
| Shift | Sprint |
| Mouse | Look / aim (pointer lock) |
| Click | Lock cursor to game |
| Escape | Release cursor |
| Tab | Cycle through enemy targets |
| 1-4 | Use abilities |
| Click enemy | Target that enemy |
| Click ground | Deselect target |
| R | Reset game (respawn all enemies) |

---

## UI Components

### Player Frame (top-left)
- Level badge, character name, species + profession
- HAM bars with current/max values and smooth animations

### Target Frame (top-center)
- Enemy level, name, dead indicator
- HP/AP/MP bars with color transitions

### Ability Hotbar (bottom-center)
- 8 slots: 4 skills + 1 empty + 3 consumable placeholders
- Cooldown overlays with remaining time
- Key number indicators
- Click or keyboard activation

### Combat Log (bottom-left)
- Color-coded entries: red (damage), green (heal), gray (miss), gold (system), orange (death)
- Auto-scrolls to latest entry
- Keeps last 50 entries

### Controls Help (top-right)
- Quick reference overlay

**Source:** `src/components/game/GameHUD.tsx`

---

## Grudge Backend Integration

Connects to the Grudge Studio backend at `grudgewarlords.com` using the same API pattern as the warlord-crafting-suite.

### API Endpoints

```
POST /api/grudge/login      — Authenticate with Grudge ID
POST /api/grudge/register   — Create new Grudge ID
GET  /api/grudge/verify     — Verify auth token
GET  /api/characters        — List characters
GET  /api/characters/:id    — Get character details
GET  /api/gruda/player/:id  — Get GRUDA player data
POST /api/gruda/sync        — Save game state
GET  /api/health            — Backend health check
```

### Auth Flow
1. Login/register creates a JWT stored in `localStorage` as `grudge_auth_token`
2. User data stored as `grudge_current_user`
3. All API calls include `Authorization: Bearer <token>` and `X-User-Id` headers
4. Vercel rewrites proxy `/api/*` requests to the Grudge backend

**Source:** `src/lib/apiConfig.ts`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Renderer | Three.js r172 (WebGL2) via @react-three/fiber 9 |
| Models | GLB/GLTF with @gltf-transform optimization pipeline |
| Physics | Rapier (WASM) via @react-three/rapier |
| PostFX | SSAO, Bloom, ACES Tonemapping, Chromatic Aberration |
| Audio | Howler.js + Web Audio API (procedural synthesis) |
| UI | React 19 + Tailwind CSS v4 + Framer Motion |
| State | Zustand 5 |
| Validation | Zod |
| Build | Vite 6 + Gzip/Brotli compression |
| Language | TypeScript 5.6 |
| Hosting | Vercel |
| Backend | Grudge Backend (grudgewarlords.com) |
| Auth | Grudge ID (id.grudge-studio.com) |
| Branding | Grudge Studio STYLE_GUIDE.md tokens |

---

## Project Structure

```
grim-armada-web/
├── scripts/
│   ├── convert-models.mjs       # FBX → GLB batch conversion
│   └── optimize-models.mjs      # GLB optimization (dedup, quantize, meshopt)
├── public/models/               # 19 optimized GLB models
│   ├── enemies/                 # alien, mutant, spikeball
│   ├── player/                  # player character
│   ├── structures/              # cabin, watchtower, security post, searchlight
│   ├── terrain/                 # rocks, cliffs, trees, bushes, barrels, sandbags
│   └── weapons/                 # assault_rifle, ak74u, smg
├── src/
│   ├── game/
│   │   ├── audio/
│   │   │   └── AudioManager.ts  # Procedural audio system (Howler + Web Audio)
│   │   ├── core/
│   │   │   ├── types.ts          # All enums, interfaces, type defs
│   │   │   └── HAMSystem.ts      # Health/Action/Mind pool system
│   │   ├── combat/
│   │   │   └── CombatSystem.ts   # Abilities, auto-attack, damage calc
│   │   ├── scene/
│   │   │   ├── DemoScene.tsx     # Main 3D scene, camera, terrain, NPCs
│   │   │   ├── ModelLoader.tsx   # GLTF loader with caching + original materials
│   │   │   ├── PostFX.tsx        # SSAO, bloom, tone mapping, chromatic aberration
│   │   │   ├── WeaponSystem.tsx  # Spring weapon sway, recoil, crosshair bloom
│   │   │   ├── BulletSystem.tsx  # Instanced bullet trails, muzzle flash, particles
│   │   │   ├── ProceduralAnim.ts # Procedural animation (bob, hit, death)
│   │   │   └── VFX.tsx           # Screen shake, damage numbers, crosshair, overlays
│   │   └── store.ts              # Zustand game state (player, enemies, camera, combat)
│   ├── components/
│   │   └── game/
│   │       └── GameHUD.tsx       # HAM bars, hotbar, target frame, combat log, input
│   ├── lib/
│   │   └── apiConfig.ts          # Grudge backend API client
│   ├── App.tsx                   # Framer-motion animated menu + game entry
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind + Grudge theme tokens
├── vercel.json                   # Deployment config with API rewrites
├── vite.config.ts                # Vite + code-splitting + compression
└── package.json
```

---

## Development

```bash
# Install dependencies
npm install

# Run dev server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Asset pipeline (convert FBX → GLB, then optimize)
npm run assets:pipeline

# Individual asset steps
npm run models:convert    # FBX → GLB via fbx2gltf
npm run models:optimize   # Optimize GLBs (dedup, quantize, meshopt)
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_BACKEND_URL` | `https://grudgewarlords.com` | Grudge backend API URL |

---

## Deployment

Deployed to Vercel with automatic builds from the `Three` branch.

```bash
# Deploy preview
npx vercel

# Deploy production
npx vercel --prod
```

The `vercel.json` config:
- Rewrites `/api/*` to `grudgewarlords.com/api/*`
- SPA fallback for all other routes

---

## Roadmap

- [x] GLB model pipeline (FBX → GLB conversion + optimization)
- [x] Fortnite-style third-person camera (pointer lock, mouse orbit)
- [x] Procedural audio system (gunshots, footsteps, ambient)
- [x] Spring weapon system (sway, recoil, crosshair bloom)
- [x] Enhanced post-processing (SSAO, ACES, chromatic aberration)
- [x] Framer-motion animated UI (menus, transitions)
- [x] Code-split build with Gzip/Brotli compression
- [ ] Rapier physics (character controller, collisions, raycasting)
- [ ] Character creation screen (species + profession selection)
- [ ] Buff/debuff system UI (icons with timers above health)
- [ ] Profession skill trees
- [ ] Equipment/inventory integration
- [ ] Multiplayer via Colyseus (ws.grudge-studio.com)
- [ ] MOBA mode integration
- [ ] Gouldstone companion system (AI clones)
- [ ] Settings panel (graphics, audio, controls)

---

## Credits

- **Game Design:** Grudge Studio
- **SWG Systems:** Ported from Unity SWGSystems C# codebase
- **Branding:** Grudge Studio STYLE_GUIDE.md (gold/obsidian theme, Cinzel fonts)
- **Backend:** Grudge Backend (grudgewarlords.com)

---

*GRIM ARMADA © Grudge Studio. All rights reserved.*
