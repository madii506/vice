// VICE · the world: the app you enter from the street. Your card and balances on the left, the section in the middle,
// the live city on the right (GTA VI countdown, $TTWO, SOL, the radar of your dead coins, your washes).
import { CONFIG, TIERS, emit, store, $, $$, esc, sol, usd, num, pct, short, solscan, toast, copy, ICON, stars, LAMPORTS } from './core.js';
import * as wallet from './wallet.js';
import * as wash from './wash.js';
import { drawCard, WAYS } from './cardart.js';
import { tokens, gtPools, gtCandles, SOL_MINT } from './rpc.js';

const MAX_RUN = 200, MAX_ROWS = 250;
export const st = { sec: 'wash', scan: null, scanning: false, washing: null, result: null, err: null, tab: 'empty', q: '', sort: 'rent', ttwo: null, solUsd: null, range: '7D',
  card: { name: 'TRENCH RESIDENT', way: 'vice', stars: 5, flip: false, showAmt: true, ...store.get('vice:card', {}) } };
let scene = null; export const bind = s => { scene = s; };
const wide = () => innerWidth >= 760;
const pane = () => $('#pane');

// ---------------------------------------------------------------- shell
export function mount() {
  $$('#tabs button').forEach(b => b.onclick = () => show(b.dataset.sec));
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-sec]'); if (t && !t.closest('#tabs')) { show(t.dataset.sec); if (!wide()) $('#pane').scrollIntoView({ behavior: 'smooth' }); }
  });
  addEventListener('resize', () => { clearTimeout(mount.rt); mount.rt = setTimeout(dock, 120); });
  // the panels slide in: measure the slot again once they've landed
  $('#acct').addEventListener('animationend', () => dock());
  renderAcct(); renderLive(); show(st.sec, true);
}
export function show(sec, quiet) {
  st.sec = sec; $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.sec === sec));
  renderPane();
  if (!quiet) store.set('vice:sec', sec);
}
const SECS = {
  wash: () => washSec(), card: () => cardSec(), wanted: () => wantedSec(), ttwo: () => ttwoSec(), receipts: () => receiptsSec(), faq: () => faqSec(),
};
export function renderPane(keepScroll) {
  const p = pane(); if (!p) return; const y = p.scrollTop;
  const { h, b, bar = '', after: af } = SECS[st.sec]();
  p.innerHTML = `<div class="ph">${h}</div><div class="pb${keepScroll ? '' : ' sec-in'}">${b}</div>${bar}`;
  p.scrollTop = keepScroll ? y : 0;
  af && af();
}
const head = (title, sub, right = '') => `<div><h2><span class="chrome">${esc(title)}</span></h2>${sub ? `<p>${sub}</p>` : ''}</div>${right ? `<div class="r">${right}</div>` : ''}`;

