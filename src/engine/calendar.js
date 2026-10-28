// Days since the epoch (1 February 1793) <-> dates. UTC arithmetic only; the
// engine never asks the machine what day it is.

import { CONFIG } from '../data/config.data.js';

const MS = 86400000;
const EPOCH = Date.UTC(...parse(CONFIG.epoch));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function parse(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m - 1, d];
}

export function dayOf(iso) {
  return Math.round((Date.UTC(...parse(iso)) - EPOCH) / MS);
}

export function dateOf(day) {
  const t = new Date(EPOCH + day * MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function formatDay(day) {
  const { y, m, d } = dateOf(day);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function monthYear(day) {
  const { y, m } = dateOf(day);
  return `${MONTHS[m - 1]} ${y}`;
}

export function yearOf(day) {
  return dateOf(day).y;
}
