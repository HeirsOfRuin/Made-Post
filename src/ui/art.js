// Ships in profile, drawn in code as SVG strings (no image files; the
// generator is the source). Used on the title screen, the Ship fold and the
// battle screen. Pure functions of their arguments, so a test can read them.
//
// Historical notes kept in the drawing:
//  - British ships carry the Union in the ensign's canton; the Union gained St
//    Patrick's red saltire on 1 January 1801, so the date matters.
//  - French ships fly the vertical tricolour (adopted for the navy in 1794).
//  - Spanish ships fly red-yellow-red (the 1785 ensign; arms omitted at this size).
//  - American ships fly the 15-stripe flag of 1795-1818, simplified to bands.
//  - Danish ships fly the split-tailed Dannebrog.
//  - Gunports along a yellow-ochre band, the usual British livery of the period.
// Sizes are stylised: a sloop is drawn smaller than a frigate, not to scale.

const HULL = '#2b2622';
const BAND = '#c9a24a';
const SAIL = '#efe8d6';
const SAIL_EDGE = '#b9ad92';
const ROPE = '#3c352e';

/** Shape of each kind of ship: masts, height, gunports, length. */
const SHAPES = {
  sloop: { masts: 3, h: 0.72, ports: 8, len: 0.78 },
  frigate32: { masts: 3, h: 0.86, ports: 13, len: 0.9 },
  frigate38: { masts: 3, h: 0.94, ports: 14, len: 0.96 },
  frigate40: { masts: 3, h: 1, ports: 15, len: 1 },
  frigate44: { masts: 3, h: 1.04, ports: 16, len: 1.04 },
  brig: { masts: 2, h: 0.7, ports: 7, len: 0.7 },
  merchant: { masts: 3, h: 0.8, ports: 0, len: 0.85 },
  gunboats: { gunboats: true },
};

const ENEMY_SHAPE = { merchant: 'merchant', privateer: 'brig', french: 'frigate38', spanish: 'frigate38', american: 'frigate44', american38: 'frigate38', gunboats: 'gunboats' };
const NATION = { French: 'french', Spanish: 'spanish', American: 'american', Danish: 'danish', British: 'british' };

export function enemyShape(kind) {
  return ENEMY_SHAPE[kind] || 'frigate38';
}
export function nationOf(flag) {
  return NATION[flag] || 'french';
}

// ---- flags ---------------------------------------------------------------------

function union(x, y, w, h, year) {
  // Blue field, white saltire, (from 1801) red saltire, white-bordered red cross.
  const cx = x + w / 2, cy = y + h / 2;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1f3b73"/>`;
  s += `<path d="M${x},${y}L${x + w},${y + h}M${x + w},${y}L${x},${y + h}" stroke="#fff" stroke-width="${h * 0.22}"/>`;
  if (year >= 1801) s += `<path d="M${x},${y}L${x + w},${y + h}M${x + w},${y}L${x},${y + h}" stroke="#c8102e" stroke-width="${h * 0.08}"/>`;
  s += `<path d="M${cx},${y}V${y + h}M${x},${cy}H${x + w}" stroke="#fff" stroke-width="${h * 0.34}"/>`;
  s += `<path d="M${cx},${y}V${y + h}M${x},${cy}H${x + w}" stroke="#c8102e" stroke-width="${h * 0.2}"/>`;
  return s;
}

export function ensign(nation, x, y, w, h, year = 1800) {
  switch (nation) {
    case 'british':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#b0222b"/>${union(x, y, w * 0.5, h * 0.5, year)}`;
    case 'french':
      return `<rect x="${x}" y="${y}" width="${w / 3}" height="${h}" fill="#1f3b8a"/><rect x="${x + w / 3}" y="${y}" width="${w / 3}" height="${h}" fill="#fff"/><rect x="${x + (2 * w) / 3}" y="${y}" width="${w / 3}" height="${h}" fill="#c8102e"/>`;
    case 'spanish':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#c60b1e"/><rect x="${x}" y="${y + h / 4}" width="${w}" height="${h / 2}" fill="#f1bf00"/>`;
    case 'american': {
      let s = '';
      for (let i = 0; i < 7; i++) s += `<rect x="${x}" y="${y + (i * h) / 7}" width="${w}" height="${h / 7}" fill="${i % 2 ? '#fff' : '#b22234'}"/>`;
      return `${s}<rect x="${x}" y="${y}" width="${w * 0.42}" height="${(h * 4) / 7}" fill="#3c3b6e"/>`;
    }
    case 'danish':
      return `<path d="M${x},${y}H${x + w}L${x + w * 0.82},${y + h / 2}L${x + w},${y + h}H${x}Z" fill="#c8102e"/><path d="M${x + w * 0.32},${y}V${y + h}M${x},${y + h / 2}H${x + w * 0.86}" stroke="#fff" stroke-width="${h * 0.18}"/>`;
    default:
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#888"/>`;
  }
}

// ---- ships -------------------------------------------------------------------

function sails(mx, top, deck, width, hp, damaged) {
  // Course, topsail and topgallant: three stacked, slightly tapering sails.
  const rows = damaged ? 1 : 3;
  const tier = (deck - top) / 3.4;
  let s = '';
  for (let i = 0; i < rows; i++) {
    const y1 = deck - 8 - (i + 1) * tier + 2;
    const w = width * (1 - i * 0.18);
    s += `<path d="M${mx - w / 2},${y1}H${mx + w / 2}L${mx + w / 2 - 2},${y1 + tier - 3}H${mx - w / 2 + 2}Z" fill="${SAIL}" stroke="${SAIL_EDGE}" stroke-width="0.6"/>`;
  }
  return s;
}