// ---------------------------------------------------------------- the account column (the 3D card docks into the slot)
const lastBack = () => { const h = wallet.W.address ? wash.history(wallet.W.address) : []; return h[0] ? h[0].back : null; };
const cardOpts = () => { const a = lastBack(); return { ...st.card, amount: st.card.showAmt && a ? sol(a, 4) : null }; };
function cardCanvas(o, w = 900) { const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * .631); drawCard(c, { ...o, round: w * .045 }); return c; }
const dirtyOf = s => s ? s.items.filter(i => i.kind !== 'keep').reduce((a, i) => a + i.lamports, 0) : null;
export function renderAcct() {
  const el = $('#acct'); if (!el) return;
  const a = wallet.W.address, s = st.scan, d = dirtyOf(s), clean = a ? wash.washedTotal(a) : 0, t = s && s.tier;
  el.innerHTML = `<div class="slot" id="slot"></div>
  <div class="who"><b>${esc(st.card.name || 'TRENCH RESIDENT')}</b>${a ? `<button class="addr" id="copyAddr" title="Copy address">${esc(short(a))}</button>` : '<span class="addr">not connected</span>'}</div>
  <div class="bals">
    <div class="bal"><span class="k">Dirty</span><div class="big mint">${ICON.sol}${d == null ? '—' : sol(d, 4)}</div></div>
    <div class="bal"><span class="k">Washed</span><div class="big">${ICON.sol}${a ? sol(clean, 4) : '—'}</div></div>
    <div class="bal wide"><div><span class="k">Wallet</span><div class="big" style="font-size:21px">${ICON.sol}${s ? sol(s.balance, 4) : '—'}</div></div><small class="muted sm">${s && st.solUsd ? '≈ ' + usd(s.balance / LAMPORTS * st.solUsd) : ''}</small></div>
  </div>
  <div class="lvl"><div><b>${t ? esc(t.name) : CONFIG.ca ? 'Tourist' : 'Wanted level'}</b><small>${t ? (t.fee ? t.fee + '% wash fee' : 'washes free') : CONFIG.ca ? 'hold $VICE to climb' : 'turns on when $VICE is live'}</small></div>${stars(t ? t.stars : 0)}</div>
  <div class="qa">${a ? `<button class="cta sm" data-sec="wash"><span>${s ? 'Wash my bags' : 'Scan my wallet'}</span></button>` : `<button class="cta sm" id="acctConnect"><span>Connect wallet</span></button>`}
    <button class="ghost dark sm" data-sec="card">Edit card</button><button class="ghost dark sm" id="flipBtn">Flip card</button></div>`;
  if (!wide() || !scene) $('#slot').appendChild(cardCanvas(cardOpts(), 700));
  const ca = $('#copyAddr'); if (ca) ca.onclick = () => copy(a);
  const ac = $('#acctConnect'); if (ac) ac.onclick = connectFlow;
  $('#flipBtn').onclick = () => { if (scene && wide()) scene.flip(); else { const c = $('#slot canvas'); if (c) c.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(180deg)' }, { transform: 'rotateY(360deg)' }], { duration: 900, easing: 'ease-in-out' }); } };
  requestAnimationFrame(dock);
}
// tell the 3D card where the slot is
export function dock() {
  if (!scene || !document.body.classList.contains('world')) return;
  if (!wide()) { scene.dock(null); return; }
  const s = $('#slot'); if (!s) return; const r = s.getBoundingClientRect();
  scene.dock({ x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width * .97 });
}

// ---------------------------------------------------------------- the live column
export function renderLive() {
  const el = $('#live'); if (!el) return;
  el.innerHTML = `<div class="lv"><h4>GTA VI lands <em>live</em></h4><div class="cd" id="lvCd"></div></div>
  <div class="lv"><h4>$TTWO <span id="lvTc"></span></h4><div class="big" id="lvTp">—</div><div class="spark"><canvas id="lvSpark"></canvas></div></div>
  <div class="lv"><h4>SOL</h4><div class="big" id="lvSol">—</div></div>
  <div class="lv radar-box"><h4>Radar <span id="lvHeat" class="muted">idle</span></h4><button class="radar" id="radar" data-sec="wash" aria-label="Your dead coins"><canvas width="400" height="400"></canvas><span class="rlbl" id="rlbl">no heat</span></button></div>
  <div class="lv feed-box"><h4>Your washes</h4><div class="feed" id="feed"></div></div>`;
  tickLive(); prices(); feed(); radarLabel();
}
const p2 = n => String(n).padStart(2, '0');
export function left() { const ms = new Date(CONFIG.gta).getTime() - Date.now(); if (ms <= 0) return null; return { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 }; }
const cdHtml = l => l ? [['d', 'days'], ['h', 'hrs'], ['m', 'min'], ['s', 'sec']].map(([k, n]) => `<div><b>${p2(l[k])}</b><small>${n.toUpperCase()}</small></div>`).join('') : '<div style="grid-column:1/-1"><b>OUT NOW</b></div>';
export function tickLive() {
  const l = left();
  for (const id of ['lvCd', 'ttCd']) { const e = $('#' + id); if (e) e.innerHTML = cdHtml(l); }
  const g = $('#tbGtaT'); if (g) g.textContent = l ? `${l.d ? l.d + (l.d === 1 ? ' DAY ' : ' DAYS ') : ''}${p2(l.h)}:${p2(l.m)}:${p2(l.s)}` : 'OUT NOW';
}
export function prices() {
  const t = st.ttwo;
  if (t && $('#lvTp')) { $('#lvTp').textContent = usd(t.usdPrice); const c = t.stats24h && t.stats24h.priceChange, e = $('#lvTc'); e.textContent = c != null ? pct(c) : ''; e.className = c > 0 ? 'up' : c < 0 ? 'dn' : ''; }
  if (st.solUsd && $('#lvSol')) $('#lvSol').textContent = usd(st.solUsd);
  spark();
}
let sparkData = null;
async function spark() {
  const cv = $('#lvSpark'); if (!cv || cv.getBoundingClientRect().width < 20) return;
  try { if (!sparkData) { sparkData = await candles('7D'); } const c = $('#lvSpark'); if (c && c.getBoundingClientRect().width >= 20) drawLine(c, sparkData, { mini: true }); } catch {}
}
function feed() {
  const el = $('#feed'); if (!el) return; const a = wallet.W.address, h = a ? wash.history(a).slice(0, 4) : [];
  el.innerHTML = h.length ? h.map(x => `<div><span class="muted">${new Date(x.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${x.n} acc</span><b>+${sol(x.back, 4)}</b></div>`).join('')
    : `<div><span class="muted">${a ? 'No washes yet.' : 'Connect to see your washes.'}</span></div>`;
}

// ---------------------------------------------------------------- the radar
let blips = [], heat = false;
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
export function setBlips(s) { blips = s ? s.items.filter(i => i.kind !== 'keep').slice(0, 90).map(i => ({ a: hash(i.pubkey) * 6.283, r: .2 + hash(i.pubkey + 'r') * .68, k: i.kind })) : []; radarLabel(); }
export function setHeat(h, label) { heat = h; const r = $('#radar'); if (r) r.classList.toggle('heat', h); const e = $('#lvHeat'); if (e) e.textContent = label || (h ? 'heat' : 'idle'); radarLabel(); }
function radarLabel() { const n = blips.length, e = $('#rlbl'); if (e) e.textContent = heat ? 'heat' : !wallet.W.address ? 'no heat' : !st.scan ? 'scanning' : !n ? 'clean' : `${n} dead coin${n === 1 ? '' : 's'}`; }
const map = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 600; const g = c.getContext('2d');
  g.fillStyle = '#123f6a'; g.fillRect(0, 0, 600, 600);
  g.fillStyle = '#3b1a70'; g.beginPath(); g.moveTo(80, 0); g.bezierCurveTo(140, 120, 60, 220, 130, 330); g.bezierCurveTo(190, 420, 150, 520, 230, 600); g.lineTo(600, 600); g.lineTo(600, 0); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(70, 470, 46, 80, .4, 0, 6.283); g.fill();
  g.strokeStyle = 'rgba(160,130,230,.55)'; g.lineWidth = 7;
  for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(160 + i * 52, 0); g.lineTo(180 + i * 52, 600); g.stroke(); g.beginPath(); g.moveTo(120, 30 + i * 66); g.lineTo(600, 50 + i * 66); g.stroke(); }
  g.strokeStyle = 'rgba(255,170,220,.7)'; g.lineWidth = 12; g.beginPath(); g.moveTo(150, 0); g.bezierCurveTo(200, 200, 160, 380, 260, 600); g.stroke();
  g.fillStyle = 'rgba(93,255,166,.35)'; [[330, 180, 50, 36], [420, 400, 60, 40], [260, 470, 30, 50]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
  return c;
})();
export function radar(now, R) {
  const cv = $('#radar canvas'); if (!cv || !document.body.classList.contains('world')) return;
  const rg = cv.getContext('2d'), t = now / 1000, S = 400, C = S / 2;
  rg.setTransform(1, 0, 0, 1, 0, 0); rg.clearRect(0, 0, S, S);
  rg.save(); rg.translate(C, C); rg.rotate(R ? 0 : t * .05); rg.drawImage(map, -360, -360, 720, 720); rg.restore();
  rg.fillStyle = 'rgba(23,6,50,.35)'; rg.fillRect(0, 0, S, S);
  const sweep = R ? 0 : (t * (heat ? 3.2 : 1.4)) % 6.283;
  if (rg.createConicGradient) { const cg = rg.createConicGradient(sweep - 1.1, C, C); cg.addColorStop(0, 'rgba(143,246,255,0)'); cg.addColorStop(.17, heat ? 'rgba(255,80,120,.45)' : 'rgba(143,246,255,.4)'); cg.addColorStop(.175, 'rgba(143,246,255,0)'); rg.fillStyle = cg; rg.fillRect(0, 0, S, S); }
  for (const b of blips) {
    let d = (sweep - b.a) % 6.283; if (d < 0) d += 6.283;
    const glow = Math.max(0, 1 - d / 2.2), x = C + Math.cos(b.a) * b.r * C, y = C + Math.sin(b.a) * b.r * C, rr = 8 + glow * 6;
    rg.fillStyle = '#1b0738'; rg.beginPath(); rg.arc(x, y, rr + 3, 0, 6.283); rg.fill();
    rg.fillStyle = b.k === 'dust' ? '#ffd25a' : b.k === 'wsol' ? '#8ff6ff' : '#ff4fb8'; rg.globalAlpha = .55 + glow * .45; rg.beginPath(); rg.arc(x, y, rr, 0, 6.283); rg.fill(); rg.globalAlpha = 1;
  }
  rg.save(); rg.translate(C, C); rg.fillStyle = '#fff'; rg.strokeStyle = '#1b0738'; rg.lineWidth = 6; rg.lineJoin = 'round';
  rg.beginPath(); rg.moveTo(0, -24); rg.lineTo(17, 18); rg.lineTo(0, 9); rg.lineTo(-17, 18); rg.closePath(); rg.stroke(); rg.fill(); rg.restore();
  rg.fillStyle = '#fff'; rg.font = '800 28px Inter, sans-serif'; rg.textAlign = 'center'; rg.fillText('N', C, 40);
}

