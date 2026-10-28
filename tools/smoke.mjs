// Drive the real page in Chromium at phone size (390x844). Adapted from the
// game-building kit's smoke.mjs. It plays through the UI by clicking whatever
// the current screen offers, and fails if the date stops moving, a screen is
// empty, the page scrolls sideways, raw tokens reach the screen, the console
// shows an error, or a reload loses the game. Run: node tools/smoke.mjs
// Screenshots go to SHOTS (default /tmp/made-post-shots). Look at them.

const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(PW);
const chromium = pw.chromium || pw.default?.chromium;
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.env.ROOT || process.cwd();
const STEPS = Number(process.env.STEPS || 160);
const SHOTS = process.env.SHOTS || '/tmp/made-post-shots';
await mkdir(SHOTS, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try {
    const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const path = join(ROOT, rel === '/' ? 'index.html' : rel);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(await readFile(path));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, r));
const URL0 = `http://localhost:${server.address().port}/index.html`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
// Fonts come from Google; block them so the check does not depend on the network.
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const errors = [];
let failures = 0;
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.googleapis|net::ERR_FAILED/.test(m.text())) errors.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
const check = (label, ok, detail = '') => { console.log(`${ok ? 'ok  ' : '!!  '}${label}${detail ? '  ' + detail : ''}`); if (!ok) failures++; };
const flush = (step) => { const e = [...new Set(errors.splice(0))]; check(`no errors: ${step}`, !e.length, e.slice(0, 5).join(' | ')); };
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const rawTokens = async () => {
  const text = await page.locator('#app').innerText();
  return text.match(/\{[a-z_.]+\}|\bundefined\b|\bNaN\b|\[object Object\]/g);
};

await page.goto(URL0, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${SHOTS}/0-title.png`, fullPage: true });
flush('load');
check('no horizontal scroll on title', (await overflow()) <= 1);
await page.click('[data-act="background"][data-id="lowerdeck"]');
await page.click('[data-act="new"]');
flush('start');

const dates = new Set();
const phasesSeen = new Set();
let shot = 0;
for (let i = 0; i < STEPS; i++) {
  const date = (await page.locator('.turn').textContent())?.trim();
  dates.add(date);
  let sel = null, phase = null;
  for (const [s, p] of [['[data-act="end-turn"]', 'sea'], ['[data-act="battle"]', 'battle'], ['[data-act="option"]', 'decision'],
    ['[data-act="close"]', 'report'], ['[data-act="interlude"]', 'interlude'], ['[data-act="port"][data-id="volunteers"]:not([disabled])', 'port'],
    ['[data-act="port"][data-id="press"]:not([disabled])', 'port'], ['[data-act="port"][data-id="sail"]:not([disabled])', 'port'], ['[data-act="restart"]', 'ended']]) {
    if (await page.locator(s).count()) { sel = s; phase = p; break; }
  }
  if (!sel) { check(`a move exists at step ${i}`, false, `date ${date}`); break; }
  if (!phasesSeen.has(phase)) {
    phasesSeen.add(phase);
    await page.screenshot({ path: `${SHOTS}/${++shot}-${phase}.png`, fullPage: true });
    check(`${phase} screen: no horizontal scroll`, (await overflow()) <= 1);
    const raw = await rawTokens();
    check(`${phase} screen: no raw tokens`, !raw, raw ? raw.slice(0, 3).join(' ') : '');
  }
  if (phase === 'ended') break;
  await page.locator(sel).first().click();
}
check(`the date moved through the UI (${dates.size} distinct dates)`, dates.size >= 10);
check('reached sea, a decision and a report', ['sea', 'decision', 'report'].every((p) => phasesSeen.has(p)), [...phasesSeen].join(','));
flush('play');

for (const t of ['crew', 'officers', 'career', 'log', 'ship']) {
  await page.click(`[data-tab="${t}"]`);
  const text = (await page.locator('#main').innerText()).trim();
  check(`tab ${t} renders`, text.length > 80, `${text.length} chars`);
  check(`tab ${t} no horizontal scroll`, (await overflow()) <= 1);
  const raw = await rawTokens();
  check(`tab ${t} no raw tokens`, !raw, raw ? raw.slice(0, 3).join(' ') : '');
  await page.screenshot({ path: `${SHOTS}/tab-${t}.png`, fullPage: true });
}
flush('tabs');

const before = (await page.locator('.turn').textContent())?.trim();
await page.reload({ waitUntil: 'networkidle' });
await page.click('[data-act="continue"]');
check('save survives reload', (await page.locator('.turn').textContent())?.trim() === before, before);
flush('reload');

await browser.close();
server.close();
console.log(`\n${failures ? `${failures} FAILURE(S)` : 'smoke clean'}. Screenshots in ${SHOTS}.`);
process.exit(failures ? 1 : 0);
