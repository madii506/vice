// VICE · the home screen: the world, the card, the HUD, the radar, the chips and the tape. Everything else lives on the phone.
import { CONFIG, on, emit, $, $$, esc, sol, usd, pct, short, ICON, stars, reduced, store, copy, toast, LAMPORTS, sleep } from './core.js';
import { startWorld } from './world.js';
import { drawCard, WAYS } from './cardart.js';
import { tokens, SOL_MINT } from './rpc.js';
import * as wallet from './wallet.js';
import * as P from './panels.js';

const R = reduced();
const fonts = Promise.race([Promise.all(['400 40px Anton', '700 20px Inter', '800 20px Inter'].map(f => document.fonts.load(f))), sleep(1500)]).catch(() => {});
await fonts;
const world = startWorld($('#world'), { reduced: R });

// ---------------------------------------------------------------- the card: 3D when the browser can, a floating 2D card when it can't
let scene = null;
const saved = store.get('vice:card', null);
try {
  const m = await import('./scene.js?v=1');
  scene = m.startScene($('#card3d'), { reduced: R, card: saved ? { way: saved.way, stars: saved.stars, flip: saved.flip, name: saved.name } : {} });
} catch (e) {
  console.warn('3D off:', e && e.message);
  $('#card3d').hidden = true; const box = $('#card2d'); box.hidden = false;
  const c = document.createElement('canvas'); c.width = 1100; c.height = 694; drawCard(c, { ...(saved || {}), round: 50 }); box.appendChild(c);
}
P.bind(scene);
$('#card3d').addEventListener('vice:way', e => { P.st.card.way = e.detail; store.set('vice:card', P.st.card); });

// ---------------------------------------------------------------- the intro: the sky lifts, the city rises, the card drops, the HUD lands
$$('#title i').forEach((el, i) => el.style.setProperty('--w', i));
requestAnimationFrame(() => requestAnimationFrame(() => { document.body.classList.remove('intro'); document.body.classList.add('go'); }));
setTimeout(() => document.body.classList.remove('go'), 4200);

// ---------------------------------------------------------------- HUD: wanted stars and the dirty money counter
const hs = $('#hudStars');
let tier = 0;
function drawStars(n, flash) {
  hs.innerHTML = stars(n); $$('i', hs).forEach((el, i) => el.style.setProperty('--i', i));
  hs.classList.toggle('flash', !!flash);
}
drawStars(0);
setTimeout(() => { if (!R) { drawStars(0, true); setTimeout(() => drawStars(tier), 1500); } }, 1500);
$('#hudMoney .cur').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#1b0738" stroke-width="6.5"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.8"/><circle cx="12" cy="12" r="4.4" fill="currentColor" stroke="#1b0738" stroke-width="2"/></svg>';
let shown = null, rollT = 0;
function money(lamports, tag) {
  const el = $('#money'), from = shown == null ? 0 : shown, to = lamports, t0 = performance.now(), dur = R ? 1 : 1200;
  $('#hudTag').textContent = tag;
  $('#hudMoney').classList.toggle('clean', tag !== 'dirty sol');
  clearInterval(rollT);
  const stepf = () => { const u = Math.min(1, (performance.now() - t0) / dur), v = from + (to - from) * (1 - Math.pow(1 - u, 3)); el.textContent = sol(v, 4); if (u >= 1) clearInterval(rollT); };
  rollT = setInterval(stepf, 33); stepf(); shown = to;
}
function plus(lamports) { const el = $('#hudPlus'); el.textContent = '+' + sol(lamports, 4); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }

on('scan', s => {
  if (!s) { shown = null; $('#money').textContent = '— — —'; $('#hudTag').textContent = 'dirty sol'; tier = 0; drawStars(0); blips = []; radarLabel(); return; }
  const dirty = s.items.filter(i => i.kind !== 'keep').reduce((a, i) => a + i.lamports, 0);
  money(dirty, 'dirty sol');
  if (s.tier && s.tier.stars !== tier) { tier = s.tier.stars; drawStars(tier, true); setTimeout(() => drawStars(tier), 1100); }
  setBlips(s); radarLabel();
});
on('heat', h => {
  world.heat(h); $('#radar').classList.toggle('heat', h); hs.classList.toggle('wanted', h); if (h) drawStars(Math.max(tier, 0) || 0);
  heat = h; radarLabel();
});
on('washed', r => { plus(r.back); passed(r); });
on('phone', open => { if (!innerWidth || innerWidth >= 760) return; world.pause(open); scene && scene.pause(open); });

