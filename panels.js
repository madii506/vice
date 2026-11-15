// VICE · the app on the phone: home, wash, card studio, wanted levels, $TTWO, receipts and FAQ.
import { CONFIG, TIERS, emit, store, $, $$, esc, sol, usd, num, pct, short, solscan, toast, copy, ICON, stars, LAMPORTS } from './core.js';
import * as wallet from './wallet.js';
import * as wash from './wash.js';
import { drawCard, WAYS } from './cardart.js';
import { tokens, gtPools, gtCandles } from './rpc.js';

export const st = { app: null, scan: null, scanning: false, washing: null, result: null, err: null, tab: 'empty', ttwo: null, range: '7D',
  card: { name: 'TRENCH RESIDENT', way: 'vice', stars: 5, flip: false, showAmt: true, ...store.get('vice:card', {}) } };
let scene = null; export const bind = s => { scene = s; };
const scr = () => $('#screen');
const wide = () => innerWidth >= 760;

// ---------------------------------------------------------------- open / close
const TITLES = { home: 'Vice', wash: 'Wash', card: 'Card', wanted: 'Wanted', ttwo: '$TTWO', receipts: 'Receipts', faq: 'FAQ', wallets: 'Connect' };
export function open(app = 'home', back = false) {
  const was = st.app; st.app = app;
  document.body.classList.add('phone-open'); $('#phone').setAttribute('aria-hidden', 'false');
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.app === app));
  if (scene) scene.shift(wide() ? .13 : 0);
  emit('phone', true);
  render(back || (was && app === 'home'));
}
export function close() {
  st.app = null; document.body.classList.remove('phone-open'); $('#phone').setAttribute('aria-hidden', 'true');
  $$('#nav button').forEach(b => b.classList.remove('on'));
  if (scene) scene.shift(0);
  emit('phone', false);
}
export const isOpen = () => !!st.app;
const head = (title, home) => `<div class="app-h">${home ? '' : `<button class="ib" data-go="home" aria-label="Back">${ICON.back}</button>`}<h2><span class="chrome">${esc(title)}</span></h2><button class="ib" data-close aria-label="Close">${ICON.close}</button></div>`;
export function render(back) {
  const s = scr(); if (!s || !st.app) return;
  const f = { home, wash: washView, card: cardView, wanted, ttwo, receipts, faq, wallets }[st.app] || home;
  s.innerHTML = `<div class="scr${back ? ' back' : ''}">${f()}</div>`;
  s.scrollTop = 0;
  after[st.app] && after[st.app]();
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go],[data-close],[data-app]'); if (!t) return;
  if (t.hasAttribute('data-close')) return close();
  const app = t.dataset.go || t.dataset.app;
  if (t.closest('#phone') || !st.app || st.app !== app) open(app, !!t.dataset.go && app === 'home');
  else close();
});
$('#phHome') && $('#phHome').addEventListener('click', () => open('home', true));
// a token icon that fails to load leaves the initials behind (no inline handlers: the page runs under a strict CSP)
document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && t.closest('.tk')) t.remove(); }, true);

// ---------------------------------------------------------------- the card, drawn small
function cardCanvas(o, w = 900) {
  const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * .631);
  drawCard(c, { way: o.way, stars: o.stars, flip: o.flip, name: o.name, amount: o.amount ?? null, round: w * .045 });
  return c;
}
const lastBack = () => { const h = wallet.W.address ? wash.history(wallet.W.address) : []; return h[0] ? h[0].back : null; };
const cardOpts = () => { const a = lastBack(); return { ...st.card, amount: st.card.showAmt && a ? sol(a, 4) : null }; };

