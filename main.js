// VICE · the street (only the animation, the line and two buttons) and the dive into the world.
import { CONFIG, on, emit, $, $$, esc, sol, short, ICON, reduced, store, copy, toast, sleep } from './core.js';
import { startWorld } from './world.js';
import { drawCard, WAYS } from './cardart.js';
import * as wallet from './wallet.js';
import * as A from './app.js';

const R = reduced(), body = document.body, wide = () => innerWidth >= 760;
await Promise.race([Promise.all(['400 40px Anton', '700 20px Inter', '800 20px Inter'].map(f => document.fonts.load(f))), sleep(1500)]).catch(() => {});
const world = startWorld($('#world'), { reduced: R });

// ---------------------------------------------------------------- the card: 3D when the browser can, a floating 2D card when it can't
let scene = null;
const saved = store.get('vice:card', null);
try {
  const m = await import('./scene.js?v=2');
  scene = m.startScene($('#card3d'), { reduced: R, card: saved ? { way: saved.way, stars: saved.stars, flip: saved.flip, name: saved.name } : {} });
} catch (e) {
  console.warn('3D off:', e && e.message);
  $('#card3d').hidden = true; const box = $('#card2d'); box.hidden = false;
  const c = document.createElement('canvas'); c.width = 1100; c.height = 694; drawCard(c, { ...(saved || {}), round: 50 }); box.appendChild(c);
}
A.bind(scene);
$('#card3d').addEventListener('vice:way', e => { A.st.card.way = e.detail; store.set('vice:card', A.st.card); });
A.mount();

// ---------------------------------------------------------------- the intro: the sky lifts, the city rises, the card drops, the line pops
$$('#title i').forEach((el, i) => el.style.setProperty('--w', i));
requestAnimationFrame(() => requestAnimationFrame(() => { body.classList.remove('intro'); body.classList.add('go'); }));
setTimeout(() => body.classList.remove('go'), 4200);

// ---------------------------------------------------------------- enter the world, and back to the street
let inWorld = false;
function enter(fromHash) {
  if (inWorld) return; inWorld = true;
  if (!fromHash && location.hash !== '#world') history.pushState(null, '', '#world');
  $('#app').hidden = false; body.classList.remove('leaving');
  if (R) { world.inside(); body.classList.add('world'); A.dock(); }
  else {
    body.classList.add('diving'); world.dive(); if (scene) scene.spin();
    setTimeout(() => { body.classList.add('world'); A.dock(); }, 520);
    setTimeout(() => body.classList.remove('diving'), 1250);
  }
  if (scene) scene.interactive(false);
  if (!wide() && scene) setTimeout(() => scene.pause(true), 700);
  A.renderPane();
  setTimeout(() => { A.dock(); A.prices(); }, 1500);
}
function leave(fromHash) {
  if (!inWorld) return; inWorld = false;
  if (!fromHash && location.hash) history.pushState(null, '', location.pathname);
  body.classList.add('leaving');
  if (scene) { scene.pause(false); scene.dock(null); scene.interactive(true); }
  world.leave();
  setTimeout(() => { body.classList.remove('world', 'leaving'); $('#app').hidden = true; }, 420);
}
$('#enter').onclick = () => enter();
$('#leave').onclick = () => leave();
addEventListener('popstate', () => { if (location.hash === '#world') enter(true); else leave(true); });
if (location.hash === '#world') setTimeout(() => enter(true), R ? 0 : 1500);

// ---------------------------------------------------------------- wallet
function walletLabels() {
  const a = wallet.W.address;
  const hc = $('#homeConnect'); hc.classList.toggle('on', !!a); $('.lbl', hc).textContent = a ? short(a) : 'Connect wallet';
  const wb = $('#wbtn'); wb.classList.toggle('on', !!a); $('.lbl', wb).textContent = a ? short(a) : 'Connect';
}
function walletMenu() {
  const a = wallet.W.address; if (!a) return A.connectFlow();
  const m = $('#modal'); $('#mTitle').textContent = 'Wallet'; $('#mClose').innerHTML = ICON.close;
  $('#mBody').innerHTML = `<p class="addr" style="display:block;padding:12px;margin:0 0 12px;word-break:break-all;font-size:12.5px">${esc(a)}</p><div class="wl"><button id="wCopy">Copy address</button><button id="wScan">Scan again</button><button id="wOut">Disconnect</button></div>`;
  m.hidden = false; const done = () => { m.hidden = true; $('#mTitle').textContent = 'Connect wallet'; };
  $('#mClose').onclick = done; m.onclick = e => { if (e.target === m) done(); };
  $('#wCopy').onclick = () => { copy(a); done(); }; $('#wScan').onclick = () => { done(); A.st.result = null; A.scan(); }; $('#wOut').onclick = async () => { done(); await wallet.disconnect(); };
}
$('#homeConnect').onclick = () => wallet.W.address ? walletMenu() : A.connectFlow();
$('#wbtn').onclick = walletMenu;
on('wallet', () => {
  walletLabels();
  if (wallet.W.address) { A.st.scan = null; A.st.result = null; A.scan(); }
  else { A.st.scan = null; A.st.result = null; A.setBlips(null); A.renderAcct(); A.renderPane(); }
  A.renderLive();
});
on('wallets', () => {});
setTimeout(() => wallet.restore(), 400);
walletLabels();