// ---------------------------------------------------------------- the radar: your dead coins as blips
const rc = $('#radar canvas'), rg = rc.getContext('2d');
let blips = [], heat = false;
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
function setBlips(s) { blips = s.items.filter(i => i.kind !== 'keep').slice(0, 80).map(i => ({ a: hash(i.pubkey) * 6.283, r: .2 + hash(i.pubkey + 'r') * .68, k: i.kind, p: i.pick })); }
function radarLabel() {
  const n = blips.length; $('#rlbl').textContent = heat ? 'heat' : !wallet.W.address ? 'no heat' : !n ? 'clean' : `${n} dead coin${n === 1 ? '' : 's'}`;
}
// a made-up coast, roads and blocks: a minimap of Vice that slowly turns
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
function radar(now) {
  requestAnimationFrame(radar);
  if (document.hidden) return;
  const t = now / 1000, S = 300, C = S / 2;
  rg.setTransform(1, 0, 0, 1, 0, 0); rg.clearRect(0, 0, S, S);
  rg.save(); rg.translate(C, C); rg.rotate(R ? 0 : t * .05); rg.drawImage(map, -300, -300, 600, 600); rg.restore();
  rg.fillStyle = 'rgba(23,6,50,.35)'; rg.fillRect(0, 0, S, S);
  const sweep = R ? 0 : (t * (heat ? 3.2 : 1.4)) % 6.283;
  if (rg.createConicGradient) {
    const cg = rg.createConicGradient(sweep - 1.1, C, C); cg.addColorStop(0, 'rgba(143,246,255,0)'); cg.addColorStop(.17, heat ? 'rgba(255,80,120,.45)' : 'rgba(143,246,255,.4)'); cg.addColorStop(.175, 'rgba(143,246,255,0)');
    rg.fillStyle = cg; rg.fillRect(0, 0, S, S);
  }
  for (const b of blips) {
    let d = (sweep - b.a) % 6.283; if (d < 0) d += 6.283;
    const glow = Math.max(0, 1 - d / 2.2), x = C + Math.cos(b.a) * b.r * C, y = C + Math.sin(b.a) * b.r * C, rr = 7 + glow * 5;
    rg.fillStyle = '#1b0738'; rg.beginPath(); rg.arc(x, y, rr + 3, 0, 6.283); rg.fill();
    rg.fillStyle = b.k === 'dust' ? '#ffd25a' : b.k === 'wsol' ? '#8ff6ff' : '#ff4fb8'; rg.globalAlpha = .55 + glow * .45; rg.beginPath(); rg.arc(x, y, rr, 0, 6.283); rg.fill(); rg.globalAlpha = 1;
  }
  // you: the arrow in the middle
  rg.save(); rg.translate(C, C); rg.fillStyle = '#fff'; rg.strokeStyle = '#1b0738'; rg.lineWidth = 5; rg.lineJoin = 'round';
  rg.beginPath(); rg.moveTo(0, -18); rg.lineTo(13, 14); rg.lineTo(0, 7); rg.lineTo(-13, 14); rg.closePath(); rg.stroke(); rg.fill(); rg.restore();
  // north tick
  rg.fillStyle = '#fff'; rg.font = '800 22px Inter, sans-serif'; rg.textAlign = 'center'; rg.fillText('N', C, 30);
}
requestAnimationFrame(radar);
radarLabel();

// ---------------------------------------------------------------- chips: GTA VI countdown, $TTWO live, the CA once it exists
const p2 = n => String(n).padStart(2, '0');
function gta() { const l = P.left(); $('#gtaT').textContent = l ? `${l.d ? l.d + (l.d === 1 ? ' DAY ' : ' DAYS ') : ''}${p2(l.h)}:${p2(l.m)}:${p2(l.s)}` : 'OUT NOW'; }
gta(); setInterval(gta, 1000);
let solUsd = null;
async function prices() {
  try {
    const d = await tokens([CONFIG.ttwo, SOL_MINT]), t = d[CONFIG.ttwo], s = d[SOL_MINT];
    if (s && s.usdPrice) solUsd = s.usdPrice;
    if (t && t.usdPrice != null) {
      P.st.ttwo = t; $('#ttwoP').textContent = usd(t.usdPrice);
      const ch = t.stats24h && t.stats24h.priceChange; const c = $('#ttwoC'); c.textContent = ch != null ? pct(ch) : ''; c.className = ch > 0 ? 'up' : ch < 0 ? 'dn' : '';
      if (P.st.app === 'ttwo') P.render();
    }
    tape();
  } catch {}
}
prices(); setInterval(prices, 60000);
if (CONFIG.ca) {
  const c = $('#caChip'); c.hidden = false;
  c.innerHTML = `<span class="k">CA</span><code>${esc(short(CONFIG.ca))}</code><button id="caCopy">Copy</button><a href="https://pump.fun/coin/${esc(CONFIG.ca)}" target="_blank" rel="noopener">Buy</a><a href="https://dexscreener.com/solana/${esc(CONFIG.ca)}" target="_blank" rel="noopener">Chart</a>`;
  $('#caCopy').onclick = () => copy(CONFIG.ca);
}
if (CONFIG.x) { const x = $('#xlink'); x.hidden = false; x.href = CONFIG.x; x.innerHTML = ICON.x; }

