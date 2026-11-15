// VICE · the card's print: one drawing used by the 3D card on the home screen and by the card studio.
// Five colourways, one to five wanted stars, an optional holder name and an optional "clean SOL" amount.
export const WAYS = {
  vice:    { name: 'Neon',    base: ['#ff2a8f', '#b23dff', '#14d6ea'], sun: ['#fff47c', '#ffa23f', '#ff3d8f'], palm: '#2b0b55', sea: ['rgba(30,8,70,.55)', 'rgba(30,8,70,.85)'], edge: 0x3a0f6b },
  sunset:  { name: 'Sunset',  base: ['#ffb03a', '#ff4e7d', '#7b2cff'], sun: ['#fffbd0', '#ffe066', '#ff8a3d'], palm: '#3a0b3d', sea: ['rgba(60,8,50,.5)', 'rgba(60,8,50,.8)'], edge: 0x5a1440 },
  violet:  { name: 'Violet',  base: ['#7b2cff', '#c23dff', '#ff4fa3'], sun: ['#fff47c', '#ff9a3d', '#ff3d8f'], palm: '#1d0640', sea: ['rgba(20,4,50,.55)', 'rgba(20,4,50,.85)'], edge: 0x2a0a5e },
  stealth: { name: 'Stealth', base: ['#2a2a42', '#16161f', '#0b0b12'], sun: ['#ff4fa3', '#c23dff', '#5a2bd6'], palm: '#000000', sea: ['rgba(0,0,0,.6)', 'rgba(0,0,0,.85)'], edge: 0x111118 },
  gold:    { name: 'Gold',    base: ['#ffe680', '#ffb347', '#ff6b6b'], sun: ['#ffffff', '#fff2b0', '#ffd25a'], palm: '#5a2400', sea: ['rgba(90,30,0,.3)', 'rgba(90,30,0,.5)'], edge: 0x8a4a12 },
};
export function star(g, cx, cy, r, fill) {
  g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  g.closePath(); g.fillStyle = fill; g.fill();
}
export function palm(g, x, y, h, lean, col) {
  const tx = x + lean * h, ty = y - h, wb = h * .055, wt = h * .022;
  g.fillStyle = col; g.beginPath();
  g.moveTo(x - wb, y); g.quadraticCurveTo(x - wb + lean * h * .2, y - h * .55, tx - wt, ty); g.lineTo(tx + wt, ty); g.quadraticCurveTo(x + wb + lean * h * .25, y - h * .5, x + wb, y); g.closePath(); g.fill();
  const L = h * .46;
  for (const [a, k] of [[-172, .95], [-148, 1], [-120, .82], [-92, .7], [-62, .84], [-34, 1], [-8, .92], [18, .7], [-198, .7]]) {
    const r = a * Math.PI / 180, len = L * k, droop = len * .38 * Math.abs(Math.cos(r)) + len * .08;
    const ex = tx + Math.cos(r) * len, ey = ty + Math.sin(r) * len + droop;
    const mx = tx + Math.cos(r) * len * .5, my = ty + Math.sin(r) * len * .5 - len * .12, nx = -Math.sin(r) * len * .13, ny = Math.cos(r) * len * .13;
    g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(mx + nx, my + ny, ex, ey); g.quadraticCurveTo(mx - nx, my - ny + len * .1, tx, ty); g.fill();
  }
  g.beginPath(); g.arc(tx, ty + h * .01, h * .035, 0, Math.PI * 2); g.fill();
}
// the print, onto a canvas you pass in (any width; height = width * 0.631)
export function drawCard(c, { way = 'vice', stars = 5, flip = false, name = 'TRENCH RESIDENT', amount = null, round = 0 } = {}) {
  const WY = WAYS[way] || WAYS.vice, g = c.getContext('2d'), CW = c.width, CH = c.height;
  g.save(); g.clearRect(0, 0, CW, CH);
  if (round) { g.beginPath(); g.roundRect(0, 0, CW, CH, round); g.clip(); }
  const base = () => { const gr = g.createLinearGradient(0, 0, CW, CH); WY.base.forEach((s, i) => gr.addColorStop([0, .42, 1][i], s)); return gr; };
  g.fillStyle = base(); g.fillRect(0, 0, CW, CH);
  let gr = g.createLinearGradient(CW * .2, 0, CW * .55, CH); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.10)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, CW, CH);
  const sx = flip ? CW * .3 : CW * .74, sy = CH * .6, sr = CH * .37;
  g.save(); g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.clip();
  gr = g.createLinearGradient(0, sy - sr, 0, sy + sr); gr.addColorStop(0, WY.sun[0]); gr.addColorStop(.48, WY.sun[1]); gr.addColorStop(1, WY.sun[2]); g.fillStyle = gr; g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  g.fillStyle = base(); for (let i = 0; i < 6; i++) { const y = sy + sr * (.06 + i * .155); g.fillRect(sx - sr - 2, y, sr * 2 + 4, sr * (.028 + i * .021)); }
  g.restore();
  gr = g.createLinearGradient(0, CH * .86, 0, CH); gr.addColorStop(0, WY.sea[0]); gr.addColorStop(1, WY.sea[1]); g.fillStyle = gr; g.fillRect(flip ? 0 : CW * .45, CH * .86, CW * .55, CH * .14);
  if (flip) { palm(g, CW * .12, CH * 1.03, CH * .8, .14, WY.palm); palm(g, CW * .4, CH * 1.04, CH * .58, -.1, WY.palm); }
  else { palm(g, CW * .9, CH * 1.02, CH * .82, -.15, WY.palm); palm(g, CW * .6, CH * 1.04, CH * .6, .12, WY.palm); }
  // the chrome wordmark
  g.save(); g.translate(flip ? CW * .56 : CW * .065, CH * .36); g.transform(1, 0, -.2, 1, 0, 0);
  g.font = `${CH * .29}px Anton, Impact, sans-serif`; g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(40,6,80,.75)'; g.fillText('VICE', CH * .011, CH * .012);
  const cg = g.createLinearGradient(0, -CH * .25, 0, 0); cg.addColorStop(0, '#ffffff'); cg.addColorStop(.44, '#c9f2ff'); cg.addColorStop(.5, '#3a2b92'); cg.addColorStop(.6, '#ff9be0'); cg.addColorStop(1, '#ffffff');
  g.fillStyle = cg; g.fillText('VICE', 0, 0); g.lineWidth = Math.max(1, CH * .004); g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText('VICE', 0, 0);
  g.restore();
  // chip and contactless
  const chx = flip ? CW * .56 + CH * .02 : CW * .085, chy = CH * .44;
  gr = g.createLinearGradient(chx, chy, chx + CH * .2, chy + CH * .16); gr.addColorStop(0, '#f6dd8c'); gr.addColorStop(.5, '#d9b04f'); gr.addColorStop(1, '#f3d27a');
  g.fillStyle = gr; g.beginPath(); g.roundRect(chx, chy, CH * .2, CH * .16, CH * .025); g.fill();
  g.strokeStyle = 'rgba(110,70,10,.5)'; g.lineWidth = Math.max(1, CH * .006); g.strokeRect(chx + CH * .065, chy + CH * .03, CH * .07, CH * .1);
  for (const yy of [.055, .08, .105]) { g.beginPath(); g.moveTo(chx, chy + CH * yy * 1.4); g.lineTo(chx + CH * .065, chy + CH * yy * 1.4); g.moveTo(chx + CH * .135, chy + CH * yy * 1.4); g.lineTo(chx + CH * .2, chy + CH * yy * 1.4); g.stroke(); }
  g.save(); g.translate(chx + CH * .3, chy + CH * .08); g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = CH * .014; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-CH * .05, 0, CH * (.026 + i * .024), -Math.PI / 4, Math.PI / 4); g.stroke(); } g.restore();
  // stars, name, valid thru (GTA VI lands 11/19), an optional amount
  const lx = flip ? CW * .56 : CW * .065;
  for (let i = 0; i < 5; i++) star(g, lx + CH * .035 + i * CH * .085, CH * .745, CH * .034, i < stars ? '#ffffff' : 'rgba(255,255,255,.3)');
  g.fillStyle = 'rgba(255,255,255,.96)'; g.font = `700 ${CH * .052}px Inter, sans-serif`;
  const nm = String(name || '').toUpperCase().slice(0, 22); g.fillText(nm, lx, CH * .895);
  if (!flip) { g.font = `700 ${CH * .03}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('VALID THRU', CW * .44, CH * .86); g.font = `700 ${CH * .048}px Inter, sans-serif`; g.fillText('11/19', CW * .44, CH * .91); }
  if (amount != null) {
    // a dark pill in the top corner over the palms: "CLEAN SOL" and the amount
    const at = String(amount);
    g.font = `${CH * .085}px Anton, Impact, sans-serif`; const aw = g.measureText(at).width;
    g.font = `800 ${CH * .036}px Inter, sans-serif`; const sw = g.measureText('SOL').width;
    const pw = aw + sw + CH * .1, ph = CH * .17, px = flip ? CW * .045 : CW * .955 - pw, py = CH * .055;
    g.fillStyle = 'rgba(27,7,56,.62)'; g.beginPath(); g.roundRect(px, py, pw, ph, ph * .28); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `800 ${CH * .026}px Inter, sans-serif`; g.fillText('CLEAN SOL', px + CH * .04, py + CH * .052);
    g.fillStyle = '#8dffbe'; g.font = `${CH * .085}px Anton, Impact, sans-serif`; g.fillText(at, px + CH * .04, py + CH * .145);
    g.fillStyle = '#fff'; g.font = `800 ${CH * .036}px Inter, sans-serif`; g.fillText('SOL', px + CH * .04 + aw + CH * .02, py + CH * .145);
  }
  g.restore();
  return c;
}
