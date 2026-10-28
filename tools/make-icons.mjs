// Draws the app icon as SVG and renders the PNG sizes with the preinstalled
// Chromium. The SVG is the source; commit both. Run: node tools/make-icons.mjs
import { writeFile, mkdir } from 'node:fs/promises';
const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';

// A frigate in profile under topsails, on a navy field.
export const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#1f3a5f"/>
  <path d="M8 44 L56 44 L51 52 L13 52 Z" fill="#f3ecdc"/>
  <rect x="12" y="46" width="40" height="1.6" fill="#1f3a5f"/>
  <g fill="#f3ecdc">
    <rect x="19" y="14" width="1.6" height="30"/><rect x="31" y="10" width="1.6" height="34"/><rect x="43" y="16" width="1.6" height="28"/>
    <path d="M13 22 h14 l-1 9 h-12 z"/><path d="M14 33 h12 l-1 8 h-10 z"/>
    <path d="M25 17 h16 l-1 10 h-14 z"/><path d="M26 29 h14 l-1 10 h-12 z"/>
    <path d="M38 24 h12 l-1 8 h-10 z"/><path d="M39 34 h10 l-1 7 h-8 z"/>
  </g>
  <path d="M32 6 l8 2 l-8 2 z" fill="#b8322a"/>
</svg>`;

await mkdir('icons', { recursive: true });
await writeFile('icons/icon.svg', SVG);
const pw = await import(PW);
const browser = await (pw.chromium || pw.default.chromium).launch();
for (const size of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0}</style>${SVG.replace('<svg ', `<svg width="${size}" height="${size}" `)}`);
  await page.screenshot({ path: `icons/icon-${size}.png` });
  await page.close();
}
await browser.close();
console.log('icons written');