// ---------------------------------------------------------------- home
function home() {
  const a = wallet.W.address, dirty = st.scan ? st.scan.items.filter(i => i.kind !== 'keep').reduce((s, i) => s + i.lamports, 0) : null;
  const clean = a ? wash.washedTotal(a) : 0;
  return `${head('Vice', true)}
  <div class="hello"><span>${a ? 'Welcome back' : 'Welcome to Vice'}</span><span>${a ? esc(short(a)) : ''}</span></div>
  <div class="minicard" id="mini" data-app="card"></div>
  <div class="row2">
    <div class="box"><div class="k">Dirty</div><div class="big">${ICON.sol}${dirty == null ? '—' : sol(dirty, 4)}</div></div>
    <div class="box"><div class="k">Washed</div><div class="big" style="color:var(--mint)">${ICON.sol}${a ? sol(clean, 4) : '—'}</div></div>
  </div>
  ${a ? `<button class="cta btn-w" data-app="wash"><span>${st.scan ? 'Wash my bags' : 'Scan my wallet'}</span></button>` : `<button class="cta btn-w" data-go="wallets"><span>Connect wallet</span></button>`}
  <div class="apps">
    <button class="app" data-app="wash"><i class="a1">${IC.wash}</i>Wash</button>
    <button class="app" data-app="card"><i class="a2">${IC.card}</i>Card</button>
    <button class="app" data-app="wanted"><i class="a3">${IC.star}</i>Wanted</button>
    <button class="app" data-app="ttwo"><i class="a4">${IC.chart}</i>$TTWO</button>
    <button class="app" data-app="receipts"><i class="a5">${IC.receipt}</i>Receipts</button>
    <button class="app" data-app="faq"><i class="a6">${IC.faq}</i>FAQ</button>
  </div>
  ${a ? `<p class="muted sm" style="text-align:center;margin:18px 0 0"><button class="link" id="disc">Disconnect ${esc(short(a))}</button></p>` : ''}`;
}
const IC = {
  wash: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="13.5" r="4.5"/><path d="M7 6.5h2"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M6 15h4"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2.5l2.8 6.1 6.7.7-5 4.5 1.4 6.6L12 17l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 3 8-8M15 7h5v5"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="#5a2400" stroke-width="2"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
  faq: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M9.2 9a3 3 0 115 2.2c-1 .7-2.2 1.3-2.2 2.8"/><circle cx="12" cy="18" r=".6" fill="#fff"/></svg>',
};
const after = {
  home() {
    const m = $('#mini'); if (m) m.appendChild(cardCanvas(cardOpts(), 760));
    const d = $('#disc'); if (d) d.onclick = async () => { await wallet.disconnect(); st.scan = null; emit('scan', null); render(); };
  },
  wallets() {
    $$('[data-wallet]').forEach(b => b.onclick = async () => {
      try { await wallet.connect(b.dataset.wallet); open('wash'); scan(); }
      catch (e) { toast(esc(e.message || 'The wallet said no.'), 'err'); }
    });
  },
};

// ---------------------------------------------------------------- connect
function wallets() {
  const list = wallet.W.list;
  return `${head('Connect')}
  <p class="copy">Pick your Solana wallet. VICE never sees your keys: your wallet shows every transaction and signs it.</p>
  ${list.length ? `<div class="wl">${list.map(w => `<button data-wallet="${esc(w.name)}">${w.icon ? `<img src="${esc(w.icon)}" alt="">` : ''}${esc(w.name)}</button>`).join('')}</div>`
    : `<div class="box"><b>No Solana wallet found in this browser.</b><p class="muted sm" style="margin:6px 0 0">Install <a class="link" href="https://phantom.com" target="_blank" rel="noopener">Phantom</a>, <a class="link" href="https://solflare.com" target="_blank" rel="noopener">Solflare</a> or <a class="link" href="https://backpack.app" target="_blank" rel="noopener">Backpack</a>, or open this page inside your wallet’s browser.</p></div>`}`;
}
export async function connectFlow() {
  if (wallet.W.address) return open('home');
  if (wallet.W.list.length === 1) {
    try { await wallet.connect(wallet.W.list[0].name); open('wash'); scan(); } catch (e) { toast(esc(e.message || 'The wallet said no.'), 'err'); }
  } else open('wallets');
}

