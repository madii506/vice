// VICE · the terminal: real pump.fun coins, live from Jupiter. Brand-new pairs, the ones about to fill the curve, the ones that just
// migrated to PumpSwap. Open any coin for its chart, holders and safety checks, and buy or sell it from your own wallet:
// Jupiter Ultra builds every swap for your address and your wallet signs it. VICE never holds a key or a coin. Most memecoins go to zero.
import { $, $$, esc, usd, pct, short, solscan, toast, copy, store } from './core.js';
import { gtPools, gtCandles, SOL_MINT } from './rpc.js';
import { b64e, b64d } from './sol.js';
import * as wallet from './wallet.js';

const JUP = 'https://lite-api.jup.ag', JDP = 'https://datapi.jup.ag';
const COLS = [['recent', 'New pairs', 'just launched on pump.fun'], ['aboutToGraduate', 'Final stretch', 'closest to filling the curve'], ['graduated', 'Migrated', 'graduated to PumpSwap']];
const QB = [0.05, 0.1, 0.25, 0.5, 1], TF = { '1m': ['minute', 1], '5m': ['minute', 5], '15m': ['minute', 15], '1h': ['hour', 1] };
export const T = { on: false, pulse: { recent: [], aboutToGraduate: [], graduated: [] }, by: new Map(), prev: new Map(), at: 0, err: 0, timer: 0, q: '', col: 'recent',
  qb: +store.get('vice:qb', .1) || .1, sel: null, side: 'buy', amt: null, sellPct: 50, quote: null, qT: 0, qN: 0, tf: '5m', pend: new Set(), solUsd: null, hold: null, ctx: null };