// ---------------------------------------------------------------- connect
export async function connectFlow() {
  if (wallet.W.address) return;
  if (wallet.W.list.length === 1) { try { await wallet.connect(wallet.W.list[0].name); } catch (e) { toast(esc(e.message || 'The wallet said no.'), 'err'); } return; }
  const m = $('#modal'), list = wallet.W.list;
  $('#mBody').innerHTML = list.length ? `<p class="muted sm" style="margin:0 0 12px">VICE never sees your keys. Your wallet shows every transaction and signs it.</p><div class="wl">${list.map(w => `<button data-wallet="${esc(w.name)}">${w.icon ? `<img src="${esc(w.icon)}" alt="">` : ''}${esc(w.name)}</button>`).join('')}</div>`
    : `<p class="copy" style="font-size:13.5px">No Solana wallet found in this browser. Install <a class="link" href="https://phantom.com" target="_blank" rel="noopener">Phantom</a>, <a class="link" href="https://solflare.com" target="_blank" rel="noopener">Solflare</a> or <a class="link" href="https://backpack.app" target="_blank" rel="noopener">Backpack</a>, or open this page in your wallet’s browser.</p>`;
  $('#mClose').innerHTML = ICON.close; m.hidden = false;
  const done = () => { m.hidden = true; };
  $('#mClose').onclick = done; m.onclick = e => { if (e.target === m) done(); };
  $$('[data-wallet]', m).forEach(b => b.onclick = async () => { try { await wallet.connect(b.dataset.wallet); done(); } catch (e) { toast(esc(e.message || 'The wallet said no.'), 'err'); } });
}

