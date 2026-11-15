// VICE · shared helpers and the one config block
export const CONFIG = {
  ca: '',          // the $VICE mint, once it is live: turns on wanted levels, Buy and Chart
  x: '',           // the X account, e.g. 'https://x.com/...'
  treasury: '',    // where the wash fee goes (it buys back $VICE). Empty = no fee is taken at all.
  ttwo: 'TTWofwAge91oFhZs7kpQdyrVRkmevgM88xijGvQFbKo',   // TTWO, Take-Two tokenized by Backpack: $VICE's pair on pump.fun
  gta: '2026-11-19T00:00:00',                             // GTA VI release day, midnight local time
};
// wanted levels: how much $VICE you hold sets your stars, and your stars set the wash fee
export const TIERS = [
  { stars: 0, min: 0, fee: 10, name: 'Tourist' },
  { stars: 1, min: 1e4, fee: 8, name: 'Corner boy' },
  { stars: 2, min: 1e5, fee: 6, name: 'Runner' },
  { stars: 3, min: 1e6, fee: 4, name: 'Lieutenant' },
  { stars: 4, min: 5e6, fee: 2, name: 'Kingpin' },
  { stars: 5, min: 1e7, fee: 0, name: 'Most wanted' },
];
export const tierFor = bal => [...TIERS].reverse().find(t => bal >= t.min) || TIERS[0];

const BUS = new Map();
export const on = (e, f) => { (BUS.get(e) || BUS.set(e, []).get(e)).push(f); };
export const emit = (e, v) => (BUS.get(e) || []).forEach(f => { try { f(v); } catch (err) { console.error(err); } });
export const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const short = a => a ? a.slice(0, 4) + '…' + a.slice(-4) : '';
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const ok = v => v != null && isFinite(v);
export const LAMPORTS = 1e9;
// SOL amounts: 4 decimals for anything you'd notice, 6 for crumbs
export const sol = (lamports, d) => { const v = lamports / LAMPORTS; return v.toFixed(d ?? (v >= 1 ? 3 : v >= .01 ? 4 : 6)); };
export function usd(v, d) {
  if (!ok(v)) return '—';
  const a = Math.abs(v), sg = v < 0 ? '-' : '';
  if (a >= 1e9) return sg + '$' + (a / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return sg + '$' + (a / 1e6).toFixed(2) + 'M';
  if (a >= 1e4) return sg + '$' + (a / 1e3).toFixed(1) + 'K';
  if (a > 0 && a < .01) return sg + '<$0.01';
  return sg + '$' + a.toLocaleString('en-US', { minimumFractionDigits: d ?? 2, maximumFractionDigits: d ?? 2 });
}
export function num(v, d = 2) {
  if (!ok(v)) return '—'; const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(d) + 'B'; if (a >= 1e6) return (v / 1e6).toFixed(d) + 'M'; if (a >= 1e4) return (v / 1e3).toFixed(1) + 'K';
  if (a >= 1) return v.toLocaleString('en-US', { maximumFractionDigits: a >= 100 ? 0 : 2 });
  if (a === 0) return '0';
  return v.toPrecision(3);
}
export const pct = (v, d = 2) => !ok(v) ? '—' : (v > 0 ? '+' : '') + v.toFixed(d) + '%';
export const solscan = (x, kind = 'tx') => `https://solscan.io/${kind}/${x}`;
export function toast(msg, kind = '', ms = 5000) {
  const box = $('#toasts'); if (!box) return;
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = msg; box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
}
export async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Copied', 'ok', 2200); } catch { toast('Copy failed. Select it by hand.', 'err'); } }
// small inline icons: drawn here, no icon font
export const ICON = {
  sol: '<svg viewBox="0 0 24 24" class="i-sol" aria-hidden="true"><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="12" cy="12" r="4.2" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8l2.9 6.5 7.1.7-5.3 4.8 1.5 7-6.2-3.6-6.2 3.6 1.5-7L2 9l7.1-.7z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-7.4 8.5L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.9-9.1L1.5 2h7l4.8 6.3zm-1.2 18h1.9L7.4 3.9H5.4z"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  ext: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h10v10M19 5L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
export const stars = (n, cls = '') => `<span class="stars ${cls}">${[0, 1, 2, 3, 4].map(i => `<i class="${i < n ? 'on' : ''}">${ICON.star}</i>`).join('')}</span>`;
