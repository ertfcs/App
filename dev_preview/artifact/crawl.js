// Visit every screen of the running app and record every GET /api/* response.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2];
const BASE = 'http://localhost:8001';
const guest = ['/', '/places', '/map', '/info', '/booking', '/beaches', '/festivals', '/food'];
const admin = fs.readdirSync('/home/user/App/frontend/app/admin')
  .filter((f) => f.endsWith('.tsx') && !f.startsWith('_') && f !== 'login.tsx')
  .map((f) => '/admin/' + f.replace(/\.tsx$/, '').replace(/^index$/, ''))
  .concat(['/admin/food']);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  const p = await ctx.newPage();
  const rec = {};
  p.on('response', async (r) => {
    const u = new URL(r.url());
    if (!u.pathname.startsWith('/api/') || r.request().method() !== 'GET') return;
    try {
      const ct = r.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      rec[u.pathname + u.search] = { status: r.status(), body: await r.json() };
    } catch (e) {}
  });
  const visit = async (path) => {
    try { await p.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 }); } catch (e) {}
    await p.waitForTimeout(800);
  };
  for (const g of guest) await visit(g);
  // place + food details
  const pois = rec['/api/pois'] ? rec['/api/pois'].body : [];
  for (const poi of pois.slice(0, 3)) await visit('/place/' + poi.id);
  await visit('/admin/login');
  const inputs = await p.$$('input');
  await inputs[0].fill('Matteo');
  await inputs[1].fill('D5230');
  await p.getByText('Login', { exact: true }).last().click();
  await p.waitForTimeout(2500);
  for (const a of admin) await visit(a);
  fs.writeFileSync(OUT, JSON.stringify(rec));
  console.log(Object.keys(rec).length, 'endpoints');
  console.log(Object.keys(rec).join('\n'));
  await b.close();
})();