// ---------------------------------------------------------------- wash
const washer = (fast, n = 7) => `<div class="washer"><span class="knob" style="left:22px"></span><span class="knob k2" style="left:40px"></span><div class="drum${fast ? ' fast' : ''}"><div class="tumble">${
  Array.from({ length: n }, (_, i) => { const a = i / n * 6.283, r = 26 + (i % 2) * 10; return `<b class="${i % 3 ? 'dirty' : ''}" style="left:${43 + Math.cos(a) * r}px;top:${43 + Math.sin(a) * r}px"></b>`; }).join('')
}</div>${Array.from({ length: 5 }, (_, i) => `<span class="bub" style="left:${16 + i * 16}px;bottom:${6 + (i % 2) * 10}px;width:${8 + i % 3 * 4}px;height:${8 + i % 3 * 4}px;animation-delay:${i * .45}s"></span>`).join('')}</div></div>`;
function washView() {
  const a = wallet.W.address;
  if (!a) return `${head('Wash')}${washer(false)}
    <p class="copy" style="text-align:center"><b>Dead coins in. Clean SOL out.</b><br>Every token account holds about 0.002 SOL of rent. Close the dead ones and it comes back to you.</p>
    <button class="cta btn-w" data-go="wallets"><span>Connect wallet</span></button>
    <p class="muted sm" style="text-align:center;margin-top:12px">Empty accounts are just closed. Dust is burned only when you pick it.</p>`;
  if (st.washing) return `${head('Wash')}${washer(true, 9)}${stepsView()}`;
  if (st.result) return receiptView();
  if (st.scanning || !st.scan) return `${head('Wash')}${washer(true)}<p class="copy" style="text-align:center"><b>Reading your wallet…</b><br><span class="muted">Every token account you own, both token programs.</span></p>${st.err ? `<div class="err">${esc(st.err)}</div><button class="ghost sm btn-w" id="rescan">Try again</button>` : ''}`;
  const s = st.scan, groups = { empty: s.items.filter(i => i.kind === 'empty'), wsol: s.items.filter(i => i.kind === 'wsol'), dust: s.items.filter(i => i.kind === 'dust'), keep: s.items.filter(i => i.kind === 'keep') };
  const picked = s.items.filter(i => i.pick), q = wash.quote(s, picked);
  const dirty = s.items.filter(i => i.kind !== 'keep').reduce((x, i) => x + i.lamports, 0);
  if (!groups.empty.length && !groups.dust.length && !groups.wsol.length) return `${head('Wash')}
    <div class="sum"><div class="k">Dirty SOL found</div><div class="big">${ICON.sol}0</div></div>
    <div class="box" style="text-align:center"><b>Squeaky clean.</b><p class="muted sm" style="margin:6px 0 0">No dead token accounts in ${esc(short(a))}. ${groups.keep.length ? `${groups.keep.length} account${groups.keep.length > 1 ? 's' : ''} you still use.` : ''}</p></div>
    <button class="ghost sm btn-w" id="rescan">Scan again</button>`;
  const tabs = [['empty', 'Empty', groups.empty.length], ['dust', 'Dust', groups.dust.length], ['wsol', 'wSOL', groups.wsol.length], ['keep', 'Kept', groups.keep.length]].filter(t => t[2]);
  if (!tabs.find(t => t[0] === st.tab)) st.tab = tabs[0][0];
  const list = groups[st.tab];
  return `${head('Wash')}
  <div class="sum"><div class="k">Dirty SOL in your wallet</div><div class="big">${ICON.sol}${sol(dirty, 4)}</div><div class="muted sm">${s.solUsd ? '≈ ' + usd(dirty / LAMPORTS * s.solUsd) + ' · ' : ''}${groups.empty.length} empty · ${groups.dust.length} dust${groups.wsol.length ? ' · ' + groups.wsol.length + ' wSOL' : ''}</div></div>
  <div class="tabs">${tabs.map(([k, l, n]) => `<button data-tab="${k}" class="${st.tab === k ? 'on' : ''}">${l}<em>${n}</em></button>`).join('')}${st.tab === 'dust' && list.length ? `<button id="allDust">${list.every(i => i.pick) ? 'Unpick all' : 'Pick all dust'}</button>` : ''}</div>
  ${st.tab === 'dust' ? '<p class="muted sm" style="margin:0 0 8px">Dust is burned, then its account is closed. Burned tokens are gone for good.</p>' : ''}
  ${st.tab === 'keep' ? '<p class="muted sm" style="margin:0 0 8px">These stay. Anything worth $1 or more, NFTs, stablecoins, $VICE and $TTWO are never washed.</p>' : ''}
  <div class="rows">${list.map((it, n) => rowView(it, n)).join('')}</div>
  <div class="dock">
    ${q.pct ? `<div class="line"><span>Fee (${q.pct}%, buys back $VICE)</span><b>−${sol(q.fee, 6)}</b></div>` : ''}
    <div class="line"><span>Network fee · ${q.txs} transaction${q.txs === 1 ? '' : 's'}</span><b>≈ −${sol(q.network, 6)}</b></div>
    <button class="cta" id="doWash" ${picked.length ? '' : 'disabled'}><span>${picked.length ? `Wash ${picked.length} · get ${sol(Math.max(0, q.back), 4)} SOL` : 'Pick accounts to wash'}</span></button>
  </div>`;
}
function rowView(it, n) {
  const nm = it.sym || short(it.mint), sub = it.kind === 'keep' ? it.why : it.kind === 'dust' ? `${num(it.ui)} left${it.usd != null ? ' · ' + usd(it.usd) : ' · no price'}` : it.kind === 'wsol' ? `${num(it.ui)} wrapped SOL` : (it.name || short(it.mint));
  const ic = it.icon ? `<img src="${esc(it.icon)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc((it.sym || '?').slice(0, 3));
  return `<button class="rw ${it.pick ? 'pick' : ''} ${it.kind === 'keep' ? 'keep off' : ''}" data-acc="${esc(it.pubkey)}" style="--n:${Math.min(n, 20)}" ${it.kind === 'keep' ? 'disabled' : ''}>
    <span class="ck">${ICON.check}</span><span class="tk">${ic}</span>
    <span class="nm"><b>${esc(nm)}</b><small>${esc(sub)}</small></span>
    <span class="amt">${it.kind === 'keep' ? '' : '+' + sol(it.lamports, 5)}<small>${it.failed ? esc(it.failed) : it.program === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' ? 'Token-2022' : ''}</small></span></button>`;
}
const STEPS = [['sim', 'Simulate every transaction'], ['sign', 'Sign in your wallet'], ['send', 'Send'], ['confirm', 'Confirm on Solana']];
function stepsView() {
  const w = st.washing, idx = STEPS.findIndex(s => s[0] === (w.stage === 'build' ? 'sim' : w.stage));
  return `<div id="wsteps"><ul class="steps">${STEPS.map(([k, l], i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}"><i>${i < idx ? ICON.check : ''}</i>${l}${i === idx && w.info && w.info.of ? ` <span class="muted">· ${w.info.done ?? w.info.i ?? 0}/${w.info.of}</span>` : ''}</li>`).join('')}</ul>
  <p class="muted sm" style="text-align:center;margin-top:16px">${w.stage === 'sign' ? (wallet.canSignAll() ? 'Check your wallet: one prompt signs every transaction.' : 'Check your wallet: approve each transaction.') : 'Keep this tab open.'}</p></div>`;
}
function receiptView() {
  const r = st.result;
  return `${head('Washed')}
  <div class="sum"><div class="k">Clean SOL back in your wallet</div><div class="big">${ICON.sol}${sol(r.back, 4)}</div><div class="muted sm">${r.closed} account${r.closed === 1 ? '' : 's'} closed${r.dust ? ` · ${r.dust} dust burned` : ''}${r.fee ? ` · fee ${sol(r.fee, 6)}` : ''}</div></div>
  <div class="box">${r.sigs.map((s, i) => `<div class="line" style="display:flex;justify-content:space-between;padding:4px 0"><span class="muted sm">Transaction ${i + 1}</span><a class="link sm" href="${solscan(s)}" target="_blank" rel="noopener">${esc(short(s))} ${ICON.ext}</a></div>`).join('')}
  ${r.failedSigs.length ? `<div class="err">${r.failedSigs.length} transaction${r.failedSigs.length > 1 ? 's' : ''} failed on chain. Nothing in them changed.</div>` : ''}
  ${r.pending.length ? `<div class="err">${r.pending.length} still unconfirmed. Check your wallet in a minute, then scan again.</div>` : ''}
  ${r.dropped ? `<p class="muted sm" style="margin:8px 0 0">${r.dropped} account${r.dropped > 1 ? 's' : ''} couldn’t be closed and ${r.dropped > 1 ? 'were' : 'was'} left alone.</p>` : ''}</div>
  <div class="acts"><button class="cta sm wide" data-app="card"><span>Make your card</span></button><button class="ghost sm" id="share">Post on X</button><button class="ghost sm" id="again">Scan again</button></div>`;
}
after.wash = () => {
  if (wallet.W.address && !st.scan && !st.scanning && !st.err && !st.washing) setTimeout(scan, 0);
  const r = $('#rescan'); if (r) r.onclick = () => scan();
  const ag = $('#again'); if (ag) ag.onclick = () => { st.result = null; scan(); };
  const sh = $('#share'); if (sh) sh.onclick = () => postX(st.result ? sol(st.result.back, 4) : null);
  $$('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; render(); });
  const ad = $('#allDust'); if (ad) ad.onclick = () => { const d = st.scan.items.filter(i => i.kind === 'dust'), on = !d.every(i => i.pick); d.forEach(i => i.pick = on); keepScroll(); };
  $$('[data-acc]').forEach(b => b.onclick = () => { const it = st.scan.items.find(i => i.pubkey === b.dataset.acc); if (!it || it.kind === 'keep') return; it.pick = !it.pick; keepScroll(); });
  const go = $('#doWash'); if (go) go.onclick = runWash;
};
function keepScroll() { const s = scr(), y = s.scrollTop; render(); s.scrollTop = y; $$('.rw').forEach(r => r.style.animation = 'none'); emit('scan', st.scan); }

export async function scan() {
  if (!wallet.W.address || st.scanning) return;
  st.scanning = true; st.err = null; st.result = null; if (st.app === 'wash') render();
  emit('heat', true);
  try { st.scan = await wash.scan(wallet.W.address); emit('scan', st.scan); }
  catch (e) { st.err = 'Couldn’t read your wallet: ' + (e.message || 'network error'); }
  finally { st.scanning = false; emit('heat', false); if (st.app === 'wash' || st.app === 'home') render(); }
}
async function runWash() {
  const s = st.scan, picked = s.items.filter(i => i.pick); if (!picked.length) return;
  st.washing = { stage: 'build', info: {} }; render(); emit('heat', true); if (scene) scene.heat(true);
  try {
    const r = await wash.wash(s, picked, (stage, info) => { st.washing = { stage, info }; if (st.app === 'wash') { const box = $('#wsteps'); if (box) box.outerHTML = stepsView(); else render(); } });
    st.result = r; st.washing = null;
    if (r.sigs.length) { emit('washed', r); if (scene) scene.spin(); }
    else toast('Nothing landed. Your wallet is unchanged.', 'err');
  } catch (e) {
    st.washing = null;
    const m = String(e && e.message || e);
    toast(/reject|cancel|denied|declined|closed/i.test(m) ? 'Cancelled in your wallet. Nothing was sent.' : esc(m), 'err', 7000);
  } finally { emit('heat', false); if (scene) scene.heat(false); render(); if (st.result && st.result.sigs.length) setTimeout(() => quietRescan(), 2500); }
}
async function quietRescan() { try { st.scan = await wash.scan(wallet.W.address); emit('scan', st.scan); if (st.app === 'home') render(); } catch {} }

// ---------------------------------------------------------------- card studio
function cardView() {
  const c = st.card, a = lastBack();
  return `${head('Card')}<div class="studio"><div id="studioCv"></div>
  <div class="field"><span class="k">Name on the card</span><input class="inp" id="cName" maxlength="22" value="${esc(c.name)}" autocomplete="off" spellcheck="false"></div>
  <div class="field"><span class="k">Colour</span><div class="sw">${Object.entries(WAYS).map(([k, w]) => `<button data-way="${k}" class="${c.way === k ? 'on' : ''}" title="${w.name}" style="background:linear-gradient(135deg,${w.base.join(',')})"></button>`).join('')}</div></div>
  <div class="field"><span class="k">Wanted level</span><div class="starpick">${[1, 2, 3, 4, 5].map(n => `<button data-st="${n}" class="${n <= c.stars ? 'on' : ''}" aria-label="${n} stars">${ICON.star}</button>`).join('')}</div></div>
  <div class="field"><span class="k">Layout</span><div class="tg"><button data-flip="0" class="${c.flip ? '' : 'on'}">Sun right</button><button data-flip="1" class="${c.flip ? 'on' : ''}">Sun left</button></div></div>
  ${a ? `<div class="field"><span class="k">Your last wash</span><div class="tg"><button data-amt="1" class="${c.showAmt ? 'on' : ''}">Show ${sol(a, 4)} SOL</button><button data-amt="0" class="${c.showAmt ? '' : 'on'}">Hide it</button></div></div>` : ''}
  <div class="acts"><button class="cta sm wide" id="toHero"><span>Put it on the big card</span></button><button class="ghost sm" id="savePng">Save PNG</button><button class="ghost sm" id="postX">Post on X</button></div>
  <p class="muted sm" style="text-align:center;margin-top:12px">It’s a meme. It can’t pay for anything.</p></div>`;
}
after.card = () => {
  const box = $('#studioCv'), cv = cardCanvas(cardOpts(), 1000); box.appendChild(cv);
  const redraw = () => { store.set('vice:card', st.card); drawCard(cv, { ...cardOpts(), round: 45 }); };
  $('#cName').oninput = e => { st.card.name = e.target.value.toUpperCase().slice(0, 22); redraw(); };
  $$('[data-way]').forEach(b => b.onclick = () => { st.card.way = b.dataset.way; $$('[data-way]').forEach(x => x.classList.toggle('on', x === b)); redraw(); });
  $$('[data-st]').forEach(b => b.onclick = () => { st.card.stars = +b.dataset.st; $$('[data-st]').forEach(x => x.classList.toggle('on', +x.dataset.st <= st.card.stars)); redraw(); });
  $$('[data-flip]').forEach(b => b.onclick = () => { st.card.flip = b.dataset.flip === '1'; $$('[data-flip]').forEach(x => x.classList.toggle('on', x === b)); redraw(); });
  $$('[data-amt]').forEach(b => b.onclick = () => { st.card.showAmt = b.dataset.amt === '1'; $$('[data-amt]').forEach(x => x.classList.toggle('on', x === b)); redraw(); });
  $('#toHero').onclick = () => { if (scene) { scene.setCard(cardOpts()); if (wide()) toast('Your card is up.', 'ok', 2500); else close(); } };
  $('#savePng').onclick = savePng;
  $('#postX').onclick = () => postX(cardOpts().amount);
};
function poster() {
  const W = 1600, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  let gr = g.createLinearGradient(0, 0, 0, H); [[0, '#18c2e4'], [.35, '#8cd2ee'], [.55, '#c3bde2'], [.72, '#f4a7cf'], [.88, '#ffc5b3'], [1, '#fdeede']].forEach(([o, s]) => gr.addColorStop(o, s));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const cw = 1180, card = cardCanvas(cardOpts(), cw);
  g.save(); g.translate(W / 2, H / 2); g.rotate(-.06);
  g.shadowColor = 'rgba(27,7,56,.45)'; g.shadowBlur = 60; g.shadowOffsetY = 34; g.drawImage(card, -cw / 2, -card.height / 2); g.restore();
  return c;
}
function savePng() {
  poster().toBlob(b => { const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'vice-card.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Saved vice-card.png', 'ok', 2500); }, 'image/png');
}
function postX(amt) {
  const t = amt ? `Just washed ${amt} SOL out of my dead coins. Clean money now.\n\nWelcome to Vice. $VICE` : `Got my VICE card. Dirty bags only.\n\nWelcome to Vice. $VICE`;
  open_(`https://x.com/intent/post?text=${encodeURIComponent(t + '\n' + location.origin)}`);
}
const open_ = u => window.open(u, '_blank', 'noopener');