// ---------------------------------------------------------------- scan + wash
export async function scan() {
  if (!wallet.W.address || st.scanning) return;
  st.scanning = true; st.err = null; st.result = null; if (st.sec === 'wash') renderPane();
  emit('heat', { on: true, label: 'scanning' });
  try { st.scan = await wash.scan(wallet.W.address); if (st.scan.solUsd) st.solUsd = st.scan.solUsd; emit('scan', st.scan); }
  catch (e) { st.err = 'Couldn’t read your wallet: ' + (e.message || 'network error'); }
  finally { st.scanning = false; emit('heat', { on: false }); renderAcct(); feed(); if (st.sec === 'wash' || st.sec === 'wanted') renderPane(); }
}
const washer = (fast, n = 7) => `<div class="washer"><span class="knob" style="left:22px"></span><span class="knob k2" style="left:40px"></span><div class="drum${fast ? ' fast' : ''}"><div class="tumble">${
  Array.from({ length: n }, (_, i) => { const a = i / n * 6.283, r = 28 + (i % 2) * 11; return `<b class="${i % 3 ? 'dirty' : ''}" style="left:${47 + Math.cos(a) * r}px;top:${47 + Math.sin(a) * r}px"></b>`; }).join('')
}</div>${Array.from({ length: 5 }, (_, i) => `<span class="bub" style="left:${18 + i * 17}px;bottom:${6 + (i % 2) * 10}px;width:${8 + i % 3 * 4}px;height:${8 + i % 3 * 4}px;animation-delay:${i * .45}s"></span>`).join('')}</div></div>`;
const KIND = { empty: ['Empty', 'close'], dust: ['Dust', 'burn + close'], wsol: ['wSOL', 'unwrap'], keep: ['Kept', ''] };
function washSec() {
  const a = wallet.W.address;
  if (!a) return { h: head('Wash', 'Dead coins in. Clean SOL out. Every token account on Solana locks about 0.002 SOL of rent; close the dead ones and it comes back to you.'),
    b: `<div class="empty">${washer(false)}<div><p class="copy"><b>Connect a wallet and VICE reads every token account you own.</b> Empty ones are just closed. Dust is burned only when you pick it. Your wallet signs everything, in one prompt.</p><button class="cta" id="wConnect"><span>Connect wallet</span></button></div></div>
    <div class="how"><div><b>01 · Scan</b><span>Both token programs, every account, priced by Jupiter.</span></div><div><b>02 · Pick</b><span>Empties are picked for you. Dust only if you say so.</span></div><div><b>03 · Sign once</b><span>Simulated first, then one prompt signs every transaction.</span></div></div>`,
    after: () => { $('#wConnect').onclick = connectFlow; } };
  if (st.washing) return { h: head('Washing', 'Keep this tab open.'), b: `<div class="run">${washer(true, 9)}${stepsView()}</div>` };
  if (st.result) return receiptSec();
  if (st.scanning || !st.scan) return { h: head('Wash', 'Reading your wallet…'), b: `<div class="run">${washer(true)}<div><p class="copy"><b>Reading every token account you own…</b><br><span class="muted">Classic and Token-2022, priced by Jupiter.</span></p>${st.err ? `<div class="err">${esc(st.err)}</div><button class="ghost sm" id="rescan">Try again</button>` : ''}</div></div>`,
    after: () => { const r = $('#rescan'); if (r) r.onclick = scan; if (!st.scan && !st.scanning && !st.err) setTimeout(scan, 0); } };
  const s = st.scan, G = { empty: [], wsol: [], dust: [], keep: [] }; s.items.forEach(i => G[i.kind].push(i));
  const dirty = dirtyOf(s), picked = s.items.filter(i => i.pick), run = picked.slice().sort((x, y) => y.lamports - x.lamports).slice(0, MAX_RUN), q = wash.quote(s, run);
  const refresh = `<button class="ghost dark sm" id="rescan">Rescan</button>`;
  if (!G.empty.length && !G.dust.length && !G.wsol.length) return { h: head('Wash', `${esc(short(a))} · scanned ${new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, refresh),
    b: `<div class="empty">${washer(false)}<div><p class="copy"><b>Squeaky clean.</b> No dead token accounts in this wallet.${G.keep.length ? ` ${G.keep.length} account${G.keep.length > 1 ? 's' : ''} you still use.` : ''}</p></div></div>`, after: () => { $('#rescan').onclick = scan; } };
  const tabs = [['empty', 'Empty', G.empty.length], ['dust', 'Dust', G.dust.length], ['wsol', 'wSOL', G.wsol.length], ['keep', 'Kept', G.keep.length]].filter(t => t[2]);
  if (!tabs.find(t => t[0] === st.tab)) st.tab = tabs[0][0];
  const qq = st.q.trim().toLowerCase();
  let list = G[st.tab].filter(i => !qq || (i.sym || '').toLowerCase().includes(qq) || (i.name || '').toLowerCase().includes(qq) || i.mint.toLowerCase().includes(qq));
  list = list.slice().sort(st.sort === 'name' ? (x, y) => String(x.sym || x.mint).localeCompare(String(y.sym || y.mint)) : st.sort === 'value' ? (x, y) => (y.usd || 0) - (x.usd || 0) : (x, y) => y.lamports - x.lamports);
  const allOn = list.length && list.every(i => i.pick);
  return {
    h: head('Wash', `${esc(short(a))} · scanned ${new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, refresh),
    b: `<div class="tiles">
      <div class="tile hl" style="--n:0"><span class="k">Dirty SOL found</span><div class="big mint">${ICON.sol}${sol(dirty, 4)}</div><small>${s.solUsd ? '≈ ' + usd(dirty / LAMPORTS * s.solUsd) : '&nbsp;'}</small></div>
      <div class="tile" style="--n:1"><span class="k">Dead accounts</span><div class="big">${num(G.empty.length + G.dust.length + G.wsol.length, 0)}</div><small>${G.empty.length} empty · ${G.dust.length} dust${G.wsol.length ? ' · ' + G.wsol.length + ' wSOL' : ''}</small></div>
      <div class="tile" style="--n:2"><span class="k">Picked</span><div class="big">${num(picked.length, 0)}</div><small>${sol(picked.reduce((x, i) => x + i.lamports, 0), 4)} SOL of rent</small></div>
      <div class="tile" style="--n:3"><span class="k">You get</span><div class="big mint">${ICON.sol}${sol(Math.max(0, q.back), 4)}</div><small>${picked.length > MAX_RUN ? `this round of ${MAX_RUN}` : 'after the network fee'}</small></div>
    </div>
    <div class="toolbar"><div class="seg">${tabs.map(([k, l, n]) => `<button data-tab="${k}" class="${st.tab === k ? 'on' : ''}">${l}<em>${num(n, 0)}</em></button>`).join('')}</div>
      <input class="search" id="q" placeholder="Search token or mint" value="${esc(st.q)}" autocomplete="off" spellcheck="false">
      <select class="search" id="sort" aria-label="Sort"><option value="rent" ${st.sort === 'rent' ? 'selected' : ''}>Most rent</option><option value="value" ${st.sort === 'value' ? 'selected' : ''}>Value</option><option value="name" ${st.sort === 'name' ? 'selected' : ''}>Name</option></select>
      ${st.tab !== 'keep' && list.length ? `<button class="ghost dark sm" id="pickAll">${allOn ? 'Unpick all' : st.tab === 'dust' ? 'Pick all dust' : 'Pick all'}</button>` : ''}</div>
    ${st.tab === 'dust' ? '<p class="muted sm" style="margin:0 0 6px">Dust is burned, then its account is closed. Burned tokens are gone for good, so dust is never picked for you.</p>' : ''}
    ${st.tab === 'keep' ? '<p class="muted sm" style="margin:0 0 6px">These stay. Anything worth $1 or more, NFTs, stablecoins, $VICE and $TTWO are never washed.</p>' : ''}
    <table class="tbl"><thead><tr><th></th><th>Token</th><th class="hide-m">Type</th><th class="num hide-m">Balance</th><th class="num hide-m">Value</th><th class="num">Rent back</th></tr></thead>
    <tbody>${list.slice(0, MAX_ROWS).map((it, n) => rowView(it, n)).join('')}</tbody></table>
    ${list.length > MAX_ROWS ? `<div class="more">Showing ${MAX_ROWS} of ${num(list.length, 0)}. Each wash takes up to ${MAX_RUN} accounts; the rest wait for the next round.</div>` : ''}`,
    bar: `<div class="bar"><div class="lines"><span>Picked <b>${num(picked.length, 0)}</b></span>${q.pct ? `<span>Fee ${q.pct}% <b>−${sol(q.fee, 5)}</b></span>` : '<span>VICE fee <b>none</b></span>'}<span>Network ≈ <b>−${sol(q.network, 6)}</b> · ${q.txs} tx</span></div>
      <button class="cta" id="doWash" ${run.length ? '' : 'disabled'}><span>${run.length ? `Wash ${picked.length > MAX_RUN ? MAX_RUN + ' of ' + num(picked.length, 0) : run.length} · get ${sol(Math.max(0, q.back), 4)} SOL` : 'Pick accounts to wash'}</span></button></div>`,
    after: washAfter,
  };
}
function rowView(it, n) {
  const nm = it.sym || short(it.mint), [kl, act] = KIND[it.kind];
  const ic = it.icon ? `<img src="${esc(it.icon)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc((it.sym || '?').slice(0, 3));
  return `<tr class="rw ${it.pick ? 'pick' : ''} ${it.kind === 'keep' ? 'keep' : ''}" data-acc="${esc(it.pubkey)}" style="--n:${Math.min(n, 24)}">
    <td><span class="ck">${ICON.check}</span></td>
    <td><div class="tkn"><span class="tk">${ic}</span><div><b>${esc(nm)}</b><small>${esc(short(it.mint))}</small></div></div></td>
    <td class="hide-m"><span class="badge b-${it.kind}">${kl}</span>${it.program === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' ? '<span class="badge b-22">2022</span>' : ''}<div class="muted" style="font-size:11px;margin-top:3px">${esc(it.failed || it.why || act)}</div></td>
    <td class="num hide-m">${it.raw === '0' ? '0' : num(it.ui)}</td>
    <td class="num hide-m">${it.usd == null ? (it.raw === '0' ? '—' : 'no price') : usd(it.usd)}</td>
    <td class="num rent">${it.kind === 'keep' ? '' : '+' + sol(it.lamports, 5)}</td></tr>`;
}
function washAfter() {
  const r = $('#rescan'); if (r) r.onclick = () => { st.result = null; scan(); };
  $$('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; renderPane(); });
  const q = $('#q'); if (q) q.oninput = () => { st.q = q.value; renderPane(true); const n = $('#q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  const so = $('#sort'); if (so) so.onchange = () => { st.sort = so.value; renderPane(true); };
  const pa = $('#pickAll'); if (pa) pa.onclick = () => {
    const qq = st.q.trim().toLowerCase(), list = st.scan.items.filter(i => i.kind === st.tab && (!qq || (i.sym || '').toLowerCase().includes(qq) || i.mint.toLowerCase().includes(qq)));
    const on = !list.every(i => i.pick); list.forEach(i => i.pick = on); renderPane(true); emit('scan', st.scan);
  };
  $$('tr[data-acc]').forEach(tr => tr.onclick = () => { const it = st.scan.items.find(i => i.pubkey === tr.dataset.acc); if (!it || it.kind === 'keep') return; it.pick = !it.pick; renderPane(true); emit('scan', st.scan); });
  const go = $('#doWash'); if (go) go.onclick = runWash;
}
const STEPS = [['sim', 'Simulate every transaction'], ['sign', 'Sign in your wallet'], ['send', 'Send to Solana'], ['confirm', 'Confirm']];
function stepsView() {
  const w = st.washing, idx = STEPS.findIndex(s => s[0] === (w.stage === 'build' ? 'sim' : w.stage));
  return `<div id="wsteps"><ul class="steps">${STEPS.map(([k, l], i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}"><i>${i < idx ? ICON.check : ''}</i>${l}${i === idx && w.info && w.info.of ? ` <span class="muted">· ${w.info.done ?? w.info.i ?? 0}/${w.info.of}</span>` : ''}</li>`).join('')}</ul>
  <p class="muted sm" style="margin-top:16px">${w.stage === 'sign' ? (wallet.canSignAll() ? 'Check your wallet: one prompt signs every transaction.' : 'Check your wallet: approve each transaction.') : 'Nothing is sent until your wallet signs.'}</p></div>`;
}
async function runWash() {
  const s = st.scan, run = s.items.filter(i => i.pick).sort((x, y) => y.lamports - x.lamports).slice(0, MAX_RUN); if (!run.length) return;
  st.washing = { stage: 'build', info: {} }; renderPane(); emit('heat', { on: true, label: 'washing' });
  try {
    const r = await wash.wash(s, run, (stage, info) => { st.washing = { stage, info }; if (st.sec === 'wash') { const b = $('#wsteps'); if (b) b.outerHTML = stepsView(); else renderPane(); } });
    st.result = r; st.washing = null;
    if (r.sigs.length) emit('washed', r); else toast('Nothing landed. Your wallet is unchanged.', 'err');
  } catch (e) {
    st.washing = null; const m = String(e && e.message || e);
    toast(/reject|cancel|denied|declined|closed/i.test(m) ? 'Cancelled in your wallet. Nothing was sent.' : esc(m), 'err', 7000);
  } finally {
    emit('heat', { on: false }); if (st.sec === 'wash') renderPane(); renderAcct(); feed();
    if (st.result && st.result.sigs.length) setTimeout(quietRescan, 2500);
  }
}
async function quietRescan() { try { st.scan = await wash.scan(wallet.W.address); emit('scan', st.scan); renderAcct(); } catch {} }
function receiptSec() {
  const r = st.result;
  return { h: head('Washed', `${r.closed} account${r.closed === 1 ? '' : 's'} closed${r.dust ? ` · ${r.dust} dust burned` : ''}`, '<button class="ghost dark sm" id="again">Scan again</button>'),
    b: `<div class="rcpt"><div class="box"><span class="k">Clean SOL back in your wallet</span><div class="big mint" style="font-size:46px">${ICON.sol}${sol(r.back, 4)}</div><p class="muted sm" style="margin:6px 0 0">${st.solUsd ? '≈ ' + usd(r.back / LAMPORTS * st.solUsd) + ' · ' : ''}${r.fee ? 'fee ' + sol(r.fee, 6) + ' SOL' : 'no VICE fee'}</p>
      <div class="acts"><button class="cta sm" data-sec="card"><span>Make your card</span></button><button class="ghost dark sm" id="share">Post on X</button></div></div>
      <div class="box"><span class="k">Transactions</span>${r.sigs.map((s, i) => `<div class="tx"><span class="muted">#${i + 1} confirmed</span><a class="link" href="${solscan(s)}" target="_blank" rel="noopener">${esc(short(s))} ${ICON.ext}</a></div>`).join('')}
      ${r.failedSigs.length ? `<div class="err">${r.failedSigs.length} transaction${r.failedSigs.length > 1 ? 's' : ''} failed on chain. Nothing in them changed.</div>` : ''}
      ${r.pending.length ? `<div class="err">${r.pending.length} still unconfirmed. Check your wallet in a minute, then scan again.</div>` : ''}
      ${r.dropped ? `<p class="muted sm">${r.dropped} account${r.dropped > 1 ? 's' : ''} couldn’t be closed and ${r.dropped > 1 ? 'were' : 'was'} left alone.</p>` : ''}</div></div>`,
    after: () => { $('#again').onclick = () => { st.result = null; scan(); }; $('#share').onclick = () => postX(sol(r.back, 4)); } };
}

// ---------------------------------------------------------------- card studio
let cardT = 0;
function cardSec() {
  const c = st.card, a = lastBack();
  return { h: head('Card', 'Your VICE card. Name it, pick a colour, set your stars. It’s a meme: it can’t pay for anything.'),
    b: `<div class="studio"><div class="pv" id="pv"></div><div>
      <div class="field"><span class="k">Name on the card</span><input class="inp" id="cName" maxlength="22" value="${esc(c.name)}" autocomplete="off" spellcheck="false"></div>
      <div class="field"><span class="k">Colour</span><div class="sw">${Object.entries(WAYS).map(([k, w]) => `<button data-way="${k}" class="${c.way === k ? 'on' : ''}" title="${w.name}" style="background:linear-gradient(135deg,${w.base.join(',')})"></button>`).join('')}</div></div>
      <div class="field"><span class="k">Wanted level</span><div class="starpick">${[1, 2, 3, 4, 5].map(n => `<button data-st="${n}" class="${n <= c.stars ? 'on' : ''}" aria-label="${n} stars">${ICON.star}</button>`).join('')}</div></div>
      <div class="field"><span class="k">Layout</span><div class="seg"><button data-flip="0" class="${c.flip ? '' : 'on'}">Sun right</button><button data-flip="1" class="${c.flip ? 'on' : ''}">Sun left</button></div></div>
      ${a ? `<div class="field"><span class="k">Your last wash</span><div class="seg"><button data-amt="1" class="${c.showAmt ? 'on' : ''}">Show ${sol(a, 4)} SOL</button><button data-amt="0" class="${c.showAmt ? '' : 'on'}">Hide</button></div></div>` : ''}
      <div class="acts"><button class="cta sm" id="savePng"><span>Save PNG</span></button><button class="ghost dark sm" id="postX">Post on X</button></div></div></div>`,
    after: () => {
      const cv = cardCanvas(cardOpts(), 1100); $('#pv').appendChild(cv);
      const redraw = () => { store.set('vice:card', st.card); drawCard(cv, { ...cardOpts(), round: 1100 * .045 }); clearTimeout(cardT); cardT = setTimeout(() => { if (scene) scene.setCard(cardOpts()); renderAcctLite(); }, 260); };
      $('#cName').oninput = e => { st.card.name = e.target.value.toUpperCase().slice(0, 22); redraw(); };
      $$('[data-way]').forEach(b => b.onclick = () => { st.card.way = b.dataset.way; $$('[data-way]').forEach(x => x.classList.toggle('on', x === b)); redraw(); });
      $$('[data-st]').forEach(b => b.onclick = () => { st.card.stars = +b.dataset.st; $$('[data-st]').forEach(x => x.classList.toggle('on', +x.dataset.st <= st.card.stars)); redraw(); });
      $$('[data-flip]').forEach(b => b.onclick = () => { st.card.flip = b.dataset.flip === '1'; $$('[data-flip]').forEach(x => x.classList.toggle('on', x === b)); redraw(); });
      $$('[data-amt]').forEach(b => b.onclick = () => { st.card.showAmt = b.dataset.amt === '1'; $$('[data-amt]').forEach(x => x.classList.toggle('on', x === b)); redraw(); });
      $('#savePng').onclick = savePng; $('#postX').onclick = () => postX(cardOpts().amount);
    } };
}
function renderAcctLite() { const b = $('#acct .who b'); if (b) b.textContent = st.card.name || 'TRENCH RESIDENT'; const c = $('#slot canvas'); if (c) drawCard(c, { ...cardOpts(), round: c.width * .045 }); }
function poster() {
  const W = 1600, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); [[0, '#18c2e4'], [.35, '#8cd2ee'], [.55, '#c3bde2'], [.72, '#f4a7cf'], [.88, '#ffc5b3'], [1, '#fdeede']].forEach(([o, s]) => gr.addColorStop(o, s));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const cw = 1180, card = cardCanvas(cardOpts(), cw);
  g.save(); g.translate(W / 2, H / 2); g.rotate(-.06); g.shadowColor = 'rgba(27,7,56,.45)'; g.shadowBlur = 60; g.shadowOffsetY = 34; g.drawImage(card, -cw / 2, -card.height / 2); g.restore();
  return c;
}
function savePng() { poster().toBlob(b => { const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'vice-card.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Saved vice-card.png', 'ok', 2500); }, 'image/png'); }
export function postX(amt) {
  const t = amt ? `Just washed ${amt} SOL out of my dead coins. Clean money now.\n\nWelcome to Vice. $VICE` : `Got my VICE card. Dirty bags only.\n\nWelcome to Vice. $VICE`;
  window.open(`https://x.com/intent/post?text=${encodeURIComponent(t + '\n' + location.origin)}`, '_blank', 'noopener');
}

// ---------------------------------------------------------------- wanted
function wantedSec() {
  const s = st.scan, me = s && s.tier ? s.tier.stars : null, bal = s && s.vice != null ? s.vice : null;
  return { h: head('Wanted', 'Your wanted level is how much $VICE you hold. More stars, smaller cut when you wash. Five stars wash free.'),
    b: `<div class="ladder">${TIERS.map((t, n) => { const nx = TIERS[n + 1], pctTo = bal == null ? 0 : !t.min ? 100 : Math.min(100, bal / t.min * 100);
      return `<div class="tier ${me === t.stars ? 'me' : ''}" style="--n:${n}">${stars(t.stars)}<span><b>${esc(t.name)}</b><small>${t.min ? num(t.min, 0) + '+ $VICE' : 'No $VICE'}${nx ? '' : ' · the top'}</small></span><span class="meter"><i style="width:${pctTo}%"></i></span><span class="fee ${t.fee ? '' : 'free'}">${t.fee ? t.fee + '%' : 'FREE'}</span></div>`; }).join('')}</div>
    <div class="box" style="margin-top:14px">${CONFIG.ca ? (s ? `<span class="k">You hold</span><div class="big">${num(bal || 0)} <small>$VICE</small></div>` : '<p class="muted sm" style="margin:0">Connect and scan to read your level.</p>')
      : `<p class="muted sm" style="margin:0">Levels read from your $VICE balance once $VICE is live.${CONFIG.treasury ? '' : ' Until then, washing has no VICE fee at all.'}</p>`}
      <p class="muted sm" style="margin:8px 0 0">The fee goes to the VICE treasury, which buys back $VICE.</p>
      ${CONFIG.ca ? `<div class="acts"><a class="cta sm" href="https://pump.fun/coin/${esc(CONFIG.ca)}" target="_blank" rel="noopener"><span>Buy $VICE</span></a><button class="ghost dark sm" id="copyCa">Copy CA</button></div>` : ''}</div>`,
    after: () => { const c = $('#copyCa'); if (c) c.onclick = () => copy(CONFIG.ca); } };
}

// ---------------------------------------------------------------- $TTWO
let pool = null; const cache = {};
async function candles(key) {
  if (cache[key]) return cache[key];
  if (!pool) { const ps = await gtPools(CONFIG.ttwo); ps.sort((a, b) => b.liq - a.liq); pool = ps[0] && ps[0].id; }
  if (!pool) throw new Error('no pool');
  const [tf, agg, lim] = key === '1D' ? ['minute', 15, 96] : key === '7D' ? ['hour', 1, 168] : ['hour', 4, 180];
  return (cache[key] = await gtCandles(pool, tf, agg, lim));
}
function ttwoSec() {
  const t = st.ttwo, ch = t && t.stats24h && t.stats24h.priceChange;
  return { h: head('$TTWO', 'Take-Two Interactive, tokenized by Backpack, on Solana. The stock behind GTA, and $VICE’s pair on pump.fun.'),
    b: `<div class="tt"><div>
      <div class="px"><div class="big">${t && t.usdPrice != null ? usd(t.usdPrice) : '—'}</div>${ch != null ? `<b class="${ch >= 0 ? 'up' : 'dn'}">${pct(ch)} 24h</b>` : ''}</div>
      <div class="chart"><canvas id="tChart"></canvas></div>
      <div class="seg">${['1D', '7D', '30D'].map(r => `<button data-rng="${r}" class="${st.range === r ? 'on' : ''}">${r}</button>`).join('')}</div>
      <p class="copy" style="margin-top:16px">$VICE launches on pump.fun paired with $TTWO: its curve is priced in TTWO, the tokenized stock of Take-Two, the publisher behind GTA. When GTA moves the stock, the stock moves the pair.</p>
      <p class="sm"><a class="link" href="https://jup.ag/tokens/${CONFIG.ttwo}" target="_blank" rel="noopener">TTWO on Jupiter ${ICON.ext}</a> &nbsp; <a class="link" href="${solscan(CONFIG.ttwo, 'token')}" target="_blank" rel="noopener">Solscan ${ICON.ext}</a></p>
    </div><div>
      <div class="kv"><div><span class="k">Liquidity</span><b>${t ? usd(t.liquidity) : '—'}</b></div><div><span class="k">Holders</span><b>${t && t.holderCount ? num(t.holderCount, 1) : '—'}</b></div></div>
      <div class="box" style="margin-top:10px"><span class="k" style="margin-bottom:8px">GTA VI lands in</span><div class="cd" id="ttCd"></div></div>
      <p class="muted sm" style="margin-top:12px">VICE is not affiliated with Take-Two Interactive, Rockstar Games or Backpack.</p>
    </div></div>`,
    after: () => { $$('[data-rng]').forEach(b => b.onclick = () => { st.range = b.dataset.rng; $$('[data-rng]').forEach(x => x.classList.toggle('on', x === b)); chart(); }); chart(); tickLive(); } };
}
async function chart() {
  const key = st.range;
  try { const c = await candles(key); const cv = $('#tChart'); if (cv && st.range === key) drawLine(cv, c, {}); }
  catch { const cv = $('#tChart'); if (cv) { const g = cv.getContext('2d'); size(cv); g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '700 12px Inter'; g.fillText('Chart offline right now', 8, 20); } }
}
const size = cv => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d); cv.getContext('2d').setTransform(d, 0, 0, d, 0, 0); return r; };
function drawLine(cv, c, { mini }) {
  const r = size(cv), g = cv.getContext('2d'), W = r.width, H = r.height; if (!c.length) return;
  const lo = Math.min(...c.map(x => x.l)), hi = Math.max(...c.map(x => x.h)), pad = mini ? 4 : 10, y = v => pad + (H - pad * 2 - (mini ? 0 : 12)) * (1 - (v - lo) / (hi - lo || 1)), x = i => i / (c.length - 1) * W;
  const up = c[c.length - 1].c >= c[0].o, col = up ? '#5dffa6' : '#ff7b93';
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, up ? 'rgba(93,255,166,.32)' : 'rgba(255,123,147,.32)'); gr.addColorStop(1, 'rgba(255,79,184,0)');
  g.beginPath(); c.forEach((p, i) => i ? g.lineTo(x(i), y(p.c)) : g.moveTo(0, y(p.c))); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fillStyle = gr; g.fill();
  g.beginPath(); c.forEach((p, i) => i ? g.lineTo(x(i), y(p.c)) : g.moveTo(0, y(p.c))); g.strokeStyle = col; g.lineWidth = mini ? 1.8 : 2.4; g.lineJoin = 'round'; g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(W - 3, y(c[c.length - 1].c), mini ? 3 : 4.5, 0, 6.283); g.fill();
  if (!mini) { g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '700 11px Inter'; g.fillText(usd(hi), 4, 14); g.fillText(usd(lo), 4, H - 4); }
  cv.parentElement.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: mini ? 700 : 1000, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
export async function loadPrices() {
  try {
    const d = await tokens([CONFIG.ttwo, SOL_MINT]), t = d[CONFIG.ttwo], s = d[SOL_MINT];
    if (s && s.usdPrice) st.solUsd = s.usdPrice;
    if (t && t.usdPrice != null) st.ttwo = t;
    prices(); emit('prices', st);
    if (st.sec === 'ttwo' && document.body.classList.contains('world') && !document.activeElement.closest('#pane')) renderPane(true);
  } catch {}
}

// ---------------------------------------------------------------- receipts
function receiptsSec() {
  const a = wallet.W.address, h = a ? wash.history(a) : [];
  return { h: head('Receipts', 'Every wash this browser did for your wallet, with a link to each transaction.'),
    b: !a ? `<p class="copy">Connect to see your washes.</p><button class="cta" id="rConnect"><span>Connect wallet</span></button>`
      : !h.length ? `<div class="empty">${washer(false)}<div><p class="copy"><b>No washes yet.</b> Your first one shows up here.</p><button class="cta" data-sec="wash"><span>Wash my bags</span></button></div></div>`
      : `<div class="tiles"><div class="tile hl"><span class="k">Washed in total</span><div class="big mint">${ICON.sol}${sol(wash.washedTotal(a), 4)}</div></div><div class="tile"><span class="k">Washes</span><div class="big">${h.length}</div></div><div class="tile"><span class="k">Accounts closed</span><div class="big">${num(h.reduce((x, y) => x + y.n, 0), 0)}</div></div><div class="tile"><span class="k">Last</span><div class="big" style="font-size:20px">${new Date(h[0].at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div></div></div>
        <table class="tbl"><thead><tr><th>When</th><th>Accounts</th><th class="num">Back</th><th>Transactions</th></tr></thead><tbody>${h.map((x, n) => `<tr style="--n:${n}" class="rw"><td style="width:auto">${new Date(x.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td>${x.n}</td><td class="num rent">+${sol(x.back, 4)}</td><td>${x.sigs.map((s, i) => `<a class="link" href="${solscan(s)}" target="_blank" rel="noopener">tx${x.sigs.length > 1 ? ' ' + (i + 1) : ''}</a>`).join(' · ')}</td></tr>`).join('')}</tbody></table>`,
    after: () => { const c = $('#rConnect'); if (c) c.onclick = connectFlow; } };
}

// ---------------------------------------------------------------- faq
const QA = [
  ['What does VICE do?', 'It finds the dead coins in your wallet and closes their token accounts. Solana makes every token account lock about 0.002 SOL of rent; closing one sends that SOL back to you. Dead coins become clean SOL.'],
  ['Is it safe?', 'Your wallet signs everything. VICE builds the transactions in your browser, simulates them first and shows them to your wallet; it never sees a key and never holds your coins. Empty accounts are only closed. Dust is burned only when you pick it, and anything worth $1 or more, NFTs, stablecoins, $VICE and $TTWO are never touched.'],
  ['What is dust?', 'Tokens worth less than $1 that nobody will buy. To close an account it has to be empty, so dust gets burned first. Burned tokens are gone for good, which is why dust is never picked for you.'],
  ['How much do I get back?', 'About 0.002 SOL for each token account: 0.00204 for a classic one, often a little less or more for Token-2022. Wallets that ape a lot hold dozens, hundreds, sometimes thousands of them.'],
  ['What does it cost?', CONFIG.treasury ? 'The Solana network fee, and a cut set by your wanted level: 10% with no $VICE, down to free at five stars. The cut goes to the VICE treasury, which buys back $VICE.' : 'Only the Solana network fee, a fraction of a cent per transaction. No VICE fee is taken right now.'],
  ['Why only 200 at a time?', 'Big wallets can hold thousands of dead accounts. VICE washes up to 200 per round, about ten transactions in one wallet prompt, so every round is quick to sign and easy to check.'],
  ['What are the stars?', 'Your wanted level: how much $VICE you hold. More stars, smaller cut. Five stars wash free.'],
  ['Why $TTWO?', '$VICE launches on pump.fun paired with TTWO, the tokenized Take-Two stock on Solana. Take-Two publishes GTA, and GTA VI lands on 11/19, the date on the card.'],
  ['Is the card real?', 'No. The card is a meme. It can’t pay for anything. The washing is real. VICE is not affiliated with Rockstar Games, Take-Two Interactive or Backpack.'],
];
function faqSec() {
  return { h: head('FAQ'), b: `<div class="faq">${QA.map(([q, a], i) => `<details ${i ? '' : 'open'}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
    <div class="keys"><span><kbd>W</kbd>wash</span><span><kbd>C</kbd>card</span><span><kbd>S</kbd>stars</span><span><kbd>T</kbd>$TTWO</span><span><kbd>R</kbd>receipts</span><span><kbd>F</kbd>flip</span><span><kbd>Esc</kbd>back to the street</span></div>` };
}
