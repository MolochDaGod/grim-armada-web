# GRIM ARMADA

Space survival shooter. Weapons, goal-driven AI, magic, grenades, day/night, 4 biome portals, loot.
Three.js R3F + Rapier + Zustand. **Grudge Studio**.

| | |
|--|--|
| **Live** | https://grim-armada-web.vercel.app · https://armada.grudge-studio.com |
| **Auth** | https://id.grudge-studio.com (same-origin `/api/auth/*`) |
| **Game API** | Railway `grudge-api-production-0d46` via `/api/*` rewrites |
| **Assets** | Same-origin `/models` + `/textures` (Vercel `public/`). Optional R2 CDN with `VITE_FORCE_ASSET_CDN=true` |

---

## SPA routes

| Path | Page |
|------|------|
| `/` | Title — ENTER COMBAT |
| `/play` | Combat demo (Canvas + HUD) |
| `/auth/callback` | Grudge ID SSO return |

Biome **portals** (in-world, E key): Colony · Wasteland · Dungeon · Forge — teleport + fog tint via `useSceneStore`.

---

## Asset policy (fleet best practice)

1. **Default:** resolve models to same-origin paths shipped in `public/` (known-good on Vercel).
2. **CDN:** only when `VITE_FORCE_ASSET_CDN=true` **and** R2 is seeded under `grim-armada/`.
3. `ModelLoader` retries CDN or local on failure.
4. Empty/stub GLBs (e.g. `light_cruiser_02`) are remapped in `assetResolver`.

```bash
npm run assets:validate   # pre-build gate
npm run assets:pipeline   # optimize + manifest (local)
npm run build             # validate + vite build
```

---

## Controls

| Key | Action | Key | Action |
|-----|--------|-----|--------|
| WASD | Move | LMB | Fire/melee |
| Q | Cycle weapon | RMB | ADS/block |
| E | Interact / portal | G | Grenade |
| Shift | Sprint | R | Reload |
| 1-4 | Skills | Tab | Combat/harvest |
| I/P | Inventory / character | Esc | Release cursor |

---

## Stack

Three.js r172 + R3F 9, Rapier, React 19, Tailwind v4, Zustand 5, Vite 6, **wouter** routes, Vercel, Railway game-data.

```
src/App.tsx              SPA routes (wouter)
src/pages/               AuthCallbackPage
src/game/scenes/         useSceneStore, ScenePortal
src/game/scene/          DemoScene, ModelLoader, PostFX
src/game/core/           GameEngine, GameSystems, safeFrame
src/lib/                 assetResolver, grudge-sdk, grudge-services
```

## Dev

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run preview
```

Vercel auto-deploys **main**. Proxy in `vite.config.ts` mirrors production rewrites (auth → ID, API → Railway).

---

*GRIM ARMADA © Grudge Studio*