// ---------------------------------------------------------------- wanted
function wanted() {
  const s = st.scan, me = s && s.tier ? s.tier.stars : null;
  return `${head('Wanted')}
  <p class="copy">Your wanted level is how much $VICE you hold. The more stars, the smaller the cut when you wash. <b>Five stars wash free.</b></p>
  ${TIERS.map((t, n) => `<div class="tier ${me === t.stars ? 'me' : ''}" style="--n:${n}">${stars(t.stars)}<span><b>${esc(t.name)}</b><small>${t.min ? num(t.min, 0) + '+ $VICE' : 'No $VICE'}</small></span><span class="fee ${t.fee ? '' : 'free'}">${t.fee ? t.fee + '%' : 'FREE'}</span></div>`).join('')}
  <div class="box" style="margin-top:12px">${CONFIG.ca ? (s ? `<div class="k">You hold</div><div class="big">${num(s.vice || 0)} <small class="muted sm">$VICE</small></div>` : `<p class="muted sm" style="margin:0">Connect and scan to read your level.</p>`)
    : `<p class="muted sm" style="margin:0">Levels read from your $VICE balance once $VICE is live. ${CONFIG.treasury ? '' : 'Until then, washing has no fee at all.'}</p>`}</div>
  <p class="muted sm">The fee goes to the VICE treasury, which buys back $VICE.</p>`;
}

