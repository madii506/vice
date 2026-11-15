// VICE · the world behind the card: Vice at golden hour, drawn live on one canvas.
// Pastel sky, a striped sun sinking into a neon grid sea, an art-deco skyline whose windows flicker on,
// palms that sway, gulls, and a police helicopter that comes looking for you when you wash.
import { palm } from './cardart.js';

const rnd = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const ease = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SKY = [[0, '#18c2e4'], [.22, '#46cceb'], [.44, '#8cd2ee'], [.6, '#c3bde2'], [.76, '#f4a7cf'], [.9, '#ffb6c2'], [1, '#ffc9ae']];
const SEA = [[0, '#ffbcc6'], [.1, '#f39ad0'], [.35, '#b660d6'], [.7, '#5e22a6'], [1, '#2a0b57']];
const WIN = ['#ffe29a', '#ff9bd8', '#9af3ff'];

export function startWorld(cv, { reduced = false } = {}) {
  const g = cv.getContext('2d');
  const S = { t0: performance.now(), w: 0, h: 0, dpr: 1, hz: 0, mx: 0, my: 0, tmx: 0, tmy: 0, heat: 0, heatTo: 0, paused: false, heli: { x: -1, dir: -1, next: 4 }, birds: [], sparks: [], zoom: 1, zoomTo: 1, zr: .08, dim: 0, dimTo: 0, skip: 0 };
  let L = {};   // pre-rendered layers

  function layers() {
    const { w, h, dpr } = S, hz = S.hz, R = rnd(7);
    const mk = (cw, ch) => { const c = document.createElement('canvas'); c.width = Math.ceil(cw * dpr); c.height = Math.ceil(ch * dpr); const x = c.getContext('2d'); x.scale(dpr, dpr); return [c, x]; };
    // sky and sea
    const [sky, sx] = mk(w, hz); let gr = sx.createLinearGradient(0, 0, 0, hz); SKY.forEach(([o, c]) => gr.addColorStop(o, c)); sx.fillStyle = gr; sx.fillRect(0, 0, w, hz);
    const [sea, ex] = mk(w, h - hz + 2); gr = ex.createLinearGradient(0, 0, 0, h - hz); SEA.forEach(([o, c]) => gr.addColorStop(o, c)); ex.fillStyle = gr; ex.fillRect(0, 0, w, h - hz + 2);
    // clouds: long pastel streaks lit from below
    const clouds = [];
    for (let i = 0; i < 7; i++) {
      const cw = w * (.18 + R() * .26), chh = 6 + R() * 14, [c, x] = mk(cw, chh * 2.6);
      for (let k = 0; k < 3; k++) {
        const ww = cw * (.55 + R() * .45), xx = R() * (cw - ww), yy = chh * (.3 + k * .45);
        const lg = x.createLinearGradient(xx, 0, xx + ww, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.25, `rgba(255,${210 + R() * 30 | 0},${225 + R() * 25 | 0},.55)`); lg.addColorStop(.75, 'rgba(255,190,220,.5)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = lg; x.beginPath(); x.roundRect(xx, yy, ww, chh * (.5 + R() * .5), chh); x.fill();
      }
      clouds.push({ c, cw, ch: chh * 2.6, x: R() * w, y: hz * (.12 + R() * .5), v: 4 + R() * 9, p: .15 + R() * .25 });
    }
    // the skyline: a far pale band and a near deco skyline, both clear of the middle so the sun shows
    const city = (seed, far) => {
      const RR = rnd(seed), lh = hz * (far ? .34 : .5), [c, x] = mk(w, lh), wins = [], signs = [];
      const bodies = [];
      const side = (x0, x1, tallAt) => {
        let xx = x0;
        while (xx < x1) {
          const bw = (far ? 18 : 26) + RR() * (far ? 34 : 52), d = Math.abs((xx + bw / 2) - tallAt) / Math.abs(x1 - x0);
          const bh = lh * (far ? .35 + RR() * .55 : clamp(.95 - d * .9 + RR() * .25, .22, .98));
          bodies.push({ x: xx, w: Math.min(bw, x1 - xx + 4), h: bh, type: RR() });
          xx += bw - (far ? 2 : 0) + (RR() < .2 ? 6 + RR() * 12 : 0);
        }
      };
      if (far) { side(-10, w * .43, w * .2); side(w * .57, w + 10, w * .8); side(w * .4, w * .6, w * .5); }
      else { side(-10, w * (S.wide ? .34 : .26), 0); side(w * (S.wide ? .66 : .74), w + 10, w); }
      for (const b of bodies) {
        const top = lh - b.h;
        x.fillStyle = far ? 'rgba(190,120,220,.55)' : '#4a1a7e';
        if (!far) { const bg = x.createLinearGradient(0, top, 0, lh); bg.addColorStop(0, '#5a2290'); bg.addColorStop(1, '#2f0c5c'); x.fillStyle = bg; }
        x.beginPath();
        if (b.type < .3) { // deco: stepped top and a spire
          const s1 = b.w * .18; x.moveTo(b.x, lh); x.lineTo(b.x, top + 14); x.lineTo(b.x + s1, top + 14); x.lineTo(b.x + s1, top + 6); x.lineTo(b.x + b.w - s1, top + 6); x.lineTo(b.x + b.w - s1, top + 14); x.lineTo(b.x + b.w, top + 14); x.lineTo(b.x + b.w, lh);
          x.fill(); x.fillRect(b.x + b.w / 2 - 1.5, top - 18, 3, 26);
        } else if (b.type < .55) { // hotel: one rounded corner
          x.moveTo(b.x, lh); x.lineTo(b.x, top + b.w * .5); x.quadraticCurveTo(b.x, top, b.x + b.w * .5, top); x.lineTo(b.x + b.w, top); x.lineTo(b.x + b.w, lh); x.fill();
        } else { x.rect(b.x, top, b.w, b.h); x.fill(); }
        if (far) continue;
        // neon trim along the roofline
        x.save(); x.shadowColor = b.type < .5 ? '#ff4fb8' : '#4ff0ff'; x.shadowBlur = 8; x.strokeStyle = b.type < .5 ? '#ff7fd0' : '#8ff6ff'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(b.x + 2, top + (b.type < .3 ? 14 : 2)); x.lineTo(b.x + b.w - 2, top + (b.type < .3 ? 14 : 2)); x.stroke(); x.restore();
        // windows (lit ones are drawn live)
        const cols = Math.max(1, Math.floor((b.w - 8) / 8)), rows = Math.floor((b.h - 22) / 10), ox = b.x + (b.w - cols * 8) / 2 + 2;
        for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
          const wx = ox + k * 8, wy = top + 20 + r * 10;
          x.fillStyle = 'rgba(20,4,40,.35)'; x.fillRect(wx, wy, 4, 5);
          if (RR() < .42) wins.push({ x: wx, y: wy, c: RR() < .7 ? 0 : RR() < .6 ? 1 : 2, ph: RR() * 6.28, sp: .2 + RR() * 1.4, th: .2 + RR() * .9 });
        }
        if (b.h > lh * .6 && RR() < .55 && signs.length < 3) signs.push({ x: b.x + b.w * .5, y: top + 30, word: ['HOTEL', 'VICE', 'OCEAN', 'CLUB', 'MOTEL'][signs.length + (seed % 3)], col: RR() < .5 ? '#ff4fb8' : '#4ff0ff' });
      }
      // neon signs, pre-lit
      const sg = signs.map(s => { const fs = 13, [sc, sx2] = mk(fs + 22, s.word.length * (fs + 3) + 22); sx2.font = `${fs}px Anton, Impact, sans-serif`; sx2.textAlign = 'center'; sx2.shadowColor = s.col; sx2.shadowBlur = 10; sx2.fillStyle = '#fff';
        [...s.word].forEach((ch, i) => sx2.fillText(ch, (fs + 22) / 2, 11 + fs + i * (fs + 3))); return { ...s, c: sc, cw: fs + 22, ch: s.word.length * (fs + 3) + 22 }; });
      return { c, lh, wins, signs: sg };
    };
    L = { sky, sea, clouds, far: city(11, true), near: city(23, false) };
    // shoreline palms in front of the near skyline
    const P = rnd(5); L.shore = [];
    for (let i = 0; i < 9; i++) { const left = i < 5, xx = left ? w * (.02 + P() * .3) : w * (.68 + P() * .3); L.shore.push({ x: xx, h: hz * (.16 + P() * .14), lean: (P() - .5) * .3, ph: P() * 6 }); }
  }

  function resize() {
    const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight;
    S.w = w; S.h = h; S.wide = w >= 760; S.dpr = Math.min(devicePixelRatio || 1, S.wide ? 1.5 : 2);
    cv.width = Math.round(w * S.dpr); cv.height = Math.round(h * S.dpr);
    S.hz = Math.round(h * (S.wide ? .66 : .6));
    layers();
  }
  addEventListener('resize', () => { clearTimeout(S.rt); S.rt = setTimeout(resize, 120); });
  addEventListener('pointermove', e => { S.tmx = (e.clientX / innerWidth - .5) * 2; S.tmy = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
  resize();

  const B = rnd(99);
  function frame(now) {
    requestAnimationFrame(frame);
    if (S.paused || document.hidden) return;
    const t = reduced ? 30 : (now - S.t0) / 1000, { w, h, hz } = S, dt = 1 / 60;
    S.mx += (S.tmx - S.mx) * .05; S.my += (S.tmy - S.my) * .05; S.heat += (S.heatTo - S.heat) * .06;
    S.zoom += (S.zoomTo - S.zoom) * S.zr; S.dim += (S.dimTo - S.dim) * .06;
    // inside the world the backdrop only needs 30 fps
    if (S.dim > .3 && S.zoomTo < 1.2 && (S.skip = (S.skip + 1) % 2)) return;
    const px = k => -S.mx * k;
    // the dive: everything scales around the sun
    const z = S.zoom, zx = w / 2, zy = hz * .9;
    g.setTransform(S.dpr * z, 0, 0, S.dpr * z, S.dpr * zx * (1 - z), S.dpr * zy * (1 - z));
    // intro timing
    const kSky = ease(t / .9), kSun = ease((t - .1) / 1.6), kCity = ease((t - .45) / 1.1), kWin = clamp((t - 1.1) / 1.2, 0, 1), kGrid = ease((t - .8) / 1.2), kPalm = ease((t - .5) / 1.3);
    g.drawImage(L.sky, 0, 0, w, hz);
    // clouds
    for (const c of L.clouds) { const x = ((c.x - t * c.v) % (w + c.cw) + w + c.cw) % (w + c.cw) - c.cw + px(4 * c.p * 10); g.globalAlpha = kSky * .9; g.drawImage(c.c, x, c.y, c.cw, c.ch); }
    g.globalAlpha = 1;
    // the sun: stepped halo rings, then the disc with stripes sliding up
    const r = Math.min(w * (S.wide ? .17 : .34), h * .27), sx0 = w / 2 + px(3), sy = hz - r * .38 + (1 - kSun) * r * 1.5;
    const pulse = reduced ? 0 : Math.sin(t * .8) * .02;
    [[1.95, .05], [1.62, .08], [1.38, .11], [1.18, .16]].forEach(([k, a]) => { g.fillStyle = `rgba(255,120,190,${a * kSun})`; g.beginPath(); g.arc(sx0, sy, r * (k + pulse), 0, 6.283); g.fill(); });
    g.save(); g.beginPath(); g.rect(0, 0, w, hz); g.clip();
    g.beginPath(); g.arc(sx0, sy, r, 0, 6.283); g.save(); g.clip();
    let gr = g.createLinearGradient(0, sy - r, 0, sy + r); gr.addColorStop(0, '#fff47c'); gr.addColorStop(.48, '#ffa23f'); gr.addColorStop(1, '#ff3d8f'); g.fillStyle = gr; g.fillRect(sx0 - r, sy - r, r * 2, r * 2);
    // stripes: gaps that drift upward and thin out toward the top
    const off = reduced ? 0 : (t * 9) % (r * .16);
    for (let i = 0; i < 9; i++) {
      const y = sy + r * .02 + i * r * .16 - off; if (y > sy + r) continue;
      const th = Math.max(0, (y - sy) / r) * r * .1 + 1;
      g.drawImage(L.sky, (sx0 - r - 2) * S.dpr, y * S.dpr, (r * 2 + 4) * S.dpr, th * S.dpr, sx0 - r - 2, y, r * 2 + 4, th);
      g.fillStyle = `rgba(255,120,190,${.35 * kSun})`; g.fillRect(sx0 - r - 2, y, r * 2 + 4, th);
    }
    g.restore(); g.restore();
    // far skyline (rises out of the sea during the intro)
    g.save(); g.beginPath(); g.rect(0, 0, w, hz); g.clip();
    g.drawImage(L.far.c, px(6), hz - L.far.lh + (1 - kCity) * L.far.lh, w, L.far.lh);
    // helicopter (passes now and then; hovers over the card while a wash runs)
    heli(t, px);
    // near skyline + live windows + signs
    const ny = hz - L.near.lh + (1 - ease((t - .6) / 1.1)) * L.near.lh, nx = px(12);
    g.drawImage(L.near.c, nx, ny, w, L.near.lh);
    const wave = kWin * w * 1.2;
    for (let c = 0; c < 3; c++) {
      g.fillStyle = WIN[c];
      for (const wn of L.near.wins) { if (wn.c !== c || wn.x > wave) continue; if (Math.sin(t * wn.sp + wn.ph) < wn.th - .6) continue; g.fillRect(wn.x + nx, wn.y + ny, 4, 5); }
    }
    for (const s of L.near.signs) { const fl = Math.sin(t * 13 + s.x) > .93 ? .35 : 1; g.globalAlpha = kWin * fl; g.drawImage(s.c, s.x - s.cw / 2 + nx, s.y + ny, s.cw, s.ch); }
    g.globalAlpha = 1;
    // shoreline palms
    for (const p of L.shore) palm(g, p.x + px(16), hz + 2 + (1 - kCity) * p.h * 1.2, p.h, p.lean + Math.sin(t * .9 + p.ph) * .025, '#2b0b55');
    g.restore();
    // the sea
    g.drawImage(L.sea, 0, hz, w, h - hz + 2);
    seaFx(t, kSun, kGrid, sx0, r, px);
    // gulls
    birds(t, px);
    // foreground palms swing in from the sides
    const big = h * (S.wide ? .78 : .5), sw = reduced ? 0 : Math.sin(t * .7) * .02;
    palm(g, w * (S.wide ? .035 : -.02) + px(26) - (1 - kPalm) * w * .2, h * 1.04, big, .13 + sw, '#1e0742');
    palm(g, w * (S.wide ? .11 : .1) + px(24) - (1 - kPalm) * w * .2, h * 1.05, big * .62, .05 + sw * 1.3, '#2b0b55');
    palm(g, w * (S.wide ? .975 : 1.02) + px(26) + (1 - kPalm) * w * .2, h * 1.04, big * 1.05, -.14 - sw, '#1e0742');
    palm(g, w * (S.wide ? .9 : .9) + px(24) + (1 - kPalm) * w * .2, h * 1.05, big * .58, -.04 - sw * 1.2, '#2b0b55');
    // glints
    sparks(t);
    // police lights at the edges when there's heat
    if (S.heat > .01) {
      const ph = Math.floor(t * 5) % 2, a = S.heat * .32;
      gr = g.createLinearGradient(0, 0, w * .3, 0); gr.addColorStop(0, ph ? `rgba(255,40,70,${a})` : `rgba(40,90,255,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w * .3, h);
      gr = g.createLinearGradient(w, 0, w * .7, 0); gr.addColorStop(0, ph ? `rgba(40,90,255,${a})` : `rgba(255,40,70,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(w * .7, 0, w * .3, h);
    }
    // the dusk curtain lifting at the start
    if (kSky < 1) { g.fillStyle = `rgba(27,7,56,${1 - kSky})`; g.fillRect(0, 0, w, h); }
    // inside the world: a dusk veil so the app reads on top
    g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    if (S.dim > .005) { g.fillStyle = `rgba(16,4,38,${S.dim})`; g.fillRect(0, 0, w, h); }
  }

  function seaFx(t, kSun, kGrid, sx0, r, px) {
    const { w, h, hz } = S, depth = h - hz;
    // the sun's reflection: shimmering bars under it
    for (let i = 0; i < 16; i++) {
      const y = hz + 3 + i * i * depth * .0032 + i * 3, k = 1 - i / 16;
      const len = r * (1.1 - i * .035) * (.75 + .25 * Math.sin(t * 2.2 + i * 1.7));
      g.fillStyle = i < 5 ? `rgba(255,240,150,${.75 * k * kSun})` : `rgba(255,150,200,${.55 * k * kSun})`;
      g.fillRect(sx0 - len / 2 + Math.sin(t * 1.3 + i) * 6, y, len, 2 + i * .25);
    }
    // the neon grid: lines rushing toward you
    g.save(); g.globalAlpha = kGrid;
    const vx = w / 2 + px(10), z0 = (t * .55) % 1;
    for (let i = 0; i < 18; i++) {
      const z = (i + 1 - z0) / 18, y = hz + depth * Math.pow(z, 2.3); if (y < hz + 2) continue;
      g.strokeStyle = `rgba(120,240,255,${.06 + z * .42})`; g.lineWidth = .6 + z * 1.6; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    for (let i = -14; i <= 14; i++) {
      const x1 = vx + i * w * .09, x0 = vx + i * w * .006;
      const lg = g.createLinearGradient(0, hz, 0, h); lg.addColorStop(0, 'rgba(255,90,200,0)'); lg.addColorStop(1, 'rgba(255,110,210,.55)');
      g.strokeStyle = lg; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, hz); g.lineTo(x1, h); g.stroke();
    }
    g.restore();
    // a soft band so the HUD reads at the bottom
    const lg = g.createLinearGradient(0, h - depth * .55, 0, h); lg.addColorStop(0, 'rgba(27,7,56,0)'); lg.addColorStop(1, 'rgba(27,7,56,.55)'); g.fillStyle = lg; g.fillRect(0, h - depth * .55, w, depth * .55);
  }

  function heli(t, px) {
    const H = S.heli, { w, hz } = S;
    if (H.x < -0.5 && t > H.next && !reduced) { H.dir = B() < .5 ? -1 : 1; H.x = H.dir < 0 ? w + 60 : -60; H.y = hz * (.16 + B() * .14); H.v = 70 + B() * 40; }
    if (S.heat > .3 && H.x < -0.5) { H.dir = -1; H.x = w + 60; H.y = hz * .2; H.v = 90; }
    if (H.x < -0.5) return;
    const target = S.heat > .3 ? w * .5 : null;
    if (target != null && Math.abs(H.x - target) > 4) H.x += Math.sign(target - H.x) * Math.min(Math.abs(target - H.x), H.v / 60);
    else if (target == null) H.x += H.dir * H.v / 60;
    if (target == null && (H.x < -80 || H.x > w + 80)) { H.x = -1; H.next = t + 18 + B() * 18; return; }
    const x = H.x + px(8), y = H.y + Math.sin(t * 2) * 3;
    // searchlight
    const sw = Math.sin(t * .9) * .35, len = S.h;
    g.save(); g.translate(x, y + 6); g.rotate(sw);
    const lg = g.createLinearGradient(0, 0, 0, len); lg.addColorStop(0, `rgba(255,250,220,${.32 + S.heat * .2})`); lg.addColorStop(1, 'rgba(255,250,220,0)');
    g.fillStyle = lg; g.beginPath(); g.moveTo(-3, 0); g.lineTo(3, 0); g.lineTo(len * .16, len); g.lineTo(-len * .16, len); g.closePath(); g.fill(); g.restore();
    // body
    g.save(); g.translate(x, y); g.scale(H.dir < 0 ? 1 : -1, 1); g.fillStyle = '#25093f';
    g.beginPath(); g.ellipse(0, 0, 17, 8, 0, 0, 6.283); g.fill(); g.fillRect(10, -3, 30, 4); g.fillRect(36, -9, 4, 10);
    g.fillRect(-14, 9, 26, 2); g.fillRect(-9, 6, 2, 4); g.fillRect(5, 6, 2, 4);
    g.fillStyle = 'rgba(160,230,255,.85)'; g.beginPath(); g.ellipse(-8, -1, 6, 4, 0, 0, 6.283); g.fill();
    const rot = (t * 40) % 1; g.fillStyle = 'rgba(37,9,63,.6)'; g.fillRect(-24 + rot * 4, -11, 48 - rot * 8, 2); g.fillRect(-1, -11, 2, 4);
    const bl = Math.floor(t * (S.heat > .3 ? 6 : 2)) % 2;
    g.fillStyle = bl ? '#ff2a4a' : '#2a6bff'; g.beginPath(); g.arc(2, -8, 2.4, 0, 6.283); g.fill();
    g.restore();
  }

  function birds(t, px) {
    const { w, hz } = S;
    if (!reduced && S.birds.length < 4 && B() < .004) S.birds.push({ x: -20, y: hz * (.3 + B() * .4), v: 26 + B() * 26, s: .7 + B() * .6, ph: B() * 6 });
    g.strokeStyle = '#3a1060'; g.lineWidth = 1.6; g.lineCap = 'round';
    S.birds = S.birds.filter(b => {
      b.x += b.v / 60; const f = Math.sin(t * 9 + b.ph) * 4 * b.s, x = b.x + px(5), y = b.y + Math.sin(t + b.ph) * 4;
      g.beginPath(); g.moveTo(x - 7 * b.s, y - f); g.quadraticCurveTo(x - 3 * b.s, y - 3 * b.s, x, y); g.quadraticCurveTo(x + 3 * b.s, y - 3 * b.s, x + 7 * b.s, y - f); g.stroke();
      return b.x < w + 30;
    });
  }

  function sparks(t) {
    const { w, h } = S;
    if (!reduced && S.sparks.length < 14 && B() < .12) S.sparks.push({ x: w * (.25 + B() * .5), y: h * (.18 + B() * .62), born: t, life: .8 + B() * 1.2, s: 3 + B() * 6 });
    g.fillStyle = '#fff';
    S.sparks = S.sparks.filter(p => {
      const u = (t - p.born) / p.life; if (u > 1) return false;
      const a = Math.sin(u * Math.PI), s = p.s * a;
      g.globalAlpha = a * .9; g.beginPath(); g.moveTo(p.x, p.y - s); g.quadraticCurveTo(p.x, p.y, p.x + s, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y + s); g.quadraticCurveTo(p.x, p.y, p.x - s, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y - s); g.fill();
      return true;
    });
    g.globalAlpha = 1;
  }

  requestAnimationFrame(frame);
  return {
    heat(on) { S.heatTo = on ? 1 : 0; },
    // dive into the sun, then settle inside behind the app
    dive() { S.zr = .055; S.zoomTo = 2.1; setTimeout(() => { S.zr = .07; S.zoomTo = 1.06; S.dimTo = .52; }, 650); },
    inside() { S.zr = 1; S.zoom = S.zoomTo = 1.06; S.dim = S.dimTo = .52; },
    leave() { S.zr = .07; S.zoomTo = 1; S.dimTo = 0; },
    pause(p) { S.paused = !!p; },
  };
}
