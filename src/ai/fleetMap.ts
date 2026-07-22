/**
 * Production SSOT for Grim Armada + fleet surfaces the in-game coder uses.
 * Keep in sync with grudge-fleet / grudge-live-servers skills.
 */

export const GRIM_ARMADA_FLEET = {
  game: {
    slug: 'grim-armada-web',
    name: 'Grim Armada',
    origins: [
      'https://grim-armada-web.vercel.app',
      'https://armada.grudge-studio.com',
    ],
    repo: 'https://github.com/MolochDaGod/grim-armada-web',
    host: 'Vercel (Vite SPA)',
    branch: 'main',
    routes: {
      title: '/',
      play: '/play',
      authCallback: '/auth/callback',
    },
  },
  auth: {
    id: 'https://id.grudge-studio.com',
    sameOrigin: '/api/auth/*',
    storageKeys: ['grudge_auth_token', 'grudge_auth', 'grudge_current_user'],
  },
  gameData: {
    railway: 'https://grudge-api-production-0d46.up.railway.app',
    sameOrigin: '/api/*',
    db: 'Railway Postgres (characters, account, progress)',
    endpoints: ['/api/characters', '/api/account/*', '/api/health'],
  },
  assets: {
    policy: 'same-origin first (public/ on Vercel)',
    local: ['/models/**', '/textures/**'],
    cdn: 'https://assets.grudge-studio.com/grim-armada (optional, VITE_FORCE_ASSET_CDN)',
    objectStore: 'https://objectstore.grudge-studio.com/api/v1',
  },
  ai: {
    hub: 'https://ai.grudge-studio.com',
    health: 'https://ai.grudge-studio.com/health',
    spaceAgent: '/v1/agents/space/chat',
    devAgent: '/v1/agents/dev/chat',
    note: 'Chat needs D1 API key or hub-valid JWT; local coder tools always work',
  },
  open: {
    library: 'https://open.grudge-studio.com',
    era: 'Armada',
  },
} as const;

export function fleetMapMarkdown(): string {
  const f = GRIM_ARMADA_FLEET;
  return [
    '## Grim Armada production map',
    `- **App:** ${f.game.origins.join(' · ')}`,
    `- **Repo:** ${f.game.repo} (branch ${f.game.branch})`,
    `- **Host:** ${f.game.host}`,
    `- **Auth:** ${f.auth.id} via same-origin ${f.auth.sameOrigin}`,
    `- **DB / game API:** ${f.gameData.railway} (Postgres) via ${f.gameData.sameOrigin}`,
    `- **Assets:** ${f.assets.policy}; CDN optional ${f.assets.cdn}`,
    `- **AI hub:** ${f.ai.hub} (${f.ai.note})`,
    `- **Routes:** ${f.game.routes.title} title · ${f.game.routes.play} play · ${f.game.routes.authCallback} SSO`,
  ].join('\n');
}