// ---------------------------------------------------------------- $TTWO
function ttwo() {
  const t = st.ttwo;
  return `${head('$TTWO')}
  <div class="px"><div class="big">${t && t.usdPrice != null ? usd(t.usdPrice) : '—'}</div>${t && t.stats24h ? `<b class="${t.stats24h.priceChange >= 0 ? 'up' : 'dn'}">${pct(t.stats24h.priceChange)}</b>` : ''}</div>
  <div class="muted sm">Take-Two Interactive, tokenized by Backpack · on Solana</div>
  <div class="chart"><canvas id="tChart"></canvas></div>
  <div class="rng">${['1D', '7D', '30D'].map(r => `<button data-rng="${r}" class="${st.range === r ? 'on' : ''}">${r}</button>`).join('')}</div>
  <div class="kv" style="margin-top:12px"><div><span class="k">Liquidity</span><b>${t ? usd(t.liquidity) : '—'}</b></div><div><span class="k">Holders</span><b>${t && t.holderCount ? num(t.holderCount, 1) : '—'}</b></div></div>
  <div class="box" style="margin-top:12px"><div class="k" style="margin-bottom:8px">GTA VI lands in</div><div class="cd" id="cd"></div></div>
  <p class="copy">$VICE launches on pump.fun paired with $TTWO: its curve is priced in TTWO, the tokenized stock of Take-Two, the publisher behind GTA. When GTA moves the stock, the stock moves the pair.</p>
  <p class="sm"><a class="link" href="https://jup.ag/tokens/${CONFIG.ttwo}" target="_blank" rel="noopener">TTWO on Jupiter ${ICON.ext}</a> &nbsp; <a class="link" href="${solscan(CONFIG.ttwo, 'token')}" target="_blank" rel="noopener">Solscan ${ICON.ext}</a></p>
  <p class="muted sm">VICE is not affiliated with Take-Two Interactive, Rockstar Games or Backpack.</p>`;
}
let cdTimer = 0;
after.ttwo = () => {
  $$('[data-rng]').forEach(b => b.onclick = () => { st.range = b.dataset.rng; $$('[data-rng]').forEach(x => x.classList.toggle('on', x === b)); chart(); });
  chart(); tick(); clearInterval(cdTimer); cdTimer = setInterval(() => { if (st.app !== 'ttwo') return clearInterval(cdTimer); tick(); }, 1000);
};
export function left() { const ms = new Date(CONFIG.gta).getTime() - Date.now(); if (ms <= 0) return null; return { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 }; }
function tick() {
  const el = $('#cd'); if (!el) return; const l = left(), p = n => String(n).padStart(2, '0');
  el.innerHTML = l ? [['d', 'days'], ['h', 'hrs'], ['m', 'min'], ['s', 'sec']].map(([k, n]) => `<div><b>${p(l[k])}</b><small>${n.toUpperCase()}</small></div>`).join('') : '<div style="grid-column:1/-1"><b>OUT NOW</b></div>';
}
let pool = null; const cache = {};
async function chart() {
  const cv = $('#tChart'); if (!cv) return;
  const key = st.range;
  try {
    if (!pool) { const ps = await gtPools(CONFIG.ttwo); ps.sort((a, b) => b.liq - a.liq); pool = ps[0] && ps[0].id; }
    if (!pool) throw new Error('no pool');
    const [tf, agg, lim] = key === '1D' ? ['minute', 15, 96] : key === '7D' ? ['hour', 1, 168] : ['hour', 4, 180];
    const c = cache[key] || (cache[key] = await gtCandles(pool, tf, agg, lim));
    if ($('#tChart') && st.range === key) draw(cv, c);
  } catch { const g = cv.getContext('2d'); size(cv); g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '700 12px Inter'; g.fillText('Chart offline right now', 8, 20); }
}
const size = cv => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = r.width * d; cv.height = r.height * d; cv.getContext('2d').setTransform(d, 0, 0, d, 0, 0); return r; };
function draw(cv, c) {
  const r = size(cv), g = cv.getContext('2d'), W = r.width, H = r.height; if (!c.length) return;
  const lo = Math.min(...c.map(x => x.l)), hi = Math.max(...c.map(x => x.h)), y = v => 8 + (H - 22) * (1 - (v - lo) / (hi - lo || 1)), x = i => i / (c.length - 1) * W;
  const up = c[c.length - 1].c >= c[0].o, col = up ? '#5dffa6' : '#ff7b93';
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, up ? 'rgba(93,255,166,.35)' : 'rgba(255,123,147,.35)'); gr.addColorStop(1, 'rgba(255,79,184,0)');
  g.beginPath(); c.forEach((p, i) => i ? g.lineTo(x(i), y(p.c)) : g.moveTo(0, y(p.c))); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fillStyle = gr; g.fill();
  g.beginPath(); c.forEach((p, i) => i ? g.lineTo(x(i), y(p.c)) : g.moveTo(0, y(p.c))); g.strokeStyle = col; g.lineWidth = 2.2; g.lineJoin = 'round'; g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(W - 3, y(c[c.length - 1].c), 4, 0, 6.283); g.fill();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '700 10.5px Inter'; g.fillText(usd(hi), 4, 12); g.fillText(usd(lo), 4, H - 4);
  cv.parentElement.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
