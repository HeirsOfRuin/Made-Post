// Contact sheet of every ship shape, damage state and ensign, for looking at the
// art at true size. Usage: node tools/ship-sheet.mjs out.html, then open or screenshot it.
// Contact sheet: every ship shape and nation at true size, light background.
import { writeFile } from 'node:fs/promises';
import { shipSVG, ensign } from '../src/ui/art.js';
const shapes = ['sloop', 'frigate32', 'frigate38', 'frigate40', 'frigate44', 'brig', 'merchant', 'gunboats'];
const nations = ['british', 'french', 'spanish', 'american', 'danish'];
let html = '<html><body style="background:#f3ecdc;font:12px sans-serif;width:780px">';
for (const sh of shapes) html += `<div style="display:inline-block;width:250px;margin:4px">${sh}${shipSVG({ shape: sh, nation: 'british', year: 1805 })}</div>`;
html += '<h3>damaged, facing left, smoke</h3>';
html += `<div style="display:inline-block;width:250px">${shipSVG({ shape: 'frigate38', nation: 'french', rigging: 20, hull: 20, facing: 'left', smoke: true })}</div>`;
html += '<h3>ensigns 1800 / 1805</h3>';
for (const n of nations) html += `<svg width="120" height="70" viewBox="0 0 40 24">${ensign(n, 2, 2, 36, 20, 1800)}</svg>`;
html += `<svg width="120" height="70" viewBox="0 0 40 24">${ensign('british', 2, 2, 36, 20, 1805)}</svg>`;
await writeFile(process.argv[2], html + '</body></html>');