// ---------------------------------------------------------------- heat, scans, washes
on('heat', h => { world.heat(h.on); if (scene) scene.heat(h.on); A.setHeat(h.on, h.label); });
on('scan', s => A.setBlips(s));
on('washed', r => passed(r));

// ---------------------------------------------------------------- live data: prices, countdown, radar, the tape
on('prices', () => tape());
A.loadPrices(); setInterval(A.loadPrices, 60000);
setInterval(A.tickLive, 1000);
const loop = now => { requestAnimationFrame(loop); if (inWorld && !document.hidden) A.radar(now, R); };
requestAnimationFrame(loop);
if (CONFIG.x) { const x = $('#xlink'); x.hidden = false; x.href = CONFIG.x; x.innerHTML = ICON.x; }
function tape() {
  const t = A.st.ttwo, ch = t && t.stats24h && t.stats24h.priceChange, f = v => '$' + (+v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const items = ['Dead coins in <em>·</em> clean SOL out', 'Every token account locks <em>0.00204 SOL</em>', 'GTA VI lands <em>11/19</em>',
    t && t.usdPrice != null ? `$TTWO <em>${f(t.usdPrice)}</em>${ch != null ? ` <em>${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%</em>` : ''}` : 'Paired with <em>$TTWO</em>',
    A.st.solUsd ? `SOL <em>${f(A.st.solUsd)}</em>` : 'One signature <em>·</em> every dead coin', 'Five stars wash <em>free</em>', 'The card is a meme. <em>The washing is real.</em>', 'Welcome to <em>Vice</em>'];
  const row = items.map(s => `<span>${s}</span>`).join(''); $('#tapeIn').innerHTML = row + row;
}
tape();

// ---------------------------------------------------------------- mission passed
function passed(r) {
  $('#passed').hidden = false;
  $('#mpT').innerHTML = [...'Mission passed'].map((c, i) => c === ' ' ? ' ' : `<i style="--n:${i}">${c}</i>`).join('');
  $('#mpA').innerHTML = `+${ICON.sol.replace('class="i-sol"', '')}${sol(r.back, 4)}`;
  $('#mpS').textContent = `${r.closed} dead coin${r.closed === 1 ? '' : 's'} washed${r.dust ? ` · ${r.dust} dust burned` : ''}`;
  const ways = Object.values(WAYS);
  $('#mpRain').innerHTML = R ? '' : Array.from({ length: 28 }, (_, i) => { const w = ways[i % ways.length]; return `<i style="left:${Math.random() * 100}%;background:linear-gradient(135deg,${w.base.join(',')});--r:${(Math.random() * 720 - 360) | 0}deg;animation-duration:${2.6 + Math.random() * 2.4}s;animation-delay:${Math.random() * 1.6}s"></i>`; }).join('');
  if (scene) scene.spin();
}
const hidePassed = () => { $('#passed').hidden = true; };
$('#mpClose').onclick = () => { hidePassed(); A.show('wash'); };
$('#mpCard').onclick = () => { hidePassed(); A.show('card'); };
$('#passed').addEventListener('click', e => { if (e.target.id === 'passed') hidePassed(); });

// ---------------------------------------------------------------- keys
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (!$('#modal').hidden) $('#modal').hidden = true; else if (!$('#passed').hidden) hidePassed(); else if (inWorld) leave(); return; }
  if (!inWorld) { if (k === 'enter') enter(); if (k === ' ' && scene) { e.preventDefault(); scene.spin(); } return; }
  const sec = { w: 'wash', c: 'card', s: 'wanted', t: 'ttwo', r: 'receipts' }[k];
  if (sec) A.show(sec);
  if (k === 'f' && scene) scene.flip();
});