// ---------------------------------------------------------------- the tape
function tape() {
  const t = P.st.ttwo, ch = t && t.stats24h && t.stats24h.priceChange;
  const items = ['Dead coins in <em>·</em> clean SOL out', 'Every token account locks <em>0.00204 SOL</em>', 'GTA VI lands <em>11/19</em>',
    t && t.usdPrice != null ? `$TTWO <em>${usd(t.usdPrice)}</em>${ch != null ? ` <em class="${ch >= 0 ? 'up' : 'dn'}">${pct(ch)}</em>` : ''}` : 'Paired with <em>$TTWO</em>',
    solUsd ? `SOL <em>${usd(solUsd)}</em>` : 'One signature <em>·</em> every dead coin', 'Five stars wash <em>free</em>', 'The card is a meme. <em>The washing is real.</em>', 'Welcome to <em>Vice</em>'];
  const row = items.map(s => `<span>${s}</span>`).join('');
  $('#tapeIn').innerHTML = row + row;
}
tape();

// ---------------------------------------------------------------- wallet
function walletBtn() {
  const b = $('#connect'), a = wallet.W.address;
  b.classList.toggle('on', !!a); $('.lbl', b).textContent = a ? short(a) : 'Connect';
}
on('wallet', () => { walletBtn(); if (wallet.W.address) { P.st.scan = null; P.st.result = null; P.scan(); } else emit('scan', null); });
on('wallets', () => { if (P.st.app === 'wallets') P.render(); });
$('#connect').onclick = () => P.connectFlow();
setTimeout(() => wallet.restore(), 400);
walletBtn();

// ---------------------------------------------------------------- mission passed
function passed(r) {
  const box = $('#passed'); box.hidden = false;
  $('#mpT').innerHTML = [...'Mission passed'].map((c, i) => c === ' ' ? ' ' : `<i style="--n:${i}">${c}</i>`).join('');
  $('#mpA').innerHTML = `+${ICON.sol.replace('class="i-sol"', '')}${sol(r.back, 4)}`;
  $('#mpS').textContent = `${r.closed} dead coin${r.closed === 1 ? '' : 's'} washed${r.dust ? ` · ${r.dust} dust burned` : ''}`;
  const ways = Object.values(WAYS);
  $('#mpRain').innerHTML = R ? '' : Array.from({ length: 28 }, (_, i) => { const w = ways[i % ways.length]; return `<i style="left:${Math.random() * 100}%;background:linear-gradient(135deg,${w.base.join(',')});--r:${(Math.random() * 720 - 360) | 0}deg;animation-duration:${2.6 + Math.random() * 2.4}s;animation-delay:${Math.random() * 1.6}s"></i>`; }).join('');
  if (scene) scene.spin();
  money(0, 'washed');
  setTimeout(() => money(P.st.scan ? P.st.scan.items.filter(i => i.kind !== 'keep').reduce((a, i) => a + i.lamports, 0) : 0, 'dirty sol'), 9000);
}
const hidePassed = () => { $('#passed').hidden = true; };
$('#mpClose').onclick = () => { hidePassed(); P.open('wash'); };
$('#mpCard').onclick = () => { hidePassed(); P.open('card'); };
$('#passed').addEventListener('click', e => { if (e.target.id === 'passed') hidePassed(); });

// ---------------------------------------------------------------- keys
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (!$('#passed').hidden) hidePassed(); else if (P.isOpen()) P.close(); return; }
  const app = { w: 'wash', c: 'card', s: 'wanted', t: 'ttwo' }[k];
  if (app) { P.isOpen() && P.st.app === app ? P.close() : P.open(app); return; }
  if (k === 'f' && scene) scene.flip();
  if (k === ' ' && scene && !P.isOpen()) { e.preventDefault(); scene.spin(); }
});
// the phone's clock
const clock = () => { const d = new Date(); $('#phClock').textContent = d.getHours() + ':' + p2(d.getMinutes()); };
clock(); setInterval(clock, 15000);
