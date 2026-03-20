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

## Demo Scene

The Three.js demo scene includes:

- **Third-person camera** — Over-shoulder view, follows player rotation
- **Terrain** — 80x80 ground plane with grid overlay, rocks, and trees
- **Player character** — Gold capsule body + head + weapon indicator + nameplate
- **3 Enemy NPCs:**
  - Tusken Raider (Level 5, HP 600/400/300)
  - Stormtrooper (Level 8, HP 800/500/350)
  - Dark Acolyte (Level 12, HP 1200/800/600)
- **Selection rings** — Red ring under targeted enemy
- **3D health bars** — Color-coded (green → yellow → red)
- **Death state** — Fallen body with transparency
- **Stars + fog** — Atmosphere with distance fog

**Source:** `src/game/scene/DemoScene.tsx`

---

## Controls

| Key | Action |
|-----|--------|
| W | Move forward (away from camera) |
| S | Move backward |
| A / D | Turn left / right (camera follows) |
| Q / E | Strafe left / right |
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
| Renderer | Three.js r172 via @react-three/fiber |
| UI | React 19 + Tailwind CSS v4 |
| State | Zustand 5 |
| Build | Vite 6 |
| Language | TypeScript 5.6 |
| Hosting | Vercel |
| Backend | Grudge Backend (grudgewarlords.com) |
| Branding | Grudge Studio STYLE_GUIDE.md tokens |

---

## Project Structure

```
grim-armada-web/
├── src/
│   ├── game/
│   │   ├── core/
│   │   │   ├── types.ts          # All enums, interfaces, type defs
│   │   │   └── HAMSystem.ts      # Health/Action/Mind pool system
│   │   ├── combat/
│   │   │   └── CombatSystem.ts   # Abilities, auto-attack, damage calc
│   │   ├── scene/
│   │   │   └── DemoScene.tsx     # Three.js 3D scene with camera, terrain, NPCs
│   │   └── store.ts              # Zustand game state (player, enemies, combat log)
│   ├── components/
│   │   └── game/
│   │       └── GameHUD.tsx       # HAM bars, hotbar, target frame, combat log
│   ├── lib/
│   │   └── apiConfig.ts          # Grudge backend API client
│   ├── App.tsx                   # Title screen + game entry
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind + Grudge theme tokens
├── vercel.json                   # Deployment config with API rewrites
├── vite.config.ts                # Vite + Tailwind + proxy config
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

- [ ] Character creation screen (species + profession selection)
- [ ] Buff/debuff system UI (icons with timers above health)
- [ ] Profession skill trees
- [ ] Equipment/inventory integration
- [ ] Multiplayer via Colyseus
- [ ] Voxel character models (replacing capsule placeholders)
- [ ] MOBA mode integration
- [ ] Gouldstone companion system (AI clones)

---

## Credits

- **Game Design:** Grudge Studio
- **SWG Systems:** Ported from Unity SWGSystems C# codebase
- **Branding:** Grudge Studio STYLE_GUIDE.md (gold/obsidian theme, Cinzel fonts)
- **Backend:** Grudge Backend (grudgewarlords.com)

---

*GRIM ARMADA © Grudge Studio. All rights reserved.*