export async function loadTtwo() {
  try { const d = await tokens([CONFIG.ttwo]); const t = d[CONFIG.ttwo]; if (t) { st.ttwo = t; emit('ttwo', t); if (st.app === 'ttwo') { const y = scr().scrollTop; render(); scr().scrollTop = y; } } } catch {}
}

// ---------------------------------------------------------------- receipts
function receipts() {
  const a = wallet.W.address, h = a ? wash.history(a) : [];
  return `${head('Receipts')}
  ${!a ? '<p class="copy">Connect to see the washes this browser has done for your wallet.</p><button class="cta btn-w" data-go="wallets"><span>Connect wallet</span></button>'
    : !h.length ? '<div class="box" style="text-align:center"><b>No washes yet.</b><p class="muted sm" style="margin:6px 0 0">Your first one shows up here with links to every transaction.</p></div><button class="cta btn-w" data-app="wash"><span>Wash my bags</span></button>'
    : `<div class="box"><div class="k">Washed from this browser</div><div class="big" style="color:var(--mint)">${ICON.sol}${sol(wash.washedTotal(a), 4)}</div></div>` + h.map((x, n) => `<div class="tier" style="--n:${n};grid-template-columns:1fr auto"><span><b>${new Date(x.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</b><small>${x.n} account${x.n === 1 ? '' : 's'} · ${x.sigs.map((s, i) => `<a class="link" href="${solscan(s)}" target="_blank" rel="noopener">tx${x.sigs.length > 1 ? ' ' + (i + 1) : ''}</a>`).join(' ')}</small></span><span class="fee free">+${sol(x.back, 4)}</span></div>`).join('')}`;
}

// ---------------------------------------------------------------- faq
const QA = [
  ['What does VICE do?', 'It finds the dead coins in your wallet and closes their token accounts. Solana makes every token account lock about 0.002 SOL of rent; closing one sends that SOL back to you. Dead coins become clean SOL.'],
  ['Is it safe?', 'Your wallet signs everything. VICE builds the transactions in your browser, simulates them first and shows them to your wallet; it never sees a key and never holds your coins. Empty accounts are only closed. Dust is burned only when you pick it, and anything worth $1 or more, NFTs, stablecoins, $VICE and $TTWO are never touched.'],
  ['What is dust?', 'Tokens worth less than $1 that nobody will buy. To close an account it has to be empty, so dust gets burned first. Burned tokens are gone for good, which is why dust is never picked for you.'],
  ['How much do I get back?', 'About 0.00204 SOL for each classic token account, sometimes more for Token-2022 accounts. A wallet that has aped a lot can have dozens or hundreds of them.'],
  ['What does it cost?', CONFIG.treasury ? 'The Solana network fee, and a cut set by your wanted level: 10% with no $VICE, down to free at five stars. The cut goes to the VICE treasury, which buys back $VICE.' : 'Only the Solana network fee, a fraction of a cent per transaction. No VICE fee is taken right now.'],
  ['What are the stars?', 'Your wanted level: how much $VICE you hold. More stars, smaller cut. Five stars wash free.'],
  ['Why $TTWO?', '$VICE launches on pump.fun paired with TTWO, the tokenized Take-Two stock on Solana. Take-Two publishes GTA, and GTA VI lands on 11/19, the date on the card.'],
  ['Is the card real?', 'No. The card is a meme. It can’t pay for anything. The washing is real. VICE is not affiliated with Rockstar Games, Take-Two Interactive or Backpack.'],
];
function faq() {
  return `${head('FAQ')}${QA.map(([q, a], i) => `<details ${i ? '' : 'open'}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
  <div class="keys"><span><kbd>W</kbd>wash</span><span><kbd>C</kbd>card</span><span><kbd>S</kbd>stars</span><span><kbd>T</kbd>$TTWO</span><span><kbd>F</kbd>flip</span><span><kbd>Esc</kbd>close</span></div>`;
}