function gunboatsSVG(nation, year) {
  let s = '';
  for (let i = 0; i < 3; i++) {
    const x = 30 + i * 52, y = 88 - (i % 2) * 6;
    s += `<path d="M${x},${y}h36l-5,7h-26z" fill="${HULL}"/>`;
    s += `<path d="M${x + 18},${y}V${y - 26}" stroke="${ROPE}" stroke-width="1.2"/>`;
    s += `<path d="M${x + 18},${y - 26}L${x + 32},${y - 6}H${x + 18}Z" fill="${SAIL}" stroke="${SAIL_EDGE}" stroke-width="0.6"/>`;
    s += `<path d="M${x + 1},${y - 1}h6" stroke="#111" stroke-width="2"/>`;
    s += ensign(nation, x - 2, y - 14, 10, 6, year);
  }
  return s;
}

/**
 * A ship in profile.
 * shape: a SHAPES key; nation: british|french|spanish|american|danish;
 * year: for the Union; rigging, hull: 0-100 (damage shows below 40);
 * facing: 'right' (bow to the right) or 'left'; smoke: gunsmoke along the side.
 */
export function shipSVG({ shape = 'frigate38', nation = 'british', year = 1800, rigging = 100, hull = 100, facing = 'right', smoke = false, title = '' } = {}) {
  const sh = SHAPES[shape] || SHAPES.frigate38;
  const sea = '<path d="M0,96 Q12,92 24,96 T48,96 T72,96 T96,96 T120,96 T144,96 T168,96 T192,96 T216,96 V120 H0 Z" fill="#4c6f8f" opacity="0.55"/>';
  let body = '';
  if (sh.gunboats) {
    body = gunboatsSVG(nation, year);
  } else {
    const L = 150 * sh.len;
    const x0 = 100 - L / 2, x1 = 100 + L / 2;
    const deck = 76, keel = 93;
    // Hull: high stern on the left, bow on the right, bowsprit forward.
    body += `<path d="M${x0},${deck - 6}L${x0 + 10},${deck - 4}L${x1 - 6},${deck}L${x1 + 4},${deck - 3}L${x1 - 8},${keel}H${x0 + 12}Z" fill="${HULL}"/>`;
    body += `<path d="M${x1 - 4},${deck - 2}L${x1 + 22},${deck - 14}" stroke="${ROPE}" stroke-width="1.6"/>`;
    // The band and its gunports
    body += `<path d="M${x0 + 4},${deck + 3}L${x1 - 4},${deck + 5}" stroke="${sh.ports ? BAND : '#7a5b3a'}" stroke-width="5"/>`;
    for (let i = 0; i < sh.ports; i++) {
      const px = x0 + 18 + (i * (L - 36)) / Math.max(1, sh.ports - 1);
      body += `<rect x="${px - 1.6}" y="${deck + 1.6 + (i / sh.ports) * 2}" width="3.2" height="3" fill="#111"/>`;
    }
    if (hull < 40) body += `<circle cx="${x0 + L * 0.4}" cy="${deck + 9}" r="2.2" fill="#000"/><circle cx="${x0 + L * 0.66}" cy="${deck + 11}" r="1.8" fill="#000"/>`;
    // Masts and sails
    const mastX = sh.masts === 3 ? [x0 + L * 0.28, x0 + L * 0.55, x0 + L * 0.8] : [x0 + L * 0.42, x0 + L * 0.72];
    const heights = sh.masts === 3 ? [0.78, 1, 0.92] : [1, 0.94];
    const damaged = rigging < 40;
    mastX.forEach((mx, i) => {
      const lost = damaged && i === 0 && sh.masts === 3; // the mizzen goes first
      const h = 64 * sh.h * heights[i] * (lost ? 0.35 : 1);
      const top = deck - h;
      body += `<path d="M${mx},${deck}V${top}" stroke="${ROPE}" stroke-width="1.6"/>`;
      if (!lost) body += sails(mx, top, deck, 26 * sh.h * (i === 0 && sh.masts === 3 ? 0.8 : 1), sh.h, damaged && i === 1);
    });
    // Ensign at the stern, a pennant at the main masthead
    body += `<path d="M${x0 + 2},${deck - 6}V${deck - 22}" stroke="${ROPE}" stroke-width="1"/>`;
    // The flag streams aft from the staff, so its hoist (canton, blue of the
    // tricolour) sits against the staff on its right: mirror it about its centre.
    body += `<g transform="translate(${2 * (x0 - 6)},0) scale(-1,1)">${ensign(nation, x0 - 14, deck - 22, 16, 10, year)}</g>`;
    const main = mastX[sh.masts === 3 ? 1 : 0];
    const mainTop = deck - 64 * sh.h;
    if (nation === 'british' && sh.ports) body += `<path d="M${main},${mainTop}l-26,2l26,2z" fill="#b0222b"/>`;
  }
  if (smoke) body += `<g fill="#d8d3c8" opacity="0.75"><ellipse cx="70" cy="86" rx="16" ry="7"/><ellipse cx="100" cy="84" rx="20" ry="8"/><ellipse cx="130" cy="87" rx="15" ry="6"/></g>`;
  const flip = facing === 'left' ? ' transform="translate(200,0) scale(-1,1)"' : '';
  return `<svg class="ship-art" viewBox="0 0 200 120" role="img" aria-label="${title || shape}" xmlns="http://www.w3.org/2000/svg">${sea}<g${flip}>${body}</g></svg>`;
}
