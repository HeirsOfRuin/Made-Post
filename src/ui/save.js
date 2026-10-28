// Saving to the device (architecture invariants 8-10). The key is a contract:
// never rename it. The payload carries its version; migrate() walks old saves
// forward. A text code moves a game between devices and survives cleared storage.

import { lsGet, lsSet, lsDel, STORAGE_OK } from './storage.js';
import { SAVE_VERSION } from '../engine/state.js';

export const SAVE_KEY = 'madepost.save.v1';
const CODE_PREFIX = 'MADP1.';

// v1 is the first version. Add { 1: (s) => ({ ...s, v: 2, ... }) } when the
// state shape changes, and a fixture of the old version in test/fixtures/.
const MIGRATIONS = {};

export function migrate(s) {
  let x = s;
  while (x.v < SAVE_VERSION) {
    const m = MIGRATIONS[x.v];
    if (!m) throw new Error(`no migration from save version ${x.v}`);
    x = m(x);
  }
  return x;
}

export function saveGame(s) {
  return lsSet(SAVE_KEY, JSON.stringify(s));
}

export function loadGame() {
  const raw = lsGet(SAVE_KEY);
  if (!raw) return null;
  try { return migrate(JSON.parse(raw)); } catch { return null; }
}

export function clearSave() {
  lsDel(SAVE_KEY);
}

function toB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64(code) {
  const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function exportCode(s) {
  return CODE_PREFIX + toB64(JSON.stringify(s));
}

export function importCode(code) {
  const c = code.trim();
  if (!c.startsWith(CODE_PREFIX)) throw new Error('That is not a Made Post save code (it should start MADP1.).');
  const s = JSON.parse(fromB64(c.slice(CODE_PREFIX.length)));
  if (typeof s.v !== 'number' || !s.player) throw new Error('The code is damaged.');
  return migrate(s);
}

export { STORAGE_OK };
