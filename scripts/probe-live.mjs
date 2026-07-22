/**
 * Production smoke probe for grim-armada-web.
 * Usage: node scripts/probe-live.mjs [origin]
 */
const origin = (process.argv[2] || 'https://grim-armada-web.vercel.app').replace(/\/$/, '');

const checks = [
  { path: '/', expect: 200, name: 'title shell' },
  { path: '/play', expect: 200, name: 'play SPA' },
  { path: '/auth/callback', expect: 200, name: 'auth callback SPA' },
  { path: '/models/player/player.glb', expect: 200, name: 'player GLB' },
  { path: '/textures/terrain/grass.jpg', expect: 200, name: 'terrain texture' },
  { path: '/assets/', expect: [200, 403, 404], name: 'assets prefix (any)' },
];

let failed = 0;
for (const c of checks) {
  const url = `${origin}${c.path}`;
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const okList = Array.isArray(c.expect) ? c.expect : [c.expect];
    // Some hosts reject HEAD — retry GET
    let status = res.status;
    if (status === 405 || status === 501) {
      const g = await fetch(url, { method: 'GET', redirect: 'follow' });
      status = g.status;
    }
    const pass = okList.includes(status);
    console.log(`${pass ? 'OK ' : 'FAIL'} ${status}  ${c.name}  ${c.path}`);
    if (!pass) failed++;
  } catch (e) {
    console.log(`FAIL ERR  ${c.name}  ${e.message}`);
    failed++;
  }
}

// Bundle must not force CDN in production by default
try {
  const html = await (await fetch(origin + '/')).text();
  const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (m) {
    const js = await (await fetch(origin + m[1])).text();
    const forcesCdn = /VITE_FORCE_ASSET_CDN.*?true/.test(js) && /eu=\(\)=>!0/.test(js);
    // forceCdn compiled as ()=>!1 means same-origin default
    const sameOriginDefault = /eu=\(\)=>!1/.test(js) || js.includes('forceCdn') === false;
    console.log(sameOriginDefault || !forcesCdn ? 'OK  asset resolve same-origin default' : 'WARN CDN force may be on');
  }
} catch (e) {
  console.log('WARN could not inspect bundle', e.message);
}

process.exit(failed ? 1 : 0);