async function j(url, opt = {}, ms = 12000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { ...opt, signal: c.signal }); const d = await r.json().catch(() => null); if (!r.ok) { throw new Error((d && (d.error || d.errorMessage || d.message)) || 'HTTP ' + r.status); } return d; }
  finally { clearTimeout(t); }
}
const gems = () => { const f = { timeframe: '24h', launchpads: ['pump.fun'] }; return j(JDP + '/v1/pools/gems', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recent: f, aboutToGraduate: f, graduated: f }) }); };
const order = p => j(`${JUP}/ultra/v1/order?` + new URLSearchParams(p).toString());
const execute = (signedTransaction, requestId) => j(`${JUP}/ultra/v1/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signedTransaction, requestId }) }, 60000);
const holdings = a => j(`${JUP}/ultra/v1/holdings/${a}`);

// ---------------------------------------------------------------- small things
const fin = v => v != null && isFinite(v);
const cmp = v => { if (!fin(v)) return '—'; const a = Math.abs(v); if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M'; if (a >= 1e3) return '$' + (v / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'K'; return '$' + Math.round(v); };
const amt = v => { if (!fin(v)) return '—'; const a = Math.abs(v); if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M'; if (a >= 1e3) return (v / 1e3).toFixed(1) + 'K'; if (a >= 1) return v.toFixed(2); return a ? v.toPrecision(3) : '0'; };
const solf = v => (fin(v) ? (v >= 100 ? v.toFixed(1) : v >= 1 ? +v.toFixed(3) : +v.toFixed(4)) + ' SOL' : '—');
const ago = t => { const s = Math.max(0, (Date.now() - t) / 1000); if (s < 60) return Math.floor(s) + 's'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h'; return Math.floor(s / 86400) + 'd'; };
const ms = v => (v ? Date.parse(v) || null : null);
const link = (v, base) => (/^https?:\/\//i.test(v) ? v : base + String(v).replace(/^@/, ''));
const clamp = v => (fin(v) ? Math.max(0, Math.min(100, v)) : 0);
const cls = v => !fin(v) ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : '';
const errMsg = e => { const m = String((e && (e.message || e)) || 'Something went wrong.'); return /reject|denied|cancel|declin/i.test(m) ? 'You cancelled it in your wallet.' : m.length > 160 ? m.slice(0, 157) + '…' : m; };
function fromTok(b, p = {}, col = null) {
  const a = b.audit || {}, s5 = b.stats5m || {}, s1 = b.stats1h || {}, s24 = b.stats24h || {}, grad = ms(b.graduatedAt);
  return { mint: b.id, col: col || (grad ? 'graduated' : null), name: b.name || '', sym: b.symbol || '', icon: /^https:\/\//.test(b.icon || '') ? b.icon : '', dec: b.decimals ?? 6,
    created: ms((b.firstPool && b.firstPool.createdAt) || b.createdAt || p.createdAt), grad, prog: p.bondingCurve != null ? +p.bondingCurve : grad ? 100 : null,
    mcap: +(b.mcap ?? b.fdv) || null, price: +b.usdPrice || null, liq: +(p.liquidity ?? b.liquidity) || null,
    vol: +p.volume24h || (s24.buyVolume || 0) + (s24.sellVolume || 0) || null, holders: b.holderCount ?? null,
    top10: a.topHoldersPercentage ?? null, mintOff: a.mintAuthorityDisabled ?? null, freezeOff: a.freezeAuthorityDisabled ?? null, devMints: a.devMints ?? null,
    bundle: a.bundlerStats ? a.bundlerStats.holdingPct ?? null : null, tw: b.twitter || '', web: b.website || '', tg: b.telegram || '',
    ch5: s5.priceChange ?? null, ch1: s1.priceChange ?? null, ch24: s24.priceChange ?? null, nb5: s5.numBuys ?? null, ns5: s5.numSells ?? null };
}
const merge = t => { const o = T.by.get(t.mint); if (o) for (const k of Object.keys(t)) if (t[k] == null || t[k] === '') t[k] = o[k]; T.by.set(t.mint, t); return t; };

// ---------------------------------------------------------------- the pulse
export function start(ctx) { if (ctx) T.ctx = ctx; if (T.on) return; T.on = true; poll(); hold(); }
export function stop() { T.on = false; clearTimeout(T.timer); clearTimeout(T.qT); }
async function poll() {
  clearTimeout(T.timer); if (!T.on) return;
  if (document.hidden) { T.timer = setTimeout(poll, 2000); return; }
  try {
    const d = await gems();
    for (const [k] of COLS) {
      for (const t of T.pulse[k]) if (t.mcap != null) T.prev.set(t.mint, t.mcap);
      T.pulse[k] = ((d[k] && d[k].pools) || []).filter(p => p && p.baseAsset && p.baseAsset.id).map(p => merge(fromTok(p.baseAsset, p, k))).filter(t => t.sym || t.name);
    }
    T.at = Date.now(); T.err = 0; draw();
  } catch { T.err++; }
  status();
  T.timer = setTimeout(poll, T.err ? Math.min(30000, 3000 * 2 ** T.err) : 4000);
}
function status() { const s = $('#tStat'); if (!s) return; const age = T.at ? Math.round((Date.now() - T.at) / 1000) : null; s.textContent = T.err && (!T.at || age > 20) ? 'reconnecting…' : T.at ? (age < 3 ? 'live' : `live · ${age}s`) : 'connecting…'; s.classList.toggle('off', !!T.err && (!T.at || age > 20)); }
async function hold() {
  const a = wallet.W.address; if (!a) { T.hold = null; return; }
  try { const h = await holdings(a); if (wallet.W.address === a) T.hold = { sol: +h.uiAmount || 0, tok: h.tokens || {} }; } catch {}
  if (T.sel) info();
}
const balRaw = m => { const L = (T.hold && T.hold.tok[m]) || []; let s = 0n; for (const x of L) { try { s += BigInt(x.amount || '0'); } catch {} } return s; };
const balUi = m => ((T.hold && T.hold.tok[m]) || []).reduce((s, x) => s + (+x.uiAmount || 0), 0);

// ---------------------------------------------------------------- the three columns
const pass = t => { const q = T.q.trim().toLowerCase(); return !q || t.sym.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.mint.toLowerCase() === q; };
const sorted = k => { const L = T.pulse[k].slice(); if (k === 'recent') L.sort((a, b) => (b.created || 0) - (a.created || 0)); else if (k === 'graduated') L.sort((a, b) => (b.grad || 0) - (a.grad || 0)); else L.sort((a, b) => (b.prog ?? 0) - (a.prog ?? 0)); return L; };
const icon = t => (t.icon ? `<img src="${esc(t.icon)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<b>${esc((t.sym || '?').slice(0, 2))}</b>`);
function flags(t) {
  const f = [];
  if (fin(t.top10)) f.push(`<span class="fl ${t.top10 >= 30 ? 'bad' : ''}" title="Share held by the top 10 holders">T10 ${t.top10.toFixed(0)}%</span>`);
  if (fin(t.devMints) && t.devMints > 0) f.push(`<span class="fl ${t.devMints >= 10 ? 'bad' : ''}" title="Coins this dev has launched">DEV ${t.devMints}</span>`);
  if (fin(t.bundle) && t.bundle >= 1) f.push(`<span class="fl ${t.bundle >= 15 ? 'bad' : ''}" title="Share held by bundled wallets">BNDL ${t.bundle.toFixed(0)}%</span>`);
  if (t.mintOff === false || t.freezeOff === false) f.push('<span class="fl bad" title="Mint or freeze authority is still on">AUTH</span>');
  return f.join('');
}
function card(t, k) {
  const pv = T.prev.get(t.mint), fl = pv != null && fin(t.mcap) && Math.abs(t.mcap / pv - 1) > .002 ? (t.mcap > pv ? ' fu' : ' fd') : '';
  return `<div class="tc${fl}" data-m="${esc(t.mint)}" tabindex="0" role="button" aria-label="${esc(t.sym)}">
    <span class="tc-i${k !== 'graduated' && t.prog >= 90 ? ' hot' : ''}" style="--p:${clamp(k === 'graduated' ? 100 : t.prog)}">${icon(t)}</span>
    <span class="tc-b"><span class="tc-n"><b>${esc(t.sym)}</b><em>${esc(t.name)}</em></span>
      <span class="tc-m"><time>${t.created ? ago(k === 'graduated' && t.grad ? t.grad : t.created) : ''}</time><span title="Holders">${fin(t.holders) ? amt(t.holders).replace('.00', '') + ' holders' : ''}</span>${flags(t)}</span>
      <span class="tc-k"><span>MC <b>${cmp(t.mcap)}</b></span><span>V <b>${cmp(t.vol)}</b></span>${fin(t.ch5) ? `<span class="${cls(t.ch5)}">${pct(t.ch5, 1)}</span>` : ''}</span></span>
    <span class="tc-r">${k === 'graduated' ? '<span class="tc-tag">PumpSwap</span>' : `<span class="tc-pg${t.prog >= 90 ? ' hot' : ''}">${fin(t.prog) ? t.prog.toFixed(0) + '%' : ''}</span>`}
      <button type="button" class="tc-buy" data-buy="${esc(t.mint)}" ${T.pend.has(t.mint) ? 'disabled' : ''} title="Quick buy ${T.qb} SOL"><svg viewBox="0 0 24 24"><path d="M13.2 2.5 5 13.6h5.6l-1 7.9 8.4-11.3h-5.7z"/></svg>${T.qb}</button></span></div>`;
}
function draw() {
  if (!$('#term')) return;
  for (const [k] of COLS) {
    const box = $(`#tl-${k}`); if (!box) continue;
    const L = sorted(k).filter(pass).slice(0, 40), y = box.scrollTop;
    $(`#tn-${k}`).textContent = L.length;
    box.innerHTML = L.length ? L.map(t => card(t, k)).join('') : `<p class="tr-empty">${T.at ? 'Nothing matches.' : 'Reading pump.fun…'}</p>`;
    box.scrollTop = y;
  }
}

// ---------------------------------------------------------------- the section
export function termSec() {
  if (T.sel) return coinSec();
  const narrow = ($('#pane') || { clientWidth: 1000 }).clientWidth < 860;
  return {
    h: `<div><h2><span class="chrome">Terminal</span></h2><p>Real pump.fun coins, live from Jupiter. Most memecoins go to zero: only trade what you can lose.</p></div>
      <div class="r"><span class="live-pill"><i></i><span id="tStat">connecting…</span></span></div>`,
    b: `<div class="toolbar"><input class="search" id="tq" placeholder="Search a coin or paste a CA" value="${esc(T.q)}" autocomplete="off" spellcheck="false">
      <div class="seg" title="Quick buy amount">${QB.map(v => `<button data-qb="${v}" class="${T.qb === v ? 'on' : ''}">⚡ ${v}</button>`).join('')}</div>
      ${narrow ? `<div class="seg">${COLS.map(([k, l]) => `<button data-col="${k}" class="${T.col === k ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}</div>
      <div class="term${narrow ? ' one' : ''}" id="term">${COLS.map(([k, l, s]) => `<section class="tcol${narrow && T.col !== k ? ' gone' : ''}"><h3><b>${l}</b><span class="muted">${s}</span><em id="tn-${k}">0</em></h3><div class="tlist" id="tl-${k}"><p class="tr-empty">Reading pump.fun…</p></div></section>`).join('')}</div>`,
    full: true,
    after() {
      start(); draw(); status();
      const q = $('#tq'); q.oninput = () => { const v = q.value.trim(); T.q = v; if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v) && v.length >= 40) { openCoin(v); return; } draw(); };
      $$('[data-qb]').forEach(b => b.onclick = () => { T.qb = +b.dataset.qb; store.set('vice:qb', T.qb); $$('[data-qb]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
      $$('[data-col]').forEach(b => b.onclick = () => { T.col = b.dataset.col; $$('[data-col]').forEach(x => x.classList.toggle('on', x === b)); $$('.tcol').forEach((c, i) => c.classList.toggle('gone', COLS[i][0] !== T.col)); });
      $('#term').onclick = e => {
        const qb = e.target.closest('[data-buy]'); if (qb) { e.stopPropagation(); buy(qb.dataset.buy, T.qb); return; }
        const c = e.target.closest('.tc'); if (c) openCoin(c.dataset.m);
      };
      $('#term').onkeydown = e => { const c = e.target.closest('.tc'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCoin(c.dataset.m); } };
    },
  };
}
export function openCoin(m) { T.sel = m; T.side = 'buy'; T.amt = null; T.quote = null; T.ctx && T.ctx.render(); hold(); }
const back = () => { T.sel = null; clearTimeout(T.qT); T.ctx && T.ctx.render(); };

// ---------------------------------------------------------------- one coin: chart, numbers, safety, buy and sell
async function lookup(m) {
  try { const d = await j(`${JUP}/tokens/v2/search?query=${m}`); const b = (d || []).find(x => x.id === m); if (b) { merge(fromTok(b)); if (T.sel === m) info(); } } catch {}
}
function coinSec() {
  const m = T.sel, t = T.by.get(m) || { mint: m, sym: short(m), name: '' };
  if (!T.by.get(m) || !T.by.get(m).holders) lookup(m);
  return {
    h: `<div style="display:flex;align-items:center;gap:12px"><button class="ib" id="tBack" aria-label="Back to the terminal"><svg viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <span class="tc-i big" style="--p:${clamp(t.col === 'graduated' ? 100 : t.prog)}" id="cdIcon">${icon(t)}</span><div><h2 id="cdSym">${esc(t.sym)}</h2><p id="cdName">${esc(t.name)}</p></div></div>
      <div class="r"><button class="addr" id="cdCa" title="Copy the contract address">${esc(short(m))}</button><a class="ghost dark sm" href="https://pump.fun/coin/${esc(m)}" target="_blank" rel="noopener">pump.fun</a><a class="ghost dark sm" href="${solscan(m, 'token')}" target="_blank" rel="noopener">Solscan</a></div>`,
    b: `<div class="coin"><div>
        <div class="kv4" id="cdKv"></div>
        <div class="chart-h"><div class="seg">${Object.keys(TF).map(k => `<button data-tf="${k}" class="${T.tf === k ? 'on' : ''}">${k}</button>`).join('')}</div><span class="muted sm" id="cdChS"></span></div>
        <div class="chart"><canvas id="cdCv"></canvas><p class="tr-empty" id="cdCvE">Loading the chart…</p></div>
        <div class="safety" id="cdSafe"></div>
      </div><div>
        <div class="trade" id="cdTrade"></div>
        <p class="muted sm" style="margin-top:12px">Swaps are built by Jupiter for your address and signed in your wallet. VICE takes no fee on trades. Most memecoins go to zero.</p>
      </div></div>`,
    full: false,
    after() {
      $('#tBack').onclick = back; $('#cdCa').onclick = () => copy(m);
      $$('[data-tf]').forEach(b => b.onclick = () => { T.tf = b.dataset.tf; $$('[data-tf]').forEach(x => x.classList.toggle('on', x === b)); chart(true); });
      info(); trade(); chart(true);
    },
  };
}
function info() {
  const m = T.sel, t = T.by.get(m); if (!t || !$('#cdKv')) return;
  $('#cdSym').textContent = t.sym; $('#cdName').textContent = t.name;
  const mine = balUi(m);
  $('#cdKv').innerHTML = [['Price', t.price ? '$' + (t.price >= .01 ? t.price.toFixed(4) : t.price.toPrecision(3)) : '—'], ['Market cap', cmp(t.mcap)], ['Volume 24h', cmp(t.vol)], ['Holders', fin(t.holders) ? amt(t.holders).replace('.00', '') : '—'],
    ['Curve', t.col === 'graduated' || t.grad ? 'Migrated' : fin(t.prog) ? t.prog.toFixed(1) + '%' : '—'], ['5m', fin(t.ch5) ? `<span class="${cls(t.ch5)}">${pct(t.ch5, 1)}</span>` : '—'], ['1h', fin(t.ch1) ? `<span class="${cls(t.ch1)}">${pct(t.ch1, 1)}</span>` : '—'], ['You hold', mine ? amt(mine) : '—']]
    .map(([k, v]) => `<div><span class="k">${k}</span><b>${v}</b></div>`).join('');
  const ok = (good, txt, bad) => `<div class="sf ${good == null ? '' : good ? 'ok' : 'bad'}"><i></i><span>${good == null ? txt + ': unknown' : good ? txt : bad}</span></div>`;
  $('#cdSafe').innerHTML = `<span class="k" style="margin-bottom:8px">Safety checks</span>
    ${ok(t.mintOff, 'Mint authority off', 'Mint authority is still on: more can be printed')}
    ${ok(t.freezeOff, 'Freeze authority off', 'Freeze authority is on: your coins can be frozen')}
    ${ok(fin(t.top10) ? t.top10 < 30 : null, `Top 10 hold ${fin(t.top10) ? t.top10.toFixed(1) + '%' : ''}`, `Top 10 hold ${fin(t.top10) ? t.top10.toFixed(1) : ''}%: concentrated`)}
    ${ok(fin(t.bundle) ? t.bundle < 15 : null, `Bundlers hold ${fin(t.bundle) ? t.bundle.toFixed(1) + '%' : ''}`, `Bundlers hold ${fin(t.bundle) ? t.bundle.toFixed(1) : ''}%`)}
    ${fin(t.devMints) ? ok(t.devMints < 10, `Dev launched ${t.devMints} coin${t.devMints === 1 ? '' : 's'}`, `Dev launched ${t.devMints} coins`) : ''}
    <div class="soc">${t.tw ? `<a class="link" href="${esc(link(t.tw, 'https://x.com/'))}" target="_blank" rel="noopener">X</a>` : ''}${t.web ? `<a class="link" href="${esc(link(t.web, 'https://'))}" target="_blank" rel="noopener">Website</a>` : ''}${t.tg ? `<a class="link" href="${esc(link(t.tg, 'https://t.me/'))}" target="_blank" rel="noopener">Telegram</a>` : ''}</div>`;
  const ic = $('#cdIcon'); if (ic && !ic.querySelector('img') && t.icon) ic.innerHTML = icon(t);
}
function trade() {
  const box = $('#cdTrade'); if (!box) return; const m = T.sel, t = T.by.get(m) || { sym: short(m) }, a = wallet.W.address, mine = balUi(m);
  const q = T.quote, busy = T.pend.has(m);
  box.innerHTML = `<div class="seg w"><button data-side="buy" class="${T.side === 'buy' ? 'on' : ''}">Buy</button><button data-side="sell" class="${T.side === 'sell' ? 'on' : ''}">Sell</button></div>
    ${T.side === 'buy' ? `<span class="k">Amount in SOL</span><div class="chips">${QB.map(v => `<button data-amt="${v}" class="${T.amt === v ? 'on' : ''}">${v}</button>`).join('')}</div>
      <input class="search" id="cdAmt" inputmode="decimal" placeholder="Amount in SOL" value="${T.amt != null && !QB.includes(T.amt) ? T.amt : ''}">`
    : `<div class="chips">${[25, 50, 75, 100].map(v => `<button data-pct="${v}" class="${T.sellPct === v ? 'on' : ''}">${v}%</button>`).join('')}</div><p class="muted sm" style="margin:8px 0 0">You hold ${mine ? amt(mine) + ' $' + esc(t.sym) : 'none'}.</p>`}
    <div class="qt">${q ? q.err ? `<span class="dn">${esc(q.err)}</span>` : `<span>You get ≈ <b>${q.side === 'buy' ? amt(+q.outAmount / 10 ** (t.dec ?? 6)) + ' $' + esc(t.sym) : solf(+q.outAmount / 1e9)}</b></span><span class="muted">impact ${fin(+q.priceImpactPct) ? (Math.abs(+q.priceImpactPct) * (Math.abs(+q.priceImpactPct) < 1 ? 100 : 1)).toFixed(2) + '%' : '—'}</span>` : '<span class="muted">Pick an amount for a live quote.</span>'}</div>
    ${a ? `<button class="cta w" id="cdGo" ${busy ? 'disabled' : ''}><span>${busy ? 'Confirm in your wallet…' : T.side === 'buy' ? `Buy $${esc(t.sym)}${T.amt ? ' · ' + T.amt + ' SOL' : ''}` : `Sell ${T.sellPct}%`}</span></button>` : '<button class="cta w" id="cdConnect"><span>Connect wallet to trade</span></button>'}`;
  $$('[data-side]', box).forEach(b => b.onclick = () => { T.side = b.dataset.side; T.quote = null; trade(); requote(); });
  $$('[data-amt]', box).forEach(b => b.onclick = () => { T.amt = +b.dataset.amt; trade(); requote(); });
  $$('[data-pct]', box).forEach(b => b.onclick = () => { T.sellPct = +b.dataset.pct; trade(); requote(); });
  const ai = $('#cdAmt'); if (ai) ai.oninput = () => { const v = parseFloat(ai.value); T.amt = v > 0 ? v : null; clearTimeout(T.qT); T.qT = setTimeout(() => { requote(); const b = $('#cdGo span'); if (b) b.textContent = `Buy $${t.sym}${T.amt ? ' · ' + T.amt + ' SOL' : ''}`; }, 400); };
  const go = $('#cdGo'); if (go) go.onclick = () => T.side === 'buy' ? (T.amt ? buy(m, T.amt) : toast('Pick a buy amount first.', 'err', 3000)) : sell(m, T.sellPct);
  const cc = $('#cdConnect'); if (cc) cc.onclick = () => T.ctx && T.ctx.connect();
}
async function requote() {
  clearTimeout(T.qT); const m = T.sel, n = ++T.qN; if (!m) return;
  let p;
  if (T.side === 'buy') { if (!T.amt) { T.quote = null; return trade(); } p = { inputMint: SOL_MINT, outputMint: m, amount: String(Math.round(T.amt * 1e9)) }; }
  else { const raw = balRaw(m); if (raw <= 0n) { T.quote = { err: 'You hold none of this coin.' }; return trade(); } p = { inputMint: m, outputMint: SOL_MINT, amount: (T.sellPct >= 100 ? raw : raw * BigInt(T.sellPct) / 100n).toString() }; }
  try { const q = await order(p); if (n !== T.qN) return; T.quote = q && q.outAmount ? { ...q, side: T.side } : { err: (q && (q.errorMessage || q.error)) || 'No route for this trade right now.' }; }
  catch (e) { if (n !== T.qN) return; T.quote = { err: errMsg(e) }; }
  if (T.sel === m) trade();
  if (T.sel === m) T.qT = setTimeout(requote, 10000);
}
// one swap through Jupiter Ultra: an order built for this wallet, signed in the wallet, landed by Jupiter
async function swap(p) {
  const a = wallet.W.address; if (!a) throw new Error('Connect a wallet first.');
  if (!wallet.canSignAll()) throw new Error('This wallet can’t sign swaps here. Try Phantom, Solflare or Backpack.');
  const o = await order({ ...p, taker: a });
  if (!o.transaction) throw new Error(o.errorMessage || o.error || 'No route for this trade right now.');
  const [signed] = await wallet.signAll([b64d(o.transaction)]);
  const r = await execute(b64e(signed), o.requestId);
  if (r.status !== 'Success') throw Object.assign(new Error(r.error || 'The swap failed on chain.'), { sig: r.signature });
  return { sig: r.signature, out: r.outputAmountResult || o.outAmount };
}
function busy(m, on) { T.pend[on ? 'add' : 'delete'](m); if (T.sel === m) trade(); $$(`[data-buy="${m}"]`).forEach(b => b.disabled = on); }
export async function buy(m, s) {
  if (!wallet.W.address) return T.ctx && T.ctx.connect();
  if (T.pend.has(m)) return; const t = T.by.get(m) || { sym: short(m), dec: 6 };
  if (T.hold && T.hold.sol < s + .003) return toast(`Not enough SOL. Your wallet has ${solf(T.hold.sol)}; keep a little for fees.`, 'err', 5000);
  busy(m, true); toast(`Buying $${esc(t.sym)} for ${s} SOL. Confirm in your wallet.`, '', 4000);
  try { const r = await swap({ inputMint: SOL_MINT, outputMint: m, amount: String(Math.round(s * 1e9)) }); toast(`Bought ${amt(+r.out / 10 ** (t.dec ?? 6))} $${esc(t.sym)}. <a class="link" href="${solscan(r.sig)}" target="_blank" rel="noopener">View tx</a>`, 'ok', 9000); }
  catch (e) { toast(esc(errMsg(e)) + (e && e.sig ? ` <a class="link" href="${solscan(e.sig)}" target="_blank" rel="noopener">tx</a>` : ''), 'err', 8000); }
  finally { busy(m, false); setTimeout(hold, 2500); setTimeout(hold, 9000); }
}
async function sell(m, p) {
  if (!wallet.W.address) return T.ctx && T.ctx.connect();
  if (T.pend.has(m)) return; const raw = balRaw(m), t = T.by.get(m) || { sym: short(m) };
  if (raw <= 0n) return toast('You hold none of this coin.', 'err', 3000);
  const n = p >= 100 ? raw : raw * BigInt(p) / 100n; if (n <= 0n) return;
  busy(m, true); toast(`Selling ${p}% of your $${esc(t.sym)}. Confirm in your wallet.`, '', 4000);
  try { const r = await swap({ inputMint: m, outputMint: SOL_MINT, amount: n.toString() }); toast(`Sold ${p}% of $${esc(t.sym)} for ${solf(+r.out / 1e9)}. <a class="link" href="${solscan(r.sig)}" target="_blank" rel="noopener">View tx</a>`, 'ok', 9000); }
  catch (e) { toast(esc(errMsg(e)) + (e && e.sig ? ` <a class="link" href="${solscan(e.sig)}" target="_blank" rel="noopener">tx</a>` : ''), 'err', 8000); }
  finally { busy(m, false); setTimeout(hold, 2500); setTimeout(hold, 9000); }
}

// ---------------------------------------------------------------- the coin's chart (GeckoTerminal), refreshed while open
const pools = {};
async function chart(first) {
  const m = T.sel; if (!m || !$('#cdCv')) return;
  try {
    if (!pools[m]) { const L = await gtPools(m); L.sort((a, b) => b.liq - a.liq); pools[m] = L[0] && L[0].id; }
    if (!pools[m]) throw new Error('no pool');
    const [tf, ag] = TF[T.tf], C = await gtCandles(pools[m], tf, ag, 120);
    if (T.sel !== m || !$('#cdCv')) return;
    draw2(C);
  } catch { if (first) { const e = $('#cdCvE'); if (e) { e.hidden = false; e.textContent = 'The chart shows up once GeckoTerminal indexes this coin, usually within a few minutes.'; } } }
  clearTimeout(chart.t); if (T.sel === m) chart.t = setTimeout(() => chart(false), 15000);
}
function draw2(C) {
  const cv = $('#cdCv'), e = $('#cdCvE'); if (!cv) return;
  if (!C || C.length < 2) { if (e) { e.hidden = false; e.textContent = 'Not enough trades for a chart yet.'; } return; }
  if (e) e.hidden = true;
  const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = r.width * d; cv.height = r.height * d; const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
  const W = r.width, H = r.height, lo = Math.min(...C.map(x => x.l)), hi = Math.max(...C.map(x => x.h)), y = v => 8 + (H - 26) * (1 - (v - lo) / (hi - lo || 1)), bw = Math.max(1.5, W / C.length * .62);
  C.forEach((c, i) => { const x = (i + .5) / C.length * W, up = c.c >= c.o; g.strokeStyle = g.fillStyle = up ? '#5dffa6' : '#ff7b93'; g.beginPath(); g.moveTo(x, y(c.h)); g.lineTo(x, y(c.l)); g.lineWidth = 1; g.stroke(); const t0 = y(Math.max(c.o, c.c)), t1 = y(Math.min(c.o, c.c)); g.fillRect(x - bw / 2, t0, bw, Math.max(1, t1 - t0)); });
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '700 10.5px Inter'; const f = v => '$' + (v >= .01 ? v.toFixed(4) : v.toPrecision(3)); g.fillText(f(hi), 4, 14); g.fillText(f(lo), 4, H - 4);
  const s = $('#cdChS'), last = C[C.length - 1].c, first = C[0].o; if (s) { s.textContent = pct((last / first - 1) * 100, 1) + ' over ' + C.length + ' candles'; s.className = 'sm ' + cls(last - first); }
}
export function onWallet() { hold(); if (T.sel) trade(); }
