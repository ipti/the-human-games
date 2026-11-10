/* Regata do Crasto — corrida de barcos a vela no mangue do Povoado do Crasto (Santa Luzia do Itanhy, SE) */
const ASSET = {
  ligeiro_hull: 'assets/ligeiro_hull.webp',
  ligeiro_spray: 'assets/ligeiro_spray.webp',
  resistente_hull: 'assets/resistente_hull.webp',
  resistente_spray: 'assets/resistente_spray.webp',
  marisqueira: 'assets/marisqueira.webp',
  caranguejo: 'assets/caranguejo.webp'
};
'use strict';
/* ===================== NÚCLEO: utilidades, traçado e grade ===================== */
const TAU = Math.PI * 2, ISO_X = Math.SQRT1_2, ISO_Y = Math.SQRT1_2 * 0.5, HZ = 0.9;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const srand = mulberry32(917);
const sr = (a, b) => a + srand() * (b - a);
const pickS = arr => arr[Math.floor(srand() * arr.length)];

/* Mundo: grade 100 x 140 + margem de mangue */
const PAD = 8, WX0 = -PAD, WY0 = -PAD, WW = 100 + PAD * 2, WH = 140 + PAD * 2;
const HW = 3, SHW = 1.5, SHALLOW = 2.6, SSHALLOW = 1.6, LAPS = 3;

/* Traçado principal, sentido horário, começando na largada */
const CTRL = [
  [20, 104], [19, 98], [11, 86], [6, 77], [5, 74],                       // setor 1
  [5, 45], [6, 32], [9, 30], [34, 29], [40, 23], [50, 11], [74, 7],       // setor 2
  [84, 7], [88, 11], [89, 21], [87, 51], [96, 66], [96, 71],              // setor 3
  [94, 121], [90, 128], [64, 131], [36, 134], [23, 134], [16, 134], [13, 128], [14, 124], [20, 119] // setor 4
];
const SECTOR_CTRL = [0, 4, 11, 17];
const SECTORS = [
  { name: 'Pedras', color: '#ef8a3c' },
  { name: 'Animais e curvas', color: '#86cf5c' },
  { name: 'Recuperar vida', color: '#f4d548' },
  { name: 'Ondas e chegada', color: '#5fcbe8' }
];
const SHORTCUT_CTRL = [
  [[5, 45], [13, 44], [19, 40], [21, 35], [26, 29]],
  [[23, 134], [21, 123], [20, 119]]
];
const ISLAND = { x: 50, y: 69, rx: 12, ry: 18.5 };
const LAGOON = { x: 50, y: 69, rx: 16.5, ry: 23 };
const VILLAGE = { x: 6.5, y: 111, r: 5.4 };

/* Catmull-Rom centrípeta (passa exatamente pelos pontos do traçado) */
function crp(p0, p1, p2, p3, t0, t1, t2, t3, t) {
  const f = (pa, pb, ta, tb) => { const w = (tb - ta) || 1e-6, a = (tb - t) / w, b = (t - ta) / w; return [pa[0] * a + pb[0] * b, pa[1] * a + pb[1] * b]; };
  const A1 = f(p0, p1, t0, t1), A2 = f(p1, p2, t1, t2), A3 = f(p2, p3, t2, t3);
  const B1 = f(A1, A2, t0, t2), B2 = f(A2, A3, t1, t3);
  return f(B1, B2, t1, t2);
}
function buildPath(ctrl, closed, step = 0.5) {
  const n = ctrl.length;
  const P = i => {
    if (closed) return ctrl[((i % n) + n) % n];
    if (i < 0) { const a = ctrl[0], b = ctrl[1]; return [2 * a[0] - b[0], 2 * a[1] - b[1]]; }
    if (i >= n) { const a = ctrl[n - 1], b = ctrl[n - 2]; return [2 * a[0] - b[0], 2 * a[1] - b[1]]; }
    return ctrl[i];
  };
  const raw = [], ctrlRaw = [];
  const segs = closed ? n : n - 1;
  const kd = (a, b) => Math.max(1e-3, Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5));
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const t0 = 0, t1 = t0 + kd(p0, p1), t2 = t1 + kd(p1, p2), t3 = t2 + kd(p2, p3);
    const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 0.2));
    ctrlRaw.push(raw.length);
    for (let k = 0; k < m; k++) raw.push(crp(p0, p1, p2, p3, t0, t1, t2, t3, t1 + (t2 - t1) * k / m));
  }
  if (!closed) { raw.push(ctrl[n - 1].slice()); ctrlRaw.push(raw.length - 1); }
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  let L = cum[cum.length - 1];
  if (closed) L += Math.hypot(raw[0][0] - raw[raw.length - 1][0], raw[0][1] - raw[raw.length - 1][1]);
  const ctrlS = ctrlRaw.map(i => cum[i]);
  const N = Math.max(2, Math.round(L / step)), st = L / N;
  const cumAt = i => i < raw.length ? cum[i] : L;
  const rawAt = i => raw[i % raw.length];
  const pts = [];
  let j = 0;
  const count = closed ? N : N + 1;
  for (let k = 0; k < count; k++) {
    const s = k * st;
    while (j < raw.length - (closed ? 0 : 1) - 1 + (closed ? 0 : 0) && cumAt(j + 1) < s) j++;
    const a = rawAt(j), b = (j + 1 < raw.length) ? raw[j + 1] : (closed ? raw[0] : raw[j]);
    const c0 = cumAt(j), c1 = cumAt(j + 1);
    const t = c1 > c0 ? clamp((s - c0) / (c1 - c0), 0, 1) : 0;
    pts.push({ x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t) });
  }
  const M = pts.length;
  for (let k = 0; k < M; k++) {
    const a = pts[closed ? (k - 1 + M) % M : Math.max(0, k - 1)], b = pts[closed ? (k + 1) % M : Math.min(M - 1, k + 1)];
    let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    Object.assign(pts[k], { tx, ty, nx: -ty, ny: tx, s: k * st });
  }
  return { pts, L, step: st, closed, ctrlS };
}
function ptAt(path, s) {
  const M = path.pts.length;
  if (path.closed) { s = ((s % path.L) + path.L) % path.L; return path.pts[Math.round(s / path.step) % M]; }
  return path.pts[clamp(Math.round(s / path.step), 0, M - 1)];
}

const MAIN = buildPath(CTRL, true);
const SECTOR_S = SECTOR_CTRL.map(i => MAIN.ctrlS[i]);
const wrapS = s => ((s % MAIN.L) + MAIN.L) % MAIN.L;
function nearestMainS(x, y) { let best = 1e9, bs = 0; for (const p of MAIN.pts) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < best) { best = d; bs = p.s; } } return bs; }
const SC = SHORTCUT_CTRL.map(c => { const path = buildPath(c, false); return { path, sIn: nearestMainS(c[0][0], c[0][1]), sOut: nearestMainS(c[c.length - 1][0], c[c.length - 1][1]) }; });

/* Grade de distâncias ao canal (para terreno, progresso e colisão) */
const GRES = 0.5, GW = Math.ceil(WW / GRES), GH = Math.ceil(WH / GRES), GN = GW * GH;
const gM = new Float32Array(GN).fill(99), gMi = new Int32Array(GN).fill(-1);
const gS = new Float32Array(GN).fill(99), gSi = new Int32Array(GN).fill(-1), gSid = new Int8Array(GN).fill(-1);
function stamp(path, dArr, iArr, idArr, id, R) {
  const r = Math.ceil(R / GRES);
  path.pts.forEach((p, k) => {
    const cx = Math.floor((p.x - WX0) / GRES), cy = Math.floor((p.y - WY0) / GRES);
    for (let yy = cy - r; yy <= cy + r; yy++) {
      if (yy < 0 || yy >= GH) continue;
      const wy = WY0 + (yy + 0.5) * GRES;
      for (let xx = cx - r; xx <= cx + r; xx++) {
        if (xx < 0 || xx >= GW) continue;
        const wx = WX0 + (xx + 0.5) * GRES, d = Math.hypot(wx - p.x, wy - p.y), i = yy * GW + xx;
        if (d < dArr[i]) { dArr[i] = d; iArr[i] = k; if (idArr) idArr[i] = id; }
      }
    }
  });
}
stamp(MAIN, gM, gMi, null, 0, 10);
SC.forEach((sc, i) => stamp(sc.path, gS, gSi, gSid, i, 7));

function cellIdx(x, y) { const xx = Math.floor((x - WX0) / GRES), yy = Math.floor((y - WY0) / GRES); if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) return -1; return yy * GW + xx; }
function sampleD(arr, x, y) {
  const fx = (x - WX0) / GRES - 0.5, fy = (y - WY0) / GRES - 0.5;
  let x0 = Math.floor(fx), y0 = Math.floor(fy); const tx = clamp(fx - x0, 0, 1), ty = clamp(fy - y0, 0, 1);
  x0 = clamp(x0, 0, GW - 2); y0 = clamp(y0, 0, GH - 2); const i = y0 * GW + x0;
  return lerp(lerp(arr[i], arr[i + 1], tx), lerp(arr[i + GW], arr[i + GW + 1], tx), ty);
}
const T_DEEP = 0, T_SC = 1, T_SHALLOW = 2, T_SOLID = 3;
function terrain(x, y) {
  if (x < WX0 + 0.6 || y < WY0 + 0.6 || x > WX0 + WW - 0.6 || y > WY0 + WH - 0.6) return T_SOLID;
  const dm = sampleD(gM, x, y), ds = sampleD(gS, x, y);
  if (dm <= HW) return T_DEEP;
  if (ds <= SHW) return T_SC;
  if (dm <= HW + SHALLOW - 0.45 || ds <= SHW + SSHALLOW - 0.45) return T_SHALLOW;
  return T_SOLID;
}
function isWater(x, y) { return terrain(x, y) !== T_SOLID; }
/* Posição na pista: s (distância ao longo do traçado), deslocamento lateral, atalho */
function trackInfo(x, y) {
  const i = cellIdx(x, y); if (i < 0) return null;
  const dm = gM[i], ds = gS[i];
  if (ds < dm && gSi[i] >= 0) {
    const sc = SC[gSid[i]], f = gSi[i] / (sc.path.pts.length - 1);
    return { s: wrapS(sc.sIn + f * (sc.sOut - sc.sIn)), lat: 99, onShort: true, sc: gSid[i], k: gSi[i] };
  }
  if (gMi[i] < 0) return null;
  const p = MAIN.pts[gMi[i]];
  return { s: wrapS(p.s + (x - p.x) * p.tx + (y - p.y) * p.ty), lat: (x - p.x) * p.nx + (y - p.y) * p.ny, onShort: false, p };
}
/* Ponto de água mais próximo (para empurrar o barco de volta ao canal) */
function nearestChannelPoint(x, y) {
  const i = cellIdx(x, y);
  if (i >= 0) {
    if (gS[i] < gM[i] && gSi[i] >= 0) return SC[gSid[i]].path.pts[gSi[i]];
    if (gMi[i] >= 0) return MAIN.pts[gMi[i]];
  }
  return ptAt(MAIN, nearestMainS(x, y));
}

/* ===================== SPRITES desenhados em código ===================== */
const SPX = 32; // pixels por unidade nos sprites "em pé"
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
/* sprite em pé: (ax, ay) é o ponto que encosta no chão, em unidades a partir do canto */
function sprite(wu, hu, ax, ay, fn) {
  const c = mkCanvas(wu * SPX, hu * SPX), g = c.getContext('2d');
  g.translate(ax * SPX, ay * SPX); g.scale(SPX, SPX); g.lineJoin = 'round'; g.lineCap = 'round';
  fn(g); return { c, ax: ax * SPX, ay: ay * SPX };
}
const INK = '#14261d';

function makeMangrove(seed) {
  const r = mulberry32(seed), R = (a, b) => a + r() * (b - a);
  return sprite(4.6, 4.8, 2.3, 4.5, g => {
    g.fillStyle = 'rgba(8,28,18,.35)'; g.beginPath(); g.ellipse(0.25, 0.05, 1.8, 0.55, 0, 0, TAU); g.fill();
    const top = -1.25;
    for (let i = 0; i < 8; i++) {
      const ex = R(-1.7, 1.7), sx = R(-0.15, 0.15);
      g.beginPath(); g.moveTo(sx, top); g.quadraticCurveTo(ex * 0.95, top - 0.25 + R(-0.1, 0.15), ex, R(-0.05, 0.05));
      g.strokeStyle = '#2e2116'; g.lineWidth = 0.17; g.stroke();
      g.strokeStyle = '#715438'; g.lineWidth = 0.07; g.stroke();
    }
    g.fillStyle = '#4b3524'; g.beginPath(); g.moveTo(-0.2, top + 0.1); g.lineTo(0.2, top + 0.1); g.lineTo(0.13, -2.6); g.lineTo(-0.13, -2.6); g.closePath(); g.fill();
    const blobs = []; for (let i = 0; i < 10; i++) blobs.push([R(-1.45, 1.45), R(-3.75, -2.35), R(0.55, 0.95)]);
    blobs.sort((a, b) => a[1] - b[1]);
    g.fillStyle = '#173f24'; for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x, y, rr + 0.09, 0, TAU); g.fill(); }
    const base = ['#2d6a37', '#2a6536', '#347538'][Math.floor(r() * 3)];
    g.fillStyle = base; for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
    g.fillStyle = '#4c9446'; for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x - 0.15 * rr, y - 0.22 * rr, rr * 0.62, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(196,236,150,.45)'; for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x - 0.3 * rr, y - 0.4 * rr, rr * 0.22, 0, TAU); g.fill(); }
  });
}
function makePalm(seed) {
  const r = mulberry32(seed), R = (a, b) => a + r() * (b - a);
  return sprite(5, 6.4, 2.5, 6.1, g => {
    g.fillStyle = 'rgba(8,28,18,.3)'; g.beginPath(); g.ellipse(0.7, 0.05, 1.6, 0.45, 0, 0, TAU); g.fill();
    const lean = R(0.3, 0.9), tx = lean, ty = -4.3;
    g.strokeStyle = '#5e4527'; g.lineWidth = 0.38; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(lean * 0.1, -2.4, tx, ty); g.stroke();
    g.strokeStyle = '#b48b55'; g.lineWidth = 0.26; g.stroke();
    g.strokeStyle = 'rgba(80,55,30,.7)'; g.lineWidth = 0.05;
    for (let t = 0.1; t < 1; t += 0.12) { const x = lerp(0, tx, t * t) + lean * 0.1 * (1 - t), y = lerp(0, ty, t); g.beginPath(); g.moveTo(x - 0.13, y); g.lineTo(x + 0.13, y - 0.03); g.stroke(); }
    const angles = [-2.9, -2.3, -1.6, -0.9, -0.3, 0.3, 2.6];
    for (const a0 of angles) {
      const a = a0 + R(-0.15, 0.15), len = R(1.7, 2.2);
      const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.55 + 0.7;
      const mx = tx + Math.cos(a) * len * 0.5, my = ty + Math.sin(a) * len * 0.3 - 0.35;
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(mx, my - 0.25, ex, ey); g.quadraticCurveTo(mx, my + 0.25, tx, ty);
      g.fillStyle = '#2f7d34'; g.fill(); g.strokeStyle = '#1b4d22'; g.lineWidth = 0.06; g.stroke();
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(mx, my, ex, ey); g.strokeStyle = '#7cc25a'; g.lineWidth = 0.04; g.stroke();
    }
    g.fillStyle = '#5b3a1f'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(tx - 0.15 + i * 0.16, ty + 0.18, 0.13, 0, TAU); g.fill(); }
  });
}
/* Casa de taipa/alvenaria em projeção isométrica */
function makeHouse(wall, roof, thatch, seed) {
  const r = mulberry32(seed);
  return sprite(4.4, 4, 2.2, 3, g => {
    const P = (x, y, z) => [(x - y) * ISO_X, (x + y) * ISO_Y - z * HZ];
    const poly = (pts, fill, stroke) => { g.beginPath(); pts.forEach((p, i) => { const q = P(...p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 0.05; g.stroke(); } };
    const w = 1.25, d = 1.0, h = 1.15, hr = 2.15, o = 0.22;
    g.fillStyle = 'rgba(8,28,18,.3)'; g.beginPath(); g.ellipse(0.25, 0.25, 1.9, 0.75, 0, 0, TAU); g.fill();
    const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * k)); return `rgb(${c[0]},${c[1]},${c[2]})`; };
    poly([[-w - o, -d - o, h], [w + o, -d - o, h], [w + o, 0, hr], [-w - o, 0, hr]], shade(roof, 0.75), INK);
    poly([[w, -d, 0], [w, d, 0], [w, d, h], [w, -d, h]], shade(wall, 0.8), INK);
    poly([[w, -d, h], [w, d, h], [w, 0, hr]], shade(wall, 0.8), INK);
    poly([[-w, d, 0], [w, d, 0], [w, d, h], [-w, d, h]], wall, INK);
    // taipa: trama de varas aparecendo
    if (thatch) {
      g.strokeStyle = 'rgba(70,45,25,.45)'; g.lineWidth = 0.035;
      for (let i = 1; i < 6; i++) { const a = P(-w + i * w / 3, d, 0.05), b = P(-w + i * w / 3, d, h - 0.05); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    }
    poly([[-0.25, d, 0], [0.25, d, 0], [0.25, d, 0.8], [-0.25, d, 0.8]], '#3b2617', INK);
    poly([[0.55, d, 0.45], [0.95, d, 0.45], [0.95, d, 0.8], [0.55, d, 0.8]], '#20333a', INK);
    poly([[w, -0.55, 0.45], [w, -0.15, 0.45], [w, -0.15, 0.8], [w, -0.55, 0.8]], '#20333a', INK);
    poly([[-w - o, d + o, h], [w + o, d + o, h], [w + o, 0, hr], [-w - o, 0, hr]], roof, INK);
    g.strokeStyle = thatch ? 'rgba(120,85,35,.55)' : 'rgba(90,30,20,.45)'; g.lineWidth = 0.04;
    for (let i = 1; i < 9; i++) { const t = i / 9; const a = P(-w - o + t * 2 * (w + o), d + o, h), b = P(-w - o + t * 2 * (w + o), 0, hr); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    if (thatch) { g.strokeStyle = 'rgba(250,225,150,.5)'; for (let i = 0; i < 14; i++) { const t = r(); const a = P(-w - o + t * 2 * (w + o), d + o, h); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a[0] + 0.02, a[1] + 0.12); g.stroke(); } }
  });
}
function makeRock(seed) {
  const r = mulberry32(seed), R = (a, b) => a + r() * (b - a);
  return sprite(2.2, 1.8, 1.1, 1.25, g => {
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(0, 0, 1.0, 0.4, 0, 0, TAU); g.fill();
    const pts = []; const n = 9;
    for (let i = 0; i < n; i++) { const a = Math.PI + i / (n - 1) * Math.PI; const rr = R(0.75, 0.95); pts.push([Math.cos(a) * rr * 0.95, Math.sin(a) * rr * 1.05]); }
    g.beginPath(); g.moveTo(-0.9, 0.08); pts.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(0.9, 0.08); g.quadraticCurveTo(0, 0.32, -0.9, 0.08); g.closePath();
    g.fillStyle = '#6f675c'; g.fill(); g.strokeStyle = '#2f2a24'; g.lineWidth = 0.07; g.stroke();
    g.fillStyle = '#9b9283'; g.beginPath(); g.ellipse(-0.2, -0.55, 0.42, 0.22, -0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(40,70,40,.6)'; g.beginPath(); g.ellipse(0.35, -0.08, 0.35, 0.1, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.06; g.beginPath(); g.ellipse(0, 0.08, 1.0, 0.3, 0, 0.1, Math.PI - 0.1); g.stroke();
  });
}
function makeBuoy(top, band, small) {
  const k = small ? 0.7 : 1;
  return sprite(1.2, 1.8, 0.6, 1.5, g => {
    g.scale(k, k);
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(0, 0, 0.45, 0.17, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-0.3, -0.05); g.lineTo(-0.16, -0.95); g.lineTo(0.16, -0.95); g.lineTo(0.3, -0.05); g.quadraticCurveTo(0, 0.1, -0.3, -0.05); g.closePath();
    g.fillStyle = top; g.fill(); g.strokeStyle = INK; g.lineWidth = 0.06; g.stroke();
    g.fillStyle = band; g.fillRect(-0.24, -0.5, 0.48, 0.17);
    g.strokeStyle = INK; g.lineWidth = 0.05; g.beginPath(); g.moveTo(0, -0.95); g.lineTo(0, -1.25); g.stroke();
    g.fillStyle = band; g.beginPath(); g.arc(0, -1.28, 0.08, 0, TAU); g.fill();
  });
}
function makeRepairBuoy() {
  return sprite(1.8, 2, 0.9, 1.5, g => {
    const gr = g.createRadialGradient(0, -0.5, 0.1, 0, -0.5, 0.9); gr.addColorStop(0, 'rgba(160,255,140,.55)'); gr.addColorStop(1, 'rgba(160,255,140,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, -0.5, 0.9, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(0, 0, 0.55, 0.2, 0, 0, TAU); g.fill();
    g.fillStyle = '#f2c230'; g.strokeStyle = INK; g.lineWidth = 0.06;
    g.beginPath(); g.ellipse(0, -0.1, 0.45, 0.17, 0, 0, Math.PI); g.lineTo(-0.45, -0.8); g.ellipse(0, -0.8, 0.45, 0.17, 0, Math.PI, 0, true); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffe07a'; g.beginPath(); g.ellipse(0, -0.8, 0.45, 0.17, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#2f9a4a'; g.beginPath(); g.arc(0, -0.45, 0.24, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(-0.05, -0.6, 0.1, 0.3); g.fillRect(-0.15, -0.5, 0.3, 0.1);
  });
}
function makeFlag(color, label, checkered) {
  return sprite(2.4, 4.4, 0.4, 4.2, g => {
    g.fillStyle = 'rgba(8,28,18,.35)'; g.beginPath(); g.ellipse(0.1, 0, 0.35, 0.12, 0, 0, TAU); g.fill();
    g.strokeStyle = '#3d2b1c'; g.lineWidth = 0.12; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -3.9); g.stroke();
    g.beginPath(); g.moveTo(0.04, -3.85); g.lineTo(1.9, -3.4); g.lineTo(0.04, -2.75); g.closePath();
    if (checkered) {
      g.save(); g.clip(); for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#fff'; g.fillRect(i * 0.25, -3.9 + j * 0.25, 0.25, 0.25); } g.restore();
    } else { g.fillStyle = color; g.fill(); }
    g.strokeStyle = INK; g.lineWidth = 0.06; g.stroke();
    if (label) { g.fillStyle = INK; g.font = 'bold 0.5px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 0.62, -3.3); }
  });
}
function makeSiri() {
  return sprite(1.4, 1.2, 0.7, 0.9, g => {
    g.translate(0, -0.35);
    g.strokeStyle = '#1f4f7a'; g.lineWidth = 0.06;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s * 0.2, 0.02 + i * 0.07); g.lineTo(s * 0.48, 0.12 + i * 0.1); g.lineTo(s * 0.55, 0.25 + i * 0.08); g.stroke(); }
    g.fillStyle = '#3f86c8'; g.strokeStyle = INK; g.lineWidth = 0.05;
    g.beginPath(); g.moveTo(-0.55, -0.02); g.quadraticCurveTo(-0.3, -0.25, 0, -0.24); g.quadraticCurveTo(0.3, -0.25, 0.55, -0.02); g.quadraticCurveTo(0.2, 0.22, 0, 0.2); g.quadraticCurveTo(-0.2, 0.22, -0.55, -0.02); g.fill(); g.stroke();
    for (const s of [-1, 1]) { g.fillStyle = '#3f86c8'; g.beginPath(); g.ellipse(s * 0.42, -0.28, 0.13, 0.09, s * 0.6, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#f08a3a'; g.beginPath(); g.arc(s * 0.52, -0.34, 0.06, 0, TAU); g.fill(); }
    g.fillStyle = '#111'; g.beginPath(); g.arc(-0.08, -0.2, 0.035, 0, TAU); g.arc(0.08, -0.2, 0.035, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-0.1, -0.1, 0.18, 0.06, 0, 0, TAU); g.fill();
  });
}
function makeOstra() {
  return sprite(1.2, 1.1, 0.6, 0.85, g => {
    g.translate(0, -0.3);
    g.fillStyle = '#8b857a'; g.strokeStyle = INK; g.lineWidth = 0.05;
    g.beginPath(); g.moveTo(-0.45, 0.05); g.quadraticCurveTo(-0.4, -0.35, 0, -0.38); g.quadraticCurveTo(0.42, -0.3, 0.45, 0.02); g.quadraticCurveTo(0.2, 0.25, -0.1, 0.22); g.quadraticCurveTo(-0.38, 0.2, -0.45, 0.05); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(60,55,48,.7)'; g.lineWidth = 0.03;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.ellipse(0, 0, 0.42 - i * 0.1, 0.3 - i * 0.07, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
    g.fillStyle = '#c9c0ad'; g.beginPath(); g.ellipse(-0.1, -0.16, 0.14, 0.06, -0.3, 0, TAU); g.fill();
  });
}
/* sprites planos (ficam deitados na água) */
const FPX = 40;
function flatSprite(wu, hu, fn) { const c = mkCanvas(wu * FPX, hu * FPX), g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2); g.scale(FPX, FPX); g.lineJoin = 'round'; fn(g); return c; }
const SPR_BOTTLE = flatSprite(1.0, 0.45, g => {
  g.fillStyle = 'rgba(170,230,215,.85)'; g.strokeStyle = '#2d5d55'; g.lineWidth = 0.04;
  g.beginPath(); g.moveTo(-0.42, -0.14); g.lineTo(0.12, -0.14); g.quadraticCurveTo(0.24, -0.14, 0.28, -0.07); g.lineTo(0.36, -0.07); g.lineTo(0.36, 0.07); g.lineTo(0.28, 0.07); g.quadraticCurveTo(0.24, 0.14, 0.12, 0.14); g.lineTo(-0.42, 0.14); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#d23a2a'; g.fillRect(0.34, -0.08, 0.08, 0.16);
  g.fillStyle = '#e94b3c'; g.fillRect(-0.2, -0.14, 0.18, 0.28);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(-0.38, -0.1, 0.4, 0.04);
});
const SPR_BAG = flatSprite(0.9, 0.9, g => {
  g.fillStyle = 'rgba(245,245,240,.88)'; g.strokeStyle = '#8a8f8f'; g.lineWidth = 0.035;
  g.beginPath(); g.moveTo(-0.3, -0.2); g.quadraticCurveTo(-0.36, -0.36, -0.22, -0.38); g.quadraticCurveTo(-0.12, -0.3, -0.1, -0.2); g.lineTo(0.1, -0.2); g.quadraticCurveTo(0.14, -0.34, 0.26, -0.36); g.quadraticCurveTo(0.36, -0.3, 0.3, -0.2);
  g.quadraticCurveTo(0.4, 0.1, 0.28, 0.33); g.quadraticCurveTo(0, 0.4, -0.28, 0.33); g.quadraticCurveTo(-0.4, 0.1, -0.3, -0.2); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(120,130,130,.5)'; g.beginPath(); g.moveTo(-0.15, -0.05); g.lineTo(-0.05, 0.25); g.moveTo(0.12, -0.08); g.lineTo(0.18, 0.2); g.stroke();
  g.fillStyle = '#3b8ac9'; g.font = 'bold 0.14px sans-serif'; g.textAlign = 'center'; g.fillText('MERCADO', 0, 0.08);
});
/* peixe (tainha) e garça: desenhados centrados para girar */
const SPR_FISH = (() => { const c = mkCanvas(1.3 * SPX, 0.7 * SPX), g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2); g.scale(SPX, SPX);
  g.fillStyle = '#b9c6c9'; g.strokeStyle = INK; g.lineWidth = 0.05;
  g.beginPath(); g.moveTo(0.5, 0); g.quadraticCurveTo(0.2, -0.2, -0.3, -0.06); g.lineTo(-0.55, -0.2); g.lineTo(-0.48, 0); g.lineTo(-0.55, 0.2); g.lineTo(-0.3, 0.06); g.quadraticCurveTo(0.2, 0.2, 0.5, 0); g.fill(); g.stroke();
  g.fillStyle = '#5c7178'; g.beginPath(); g.moveTo(0.45, -0.03); g.quadraticCurveTo(0.15, -0.17, -0.3, -0.05); g.quadraticCurveTo(0.1, -0.06, 0.45, -0.03); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(0.36, -0.03, 0.03, 0, TAU); g.fill(); return c; })();
function makeHeron(up) {
  const c = mkCanvas(2.4 * SPX, 1.6 * SPX), g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2); g.scale(SPX, SPX); g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = '#1b1b1b'; g.lineWidth = 0.05; g.beginPath(); g.moveTo(-0.3, 0.05); g.lineTo(-0.95, 0.12); g.stroke();
  g.fillStyle = '#fbfbf6'; g.strokeStyle = INK; g.lineWidth = 0.05;
  const wy = up ? -0.6 : 0.45;
  g.beginPath(); g.moveTo(-0.15, -0.02); g.quadraticCurveTo(-0.3, wy * 0.8, -0.7, wy); g.quadraticCurveTo(-0.2, wy * 0.5, 0.15, 0.02); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, 0.03, 0.38, 0.12, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(0.3, 0); g.quadraticCurveTo(0.55, -0.05, 0.5, -0.18); g.quadraticCurveTo(0.48, -0.3, 0.62, -0.3); g.lineWidth = 0.09; g.strokeStyle = '#fbfbf6'; g.stroke(); g.lineWidth = 0.025; g.strokeStyle = INK; g.stroke();
  g.fillStyle = '#f2c02e'; g.beginPath(); g.moveTo(0.62, -0.33); g.lineTo(0.95, -0.29); g.lineTo(0.62, -0.26); g.closePath(); g.fill();
  g.fillStyle = '#fbfbf6'; g.strokeStyle = INK; g.lineWidth = 0.05;
  const wy2 = up ? -0.55 : 0.5;
  g.beginPath(); g.moveTo(-0.05, -0.02); g.quadraticCurveTo(0.05, wy2 * 0.8, -0.35, wy2 * 1.05); g.quadraticCurveTo(0.1, wy2 * 0.45, 0.25, 0.02); g.closePath(); g.fill(); g.stroke();
  return c;
}
const SPR_HERON = [makeHeron(true), makeHeron(false)];

/* Barcos: imagens enviadas pela Lívia (recortadas). Proa aponta para +x. */
const IMG = {};
const BOAT_META = {
  ligeiro: { cx: 190, cy: 66, ppu: 103.5, seat: -0.85 },
  resistente: { cx: 167, cy: 75, ppu: 98, seat: -0.95 }
};
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hsl2rgb(h, s, l) { if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; } const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = t => { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }; return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)]; }
function tinted(img, fn) {
  const c = mkCanvas(img.width, img.height), g = c.getContext('2d'); g.drawImage(img, 0, 0);
  if (!fn) return c;
  try {
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { if (a[i + 3] < 8) continue; const [h, s, l] = rgb2hsl(a[i], a[i + 1], a[i + 2]); const r = fn(h, s, l); if (r) { const q = hsl2rgb(r[0], r[1], r[2]); a[i] = q[0]; a[i + 1] = q[1]; a[i + 2] = q[2]; } }
    g.putImageData(d, 0, 0);
  } catch (e) { /* sem acesso aos pixels: mantém a cor original */ }
  return c;
}
const BOAT_SKINS = {
  ligeiro: [null, (h, s, l) => s > 0.5 && l > 0.28 ? [(h + 0.55) % 1, s, l] : null, (h, s, l) => s > 0.5 && l > 0.28 ? [(h + 0.3) % 1, s * 0.95, l] : null],
  resistente: [null, (h, s, l) => h > 0.5 && h < 0.72 && s > 0.12 ? [0.01, Math.min(1, s * 2.2), l] : null, (h, s, l) => h > 0.5 && h < 0.72 && s > 0.12 ? [0.3, Math.min(1, s * 2), l * 0.95] : null]
};
const SKIN_CACHE = {};
function boatSkin(type, idx) {
  const key = type + idx;
  if (!SKIN_CACHE[key]) SKIN_CACHE[key] = { hull: tinted(IMG[type + '_hull'], BOAT_SKINS[type][idx]), spray: IMG[type + '_spray'] };
  return SKIN_CACHE[key];
}

/* Pilotos vistos de cima (sentados na popa) — coordenadas do barco, proa em +x */
function drawPilotTop(g, kind, t) {
  if (kind === 'marisqueira') {
    g.fillStyle = '#1b1b1e'; g.beginPath(); g.ellipse(-0.02, 0, 0.19, 0.32, 0, 0, TAU); g.fill();
    g.fillStyle = '#6e4127'; g.beginPath(); g.arc(0.17, -0.27, 0.07, 0, TAU); g.arc(0.17, 0.27, 0.07, 0, TAU); g.fill();
    g.fillStyle = '#4a2817'; for (const [x, y, r] of [[-0.15, -0.12, 0.09], [-0.17, 0.05, 0.1], [-0.12, 0.17, 0.08], [-0.2, -0.02, 0.08], [-0.06, -0.19, 0.07]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.fillStyle = '#f2f0ea'; g.beginPath(); g.arc(-0.03, 0, 0.16, Math.PI * 0.55, Math.PI * 1.45); g.lineTo(-0.03, 0); g.fill();
    g.fillStyle = '#121214'; g.beginPath(); g.arc(0.01, 0, 0.14, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(0.15, 0, 0.09, 0.12, 0, -Math.PI / 2, Math.PI / 2); g.fill();
    g.fillStyle = '#e9e9e9'; g.fillRect(-0.04, -0.035, 0.1, 0.07);
    // cesto de palha ao lado
    g.fillStyle = '#c99a4c'; g.strokeStyle = '#7c5a26'; g.lineWidth = 0.025; g.beginPath(); g.arc(-0.05, 0.42, 0.11, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#8d877d'; g.beginPath(); g.arc(-0.07, 0.4, 0.035, 0, TAU); g.arc(-0.02, 0.45, 0.03, 0, TAU); g.fill();
  } else {
    g.fillStyle = '#6d1f30'; g.beginPath(); g.ellipse(-0.02, 0, 0.23, 0.38, 0, 0, TAU); g.fill();
    for (const [x, y, c] of [[-0.1, -0.25, '#b3452a'], [0.02, -0.3, '#5b1d3c'], [-0.12, 0.24, '#b3452a'], [0.03, 0.3, '#5b1d3c'], [-0.18, 0.02, '#a43a2a'], [0.1, -0.18, '#c4532c'], [0.1, 0.2, '#c4532c']]) { g.fillStyle = c; g.beginPath(); g.arc(x, y, 0.07, 0, TAU); g.fill(); }
    const cl = Math.sin(t * 6) * 0.04;
    for (const s of [-1, 1]) { g.fillStyle = '#c4532c'; g.beginPath(); g.ellipse(0.24, s * (0.36 + cl), 0.09, 0.06, s * 0.5, 0, TAU); g.fill(); g.fillStyle = '#f2b65a'; g.beginPath(); g.arc(0.31, s * (0.39 + cl), 0.035, 0, TAU); g.fill(); }
    g.fillStyle = '#6f7779'; g.beginPath(); g.arc(0.02, 0, 0.2, 0, TAU); g.fill();
    g.strokeStyle = '#c9ced0'; g.lineWidth = 0.04; g.beginPath(); g.arc(0.02, 0, 0.18, 0, TAU); g.stroke();
    g.fillStyle = '#9aa2a5'; g.beginPath(); g.arc(0.02, 0, 0.12, 0, TAU); g.fill();
    g.fillStyle = '#8c4a26'; g.beginPath(); g.arc(-0.04, 0.06, 0.035, 0, TAU); g.arc(0.08, -0.07, 0.025, 0, TAU); g.fill();
    g.strokeStyle = '#555'; g.lineWidth = 0.02; g.beginPath(); g.arc(0.02, 0, 0.23, -0.6, 0.6); g.stroke();
  }
}

/* ===================== MUNDO: objetos fixos e chão pré-desenhado ===================== */
const COL = {
  forest: '#1f4a2a', forestFloor: '#29502d', mudBank: '#4a3a27', shallow: '#7d9460', shallowDark: '#6a8352',
  edge: '#cfe3c4', water: '#2f8f8a', waterDeep: '#277d7b', lagoon: '#2c8584', sand: '#e0c68c', grass: '#5d9a4a', root: '#3d2c1d'
};
function inEllipse(x, y, e, k = 1) { return ((x - e.x) / (e.rx * k)) ** 2 + ((y - e.y) / (e.ry * k)) ** 2 < 1; }
function inVillage(x, y, m = 0) { return Math.hypot(x - VILLAGE.x, y - VILLAGE.y) < VILLAGE.r + m; }
const BOTTOM_VILLAGE = { y0: 141, y1: 147.5 };
function solidClear(x, y, m = 0.5) {
  if (terrain(x, y) !== T_SOLID) return false;
  if (sampleD(gM, x, y) < HW + SHALLOW + m || sampleD(gS, x, y) < SHW + SSHALLOW + m) return false;
  if (inEllipse(x, y, LAGOON, 1.05) || inVillage(x, y, 0.6)) return false;
  return true;
}
const ROCK_LANE = [];
function safeLane(s) {
  if (!ROCK_LANE.length || s < ROCK_LANE[0].s - 4 || s > ROCK_LANE[ROCK_LANE.length - 1].s + 6) return null;
  if (s <= ROCK_LANE[0].s) return ROCK_LANE[0].lane;
  for (let i = 0; i < ROCK_LANE.length - 1; i++) { const a = ROCK_LANE[i], b = ROCK_LANE[i + 1]; if (s <= b.s) return lerp(a.lane, b.lane, (s - a.s) / (b.s - a.s)); }
  return ROCK_LANE[ROCK_LANE.length - 1].lane;
}
const WORLD = { trees: [], palms: [], houses: [], buoys: [], rocks: [], repairs: [], itemSpots: [], trash: [], flags: [], canoes: [] };
const SPR = {};
function buildSprites() {
  SPR.mangrove = [11, 23, 37, 41, 53, 67].map(makeMangrove);
  SPR.palm = [3, 7, 13].map(makePalm);
  SPR.house = [
    makeHouse('#b9875a', '#d7b46a', true, 1), makeHouse('#5fa7c9', '#c25a3c', false, 2),
    makeHouse('#e79ca3', '#d7b46a', true, 3), makeHouse('#ecc659', '#c25a3c', false, 4), makeHouse('#f1ece0', '#3f8a8f', false, 5)
  ];
  SPR.rock = [5, 9, 15].map(makeRock);
  SPR.buoyRed = makeBuoy('#e0412f', '#ffffff'); SPR.buoyWhite = makeBuoy('#f4f1e8', '#e0412f'); SPR.buoySc = makeBuoy('#f2c230', '#14261d', true);
  SPR.repair = makeRepairBuoy();
  SPR.flags = SECTORS.map((s, i) => makeFlag(s.color, String(i + 1), i === 0));
  SPR.siri = makeSiri(); SPR.ostra = makeOstra();
}

function placeWorld() {
  const W = WORLD;
  const near = (arr, x, y, r) => arr.some(o => (o.x - x) ** 2 + (o.y - y) ** 2 < r * r);
  // árvores na borda do mangue, dos dois lados do canal
  const edgeTrees = (path, hw, sh, spacing) => {
    for (let s = 0; s < path.L; s += spacing) {
      const p = ptAt(path, s);
      for (const side of [-1, 1]) {
        const nearSide = (p.nx + p.ny) * side > 0.3, off = hw + sh + 0.9 + sr(0, 1.8) + (nearSide ? 1.8 : 0), x = p.x + p.nx * off * side + sr(-0.6, 0.6), y = p.y + p.ny * off * side + sr(-0.6, 0.6);
        if (solidClear(x, y, 0.5) && !near(W.trees, x, y, 1.7)) W.trees.push({ x, y, v: Math.floor(srand() * 6), sc: sr(0.85, 1.2) });
      }
    }
  };
  edgeTrees(MAIN, HW, SHALLOW, 2.2);
  SC.forEach(sc => edgeTrees(sc.path, SHW, SSHALLOW, 2.0));
  for (let i = 0; i < 900; i++) {
    const x = sr(WX0 + 1, WX0 + WW - 1), y = sr(WY0 + 1, WY0 + WH - 1);
    const dm = sampleD(gM, x, y);
    if (dm < 18 && solidClear(x, y, 2.2) && !near(W.trees, x, y, 2.2) && !(y > BOTTOM_VILLAGE.y0 - 1 && x > 26 && x < 90)) W.trees.push({ x, y, v: Math.floor(srand() * 6), sc: sr(0.9, 1.35) });
  }
  // ilha: casas, coqueiros e píer
  [[46, 60, 0], [53.5, 63, 1], [47, 69.5, 2], [54, 72, 3], [49, 78, 4], [44.5, 75, 1]].forEach(([x, y, v]) => W.houses.push({ x, y, v }));
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + sr(-0.1, 0.1), k = sr(0.78, 0.92); W.palms.push({ x: ISLAND.x + Math.cos(a) * ISLAND.rx * k, y: ISLAND.y + Math.sin(a) * ISLAND.ry * k, v: i % 3 }); }
  W.palms.push({ x: 51, y: 67, v: 0 }, { x: 50, y: 56, v: 2 }, { x: 52, y: 82, v: 1 });
  // povoado na margem, perto da largada
  [[4, 108, 0], [8.5, 107.5, 2], [3.5, 113.5, 1], [8, 114, 0], [5.5, 117.2, 3]].forEach(([x, y, v]) => W.houses.push({ x, y, v }));
  W.palms.push({ x: 10.5, y: 110.5, v: 1 }, { x: 2, y: 110.5, v: 2 }, { x: 10.8, y: 116, v: 0 });
  // casas na margem de baixo
  for (let x = 30; x < 88; x += sr(6, 9)) { const y = sr(143, 145); if (solidClear(x, y, 0.8)) W.houses.push({ x, y, v: Math.floor(srand() * 5) }); if (srand() < 0.6) W.palms.push({ x: x + 2.8, y: y + sr(-1, 1), v: Math.floor(srand() * 3) }); }
  // canoas atracadas (desenhadas no chão)
  W.canoes.push({ x: 15.2, y: 109.2, a: 0.1, c: 0 }, { x: 15.4, y: 112.9, a: -0.15, c: 1 }, { x: 64.2, y: 66.5, a: 1.4, c: 2 }, { x: 65.6, y: 71.6, a: 1.7, c: 0 }, { x: 38.6, y: 81, a: -1.2, c: 1 });
  // boias de marcação do canal
  for (let s = 2; s < MAIN.L; s += 4.5) { const p = ptAt(MAIN, s); for (const side of [-1, 1]) W.buoys.push({ x: p.x + p.nx * (HW + 0.25) * side, y: p.y + p.ny * (HW + 0.25) * side, spr: side < 0 ? 'buoyRed' : 'buoyWhite', ph: srand() * TAU }); }
  SC.forEach(sc => { for (let s = 1.5; s < sc.path.L - 1; s += 3) { const p = ptAt(sc.path, s); for (const side of [-1, 1]) W.buoys.push({ x: p.x + p.nx * (SHW + 0.2) * side, y: p.y + p.ny * (SHW + 0.2) * side, spr: 'buoySc', ph: srand() * TAU }); } });
  // bandeiras dos setores
  SECTOR_S.forEach((s, i) => { const p = ptAt(MAIN, s); for (const side of [-1, 1]) W.flags.push({ x: p.x + p.nx * (HW + 1.1) * side, y: p.y + p.ny * (HW + 1.1) * side, i }); });
  // SETOR 1: pedras no canal, sempre deixando uma passagem que muda de lado
  const r0 = MAIN.ctrlS[1] + 5, r1 = SECTOR_S[1] - 1.5, lanes = [-1.0, -1.0, 0.2, 1.2, 1.2, 0, -1.0];
  lanes.forEach((lane, i) => {
    const s = lerp(r0, r1, i / (lanes.length - 1)), p = ptAt(MAIN, s), nxt = lanes[i + 1] || 0;
    const lat = lane > 0.1 ? lane - sr(2.35, 2.6) : lane < -0.1 ? lane + sr(2.35, 2.6) : (nxt > 0 ? -1 : 1) * sr(2.35, 2.55);
    W.rocks.push({ x: p.x + p.nx * lat, y: p.y + p.ny * lat, r: sr(0.55, 0.75), v: i % 3, s, lat });
    ROCK_LANE.push({ s, lane });
  });
  // SETOR 3: boias de reparo na descida da direita
  const q0 = MAIN.ctrlS[14] + 2, q1 = MAIN.ctrlS[15] - 2;
  for (let i = 0; i < 6; i++) { const s = lerp(q0, q1, i / 5), p = ptAt(MAIN, s), lat = (i % 2 ? 1 : -1) * 1.5; W.repairs.push({ x: p.x + p.nx * lat, y: p.y + p.ny * lat, off: 0 }); }
  // siris e ostras
  for (let s = 18; s < MAIN.L - 8; s += 25) {
    const p = ptAt(MAIN, s), lat = sr(-1.6, 1.6), x = p.x + p.nx * lat, y = p.y + p.ny * lat;
    if (near(W.rocks, x, y, 2)) continue;
    W.itemSpots.push({ x, y, type: srand() < 0.5 ? 'siri' : 'ostra', off: 0, ph: srand() * TAU });
  }
  { const p = ptAt(SC[0].path, SC[0].path.L * 0.5); W.itemSpots.push({ x: p.x, y: p.y, type: 'siri', off: 0, ph: 1 }); }
  resetTrash();
}
function resetTrash() {
  const W = WORLD; W.trash.length = 0;
  for (let i = 0; i < 48; i++) {
    const s = sr(10, MAIN.L - 10), p = ptAt(MAIN, s), lat = sr(-2.4, 2.4), x = p.x + p.nx * lat, y = p.y + p.ny * lat;
    if (W.rocks.some(o => Math.hypot(o.x - x, o.y - y) < 2)) continue;
    W.trash.push({ x, y, vx: 0, vy: 0, a: sr(0, TAU), va: 0, kind: srand() < 0.55 ? 'garrafa' : 'sacola', ph: srand() * TAU, cd: 0 });
  }
  SC.forEach(sc => { for (let i = 0; i < 3; i++) { const p = ptAt(sc.path, sr(1, sc.path.L - 1)); W.trash.push({ x: p.x + sr(-0.6, 0.6), y: p.y + sr(-0.6, 0.6), vx: 0, vy: 0, a: sr(0, TAU), va: 0, kind: srand() < 0.5 ? 'garrafa' : 'sacola', ph: srand() * TAU, cd: 0 }); } });
}

/* ---------- chão ---------- */
const PPU = 20, ISO_PPU = 20;
const ISO_U0 = (WX0 - (WY0 + WH)) * ISO_X, ISO_U1 = ((WX0 + WW) - WY0) * ISO_X;
const ISO_V0 = (WX0 + WY0) * ISO_Y, ISO_V1 = ((WX0 + WW) + (WY0 + WH)) * ISO_Y;
let GROUND = null, MINI_BASE = null;
function strokePath(g, path, width, color) {
  g.beginPath(); path.pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); if (path.closed) g.closePath();
  g.lineWidth = width; g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
}
function drawCanoe(g, x, y, a, c, len = 2.6) {
  const cols = [['#3fb3a4', '#c9372c'], ['#e9d9a8', '#2f6fb3'], ['#d9563b', '#f2c230']][c % 3];
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0.12, 0.12, len / 2, 0.42, 0, 0, TAU); g.fill();
  g.fillStyle = cols[0]; g.strokeStyle = INK; g.lineWidth = 0.06;
  g.beginPath(); g.moveTo(-len / 2, 0); g.quadraticCurveTo(-len / 4, -0.42, len / 4, -0.38); g.quadraticCurveTo(len / 2.1, -0.3, len / 2, 0); g.quadraticCurveTo(len / 2.1, 0.3, len / 4, 0.38); g.quadraticCurveTo(-len / 4, 0.42, -len / 2, 0); g.fill(); g.stroke();
  g.strokeStyle = cols[1]; g.lineWidth = 0.09; g.beginPath(); g.moveTo(-len / 2 + 0.25, -0.18); g.quadraticCurveTo(0, -0.33, len / 2 - 0.3, -0.16); g.moveTo(-len / 2 + 0.25, 0.18); g.quadraticCurveTo(0, 0.33, len / 2 - 0.3, 0.16); g.stroke();
  g.fillStyle = '#5a4230'; g.beginPath(); g.ellipse(0, 0, len / 2 - 0.35, 0.2, 0, 0, TAU); g.fill();
  g.fillStyle = '#8a6a48'; g.fillRect(-0.45, -0.24, 0.12, 0.48); g.fillRect(0.4, -0.24, 0.12, 0.48);
  g.restore();
}
function renderGround() {
  const tex = mkCanvas(WW * PPU, WH * PPU), g = tex.getContext('2d');
  g.scale(PPU, PPU); g.translate(-WX0, -WY0);
  const R = mulberry32(4242), rr = (a, b) => a + R() * (b - a);
  g.fillStyle = COL.forestFloor; g.fillRect(WX0, WY0, WW, WH);
  // copa do mangue (manchas)
  for (let yy = 0; yy < GH; yy++) for (let xx = 0; xx < GW; xx++) {
    if (R() > 0.2) continue;
    const x = WX0 + (xx + 0.5) * GRES + rr(-0.3, 0.3), y = WY0 + (yy + 0.5) * GRES + rr(-0.3, 0.3);
    if (inEllipse(x, y, LAGOON, 1.08) || inVillage(x, y, 0.3) || (y > BOTTOM_VILLAGE.y0 - 0.5 && x > 27 && x < 92 && y < BOTTOM_VILLAGE.y1)) continue;
    const r = rr(0.6, 1.5);
    g.fillStyle = 'rgba(10,30,16,.45)'; g.beginPath(); g.arc(x + 0.25, y + 0.3, r, 0, TAU); g.fill();
    g.fillStyle = ['#2b6234', '#2f6a37', '#275a30', '#357238'][Math.floor(R() * 4)]; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    if (R() < 0.5) { g.fillStyle = 'rgba(120,180,90,.35)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, TAU); g.fill(); }
  }
  // lagoa, ilha
  g.fillStyle = COL.mudBank; g.beginPath(); g.ellipse(LAGOON.x, LAGOON.y, LAGOON.rx + 0.8, LAGOON.ry + 0.8, 0, 0, TAU); g.fill();
  g.fillStyle = COL.lagoon; g.beginPath(); g.ellipse(LAGOON.x, LAGOON.y, LAGOON.rx, LAGOON.ry, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(220,240,230,.35)'; g.lineWidth = 0.25; g.beginPath(); g.ellipse(ISLAND.x, ISLAND.y, ISLAND.rx + 0.7, ISLAND.ry + 0.7, 0, 0, TAU); g.stroke();
  g.fillStyle = COL.sand; g.beginPath(); g.ellipse(ISLAND.x, ISLAND.y, ISLAND.rx, ISLAND.ry, 0, 0, TAU); g.fill();
  g.fillStyle = COL.grass; g.beginPath(); g.ellipse(ISLAND.x, ISLAND.y, ISLAND.rx - 1.8, ISLAND.ry - 2.2, 0, 0, TAU); g.fill();
  for (let i = 0; i < 260; i++) { const a = R() * TAU, k = Math.sqrt(R()) * 0.85, x = ISLAND.x + Math.cos(a) * (ISLAND.rx - 2) * k, y = ISLAND.y + Math.sin(a) * (ISLAND.ry - 2.4) * k; g.fillStyle = R() < 0.5 ? 'rgba(40,90,40,.4)' : 'rgba(150,200,100,.35)'; g.beginPath(); g.arc(x, y, rr(0.2, 0.6), 0, TAU); g.fill(); }
  g.strokeStyle = '#cdb27a'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(50, 53); g.quadraticCurveTo(52, 62, 49, 69); g.quadraticCurveTo(46, 76, 50, 85); g.moveTo(49, 69); g.lineTo(61.5, 69); g.stroke();
  // píer da ilha
  g.fillStyle = '#7a5838'; g.fillRect(61.5, 68.4, 4.6, 1.2); g.strokeStyle = '#4a3420'; g.lineWidth = 0.06; for (let x = 61.6; x < 66; x += 0.45) { g.beginPath(); g.moveTo(x, 68.4); g.lineTo(x, 69.6); g.stroke(); }
  // clareira do povoado
  g.fillStyle = '#c9ad78'; g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, r = VILLAGE.r + Math.sin(i * 2.3) * 0.4; i ? g.lineTo(VILLAGE.x + Math.cos(a) * r, VILLAGE.y + Math.sin(a) * r) : g.moveTo(VILLAGE.x + r, VILLAGE.y); } g.fill();
  g.fillStyle = '#c9ad78'; g.fillRect(27, BOTTOM_VILLAGE.y0, 64, BOTTOM_VILLAGE.y1 - BOTTOM_VILLAGE.y0);
  g.fillStyle = 'rgba(120,90,50,.25)'; for (let i = 0; i < 120; i++) { g.beginPath(); g.arc(rr(28, 90), rr(BOTTOM_VILLAGE.y0, BOTTOM_VILLAGE.y1), rr(0.2, 0.5), 0, TAU); g.fill(); }
  // canal: barranco, água rasa com raízes, água funda
  strokePath(g, MAIN, 2 * (HW + SHALLOW) + 1.3, COL.mudBank); SC.forEach(sc => strokePath(g, sc.path, 2 * (SHW + SSHALLOW) + 1.1, COL.mudBank));
  strokePath(g, MAIN, 2 * (HW + SHALLOW), COL.shallow); SC.forEach(sc => strokePath(g, sc.path, 2 * (SHW + SSHALLOW), COL.shallow));
  for (let i = 0; i < 9000; i++) {
    const x = rr(WX0, WX0 + WW), y = rr(WY0, WY0 + WH), t = terrain(x, y);
    if (t !== T_SHALLOW) continue;
    if (R() < 0.55) { // raízes-escora em arco
      const w = rr(0.4, 0.9), a = R() * TAU;
      g.save(); g.translate(x, y); g.rotate(a);
      g.strokeStyle = 'rgba(30,22,14,.55)'; g.lineWidth = 0.12; g.beginPath(); g.moveTo(-w, 0.08); g.quadraticCurveTo(0, -w * 0.9, w, 0.08); g.stroke();
      g.strokeStyle = '#6b4e33'; g.lineWidth = 0.06; g.beginPath(); g.moveTo(-w, 0); g.quadraticCurveTo(0, -w * 0.95, w, 0); g.stroke();
      g.restore();
    } else { g.fillStyle = 'rgba(40,30,18,.6)'; g.beginPath(); g.arc(x, y, 0.07, 0, TAU); g.fill(); }
  }
  strokePath(g, MAIN, 2 * HW + 0.45, COL.edge); SC.forEach(sc => strokePath(g, sc.path, 2 * SHW + 0.35, COL.edge));
  strokePath(g, MAIN, 2 * HW, COL.water); SC.forEach(sc => strokePath(g, sc.path, 2 * SHW, COL.water));
  strokePath(g, MAIN, 2 * HW - 2.2, COL.waterDeep);
  for (let i = 0; i < 2600; i++) {
    const p = ptAt(MAIN, rr(0, MAIN.L)), lat = rr(-HW + 0.3, HW - 0.3), x = p.x + p.nx * lat, y = p.y + p.ny * lat;
    g.strokeStyle = R() < 0.5 ? 'rgba(255,255,255,.13)' : 'rgba(10,50,50,.15)'; g.lineWidth = 0.07;
    g.beginPath(); g.moveTo(x - p.tx * 0.4, y - p.ty * 0.4); g.quadraticCurveTo(x + p.nx * 0.12, y + p.ny * 0.12, x + p.tx * 0.4, y + p.ty * 0.4); g.stroke();
  }
  // píer do povoado e canoas
  g.fillStyle = '#7a5838'; g.fillRect(VILLAGE.x + 4.6, 110.4, 5.4, 1.2);
  g.strokeStyle = '#4a3420'; g.lineWidth = 0.06; for (let x = VILLAGE.x + 4.7; x < VILLAGE.x + 10; x += 0.45) { g.beginPath(); g.moveTo(x, 110.4); g.lineTo(x, 111.6); g.stroke(); }
  g.fillStyle = '#4a3420'; for (const x of [VILLAGE.x + 7, VILLAGE.x + 9.8]) { g.beginPath(); g.arc(x, 110.3, 0.14, 0, TAU); g.arc(x, 111.7, 0.14, 0, TAU); g.fill(); }
  WORLD.canoes.forEach(c => drawCanoe(g, c.x, c.y, c.a, c.c));
  // linha de largada (xadrez) e linhas dos setores
  { const p = ptAt(MAIN, 0); const sq = 0.5;
    for (let i = -HW; i < HW; i += sq) for (let j = 0; j < 2; j++) { g.fillStyle = ((i / sq + j) % 2 + 2) % 2 < 1 ? '#fff' : '#161616'; const x = p.x + p.nx * i + p.tx * (j * sq - sq), y = p.y + p.ny * i + p.ty * (j * sq - sq);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + p.nx * sq, y + p.ny * sq); g.lineTo(x + p.nx * sq + p.tx * sq, y + p.ny * sq + p.ty * sq); g.lineTo(x + p.tx * sq, y + p.ty * sq); g.closePath(); g.fill(); } }
  for (let k = 1; k < 4; k++) { const p = ptAt(MAIN, SECTOR_S[k]); g.setLineDash([0.5, 0.35]); g.strokeStyle = SECTORS[k].color; g.lineWidth = 0.22; g.beginPath(); g.moveTo(p.x - p.nx * HW, p.y - p.ny * HW); g.lineTo(p.x + p.nx * HW, p.y + p.ny * HW); g.stroke(); g.setLineDash([]); }
  // projeção isométrica
  const iso = mkCanvas((ISO_U1 - ISO_U0) * ISO_PPU, (ISO_V1 - ISO_V0) * ISO_PPU), ig = iso.getContext('2d');
  ig.fillStyle = COL.forest; ig.fillRect(0, 0, iso.width, iso.height);
  const k = ISO_PPU / PPU;
  ig.setTransform(k * ISO_X, k * ISO_Y, -k * ISO_X, k * ISO_Y, ISO_PPU * ((WX0 - WY0) * ISO_X - ISO_U0), ISO_PPU * ((WX0 + WY0) * ISO_Y - ISO_V0));
  ig.drawImage(tex, 0, 0);
  GROUND = iso;
  // base do minimapa (vista de cima, como o rascunho)
  const mm = mkCanvas(WW * 2, WH * 2), mg = mm.getContext('2d'); mg.scale(2, 2); mg.translate(-WX0, -WY0);
  mg.fillStyle = '#1d3f26'; mg.fillRect(WX0, WY0, WW, WH);
  mg.fillStyle = '#2c7f7e'; mg.beginPath(); mg.ellipse(LAGOON.x, LAGOON.y, LAGOON.rx, LAGOON.ry, 0, 0, TAU); mg.fill();
  mg.fillStyle = '#d8bf86'; mg.beginPath(); mg.ellipse(ISLAND.x, ISLAND.y, ISLAND.rx, ISLAND.ry, 0, 0, TAU); mg.fill();
  mg.fillStyle = '#5d9a4a'; mg.beginPath(); mg.ellipse(ISLAND.x, ISLAND.y, ISLAND.rx - 2, ISLAND.ry - 2.5, 0, 0, TAU); mg.fill();
  SC.forEach(sc => strokePath(mg, sc.path, 2.4, '#9fd6cf'));
  strokePath(mg, MAIN, 6.5, '#5aa6a0');
  for (let kk = 0; kk < 4; kk++) { const a = SECTOR_S[kk], b = kk < 3 ? SECTOR_S[kk + 1] : MAIN.L; mg.beginPath(); for (let s = a; s <= b; s += 1) { const p = ptAt(MAIN, s); s === a ? mg.moveTo(p.x, p.y) : mg.lineTo(p.x, p.y); } mg.strokeStyle = SECTORS[kk].color; mg.lineWidth = 1.6; mg.stroke(); }
  { const p = ptAt(MAIN, 0); mg.strokeStyle = '#fff'; mg.lineWidth = 1.4; mg.beginPath(); mg.moveTo(p.x - p.nx * 4, p.y - p.ny * 4); mg.lineTo(p.x + p.nx * 4, p.y + p.ny * 4); mg.stroke(); }
  MINI_BASE = mm;
}

/* ===================== CORRIDA: barcos, física, obstáculos, IA ===================== */
const TYPES = {
  ligeiro: { key: 'ligeiro', name: 'Ligeiro', pilot: 'marisqueira', pilotName: 'Marisqueira', vmax: 9.6, accel: 5.4, turn: 2.55, maxHp: 80, dmgMul: 1.35, windBase: 0.74, windAmp: 0.26, slowMul: 1.0, radius: 0.72 },
  resistente: { key: 'resistente', name: 'Resistente', pilot: 'caranguejo', pilotName: 'Homem-Caranguejo', vmax: 9.1, accel: 3.7, turn: 1.95, maxHp: 140, dmgMul: 0.7, windBase: 0.75, windAmp: 0.38, slowMul: 0.5, radius: 0.9 }
};
const AI_NAMES = ['Aratu', 'Sururu', 'Tainha', 'Robalo'];
const HUMAN_COLORS = ['#f6c13a', '#55cde4'];
const AI_COLORS = ['#f07a9a', '#a6e06a', '#c6a4f2', '#ffa25c'];

const G = {
  state: 'menu', mode: 1, picks: ['ligeiro', 'resistente'], boats: [], humans: [], t: 0, raceT: 0, countdown: 0, finishCount: 0, endTimer: -1, firstFinishT: -1,
  wind: { a: -Math.PI / 2 + 0.35, target: -Math.PI / 2 + 0.35, t: 20 },
  projectiles: [], fish: [], birds: [], waves: [], particles: [], streaks: [], fishT: 0, birdT: 0, waveT: 0, paused: false
};

function startPos(slot) {
  const back = [2.6, 2.6, 6.2, 6.2][slot], lat = [-1.45, 1.45, -1.45, 1.45][slot];
  const p = ptAt(MAIN, MAIN.L - back);
  return { x: p.x + p.nx * lat, y: p.y + p.ny * lat, h: Math.atan2(p.ty, p.tx) };
}
function makeBoat(slot, typeKey, human, name, color, skin) {
  const T = TYPES[typeKey], sp = startPos(slot);
  return {
    slot, T, human, name, color, skin, x: sp.x, y: sp.y, h: sp.h, speed: 0, lx: 0, ly: 0, hp: T.maxHp,
    item: null, aiming: false, aimDist: 3, aimDir: 1, boost: 0, boostT: 0, stun: 0, hitCd: 0, sink: 0, bump: 0,
    sector: 3, lap: 0, s: MAIN.L - 3, prog: MAIN.L - 3, finished: false, finishT: 0, place: 0,
    lapStartT: 0, secStartT: 0, splits: [null, null, null, null], lapTimes: [], bestLap: null, wrongT: 0, wrongShown: 0,
    input: { up: false, down: false, left: false, right: false, fire: false }, prevFire: false, wake: 0,
    toast: null, toastT: 0, shake: 0, onSc: false,
    ai: human ? null : { off: sr(-1.2, 1.2), offT: 0, mode: 'main', sc: 0, k: 0, scDone: {}, scProb: 0.55, skill: 0.75, throwCd: 2 }
  };
}
function setupRace(demo) {
  G.boats = []; G.humans = [];
  G.projectiles = []; G.fish = []; G.birds = []; G.waves = []; G.particles = [];
  G.finishCount = 0; G.endTimer = -1; G.firstFinishT = -1; G.raceT = 0;
  G.wind = { a: -Math.PI / 2 + rand(-0.4, 0.5), target: 0, t: 14 }; G.wind.target = G.wind.a;
  WORLD.itemSpots.forEach(s => s.off = 0); WORLD.repairs.forEach(r => r.off = 0); resetTrash();
  const nH = demo ? 0 : G.mode;
  const usedSkin = { ligeiro: 0, resistente: 0 };
  for (let i = 0; i < nH; i++) {
    const t = G.picks[i]; const b = makeBoat(i, t, true, 'J' + (i + 1), HUMAN_COLORS[i], usedSkin[t] > 0 ? 2 : 0); usedSkin[t]++;
    G.boats.push(b); G.humans.push(b);
  }
  let ai = 0;
  for (let slot = nH; slot < 4; slot++) {
    const first = nH ? (G.picks[0] === 'ligeiro' ? 'resistente' : 'ligeiro') : 'ligeiro';
    const t = ai % 2 ? (first === 'ligeiro' ? 'resistente' : 'ligeiro') : first;
    const skin = 1 + (usedSkin[t] % 2); usedSkin[t]++;
    const b = makeBoat(slot, t, false, AI_NAMES[ai], AI_COLORS[ai], skin);
    b.ai.skill = [0.85, 0.72, 0.62, 0.7][ai]; b.ai.scProb = [0.7, 0.5, 0.35, 0.5][ai];
    G.boats.push(b); ai++;
  }
  G.boats.forEach(b => { b.s = trackInfo(b.x, b.y).s; b.prog = b.s; });
  G.countdown = demo ? 0 : 3.6;
  G.state = demo ? 'demo' : 'countdown';
}
function toast(b, text, color) { if (!b.human) return; b.toast = { text, color: color || '#fff' }; b.toastT = 1.8; }

/* ---------- efeitos ---------- */
function puff(x, y, n, color, spd = 2, up = 3) { for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(0.3, 1) * spd; G.particles.push({ k: 'drop', x, y, z: 0.2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(0.5, 1) * up, life: rand(0.5, 0.9), c: color }); } }
function ring(x, y, r0, r1, life, c = 'rgba(255,255,255,.8)') { G.particles.push({ k: 'ring', x, y, r0, r1, t: 0, life, c }); }
function sparkle(x, y, n, c) { for (let i = 0; i < n; i++) G.particles.push({ k: 'plus', x: x + rand(-0.6, 0.6), y: y + rand(-0.6, 0.6), z: rand(0.3, 1), vz: rand(0.8, 1.6), life: rand(0.6, 1.1), c }); }
function hitBoat(b, kind, src) {
  const T = b.T; let dmg = 0;
  if (kind === 'rock') { dmg = 16; b.speed = -1.6; b.shake = 0.45; if (src) { const a = Math.atan2(b.y - src.y, b.x - src.x); b.lx += Math.cos(a) * 3; b.ly += Math.sin(a) * 3; } toast(b, 'Pedra! −vida', '#ff8f6b'); sfx('hit', b); if (b.ai) b.ai.recover = 0.45; }
  else if (kind === 'fish') { dmg = 8; b.speed *= 0.55; b.shake = 0.25; toast(b, 'Tainha no barco!', '#ffd27a'); sfx('splash', b); }
  else if (kind === 'bird') { dmg = 10; b.speed *= 0.5; b.shake = 0.3; toast(b, 'Garça no caminho!', '#ffd27a'); sfx('flap', b); }
  else if (kind === 'siri') { dmg = 6; b.stun = 2; b.speed *= 0.45; b.shake = 0.3; toast(b, 'Levou um siri!', '#ff8f6b'); sfx('hit', b); }
  else if (kind === 'ostra') { b.stun = 2; b.speed *= 0.35; b.shake = 0.3; toast(b, 'Levou uma ostra!', '#ff8f6b'); sfx('hit', b); }
  if (dmg) { b.hp -= dmg * T.dmgMul; puff(b.x, b.y, 8, '#e8f4f0'); }
  if (b.hp <= 0 && b.sink <= 0) { b.hp = 0; b.sink = 3; b.speed = 0; b.aiming = false; toast(b, 'Afundou! Voltando ao início do setor…', '#ff6b5b'); sfx('sink', b); }
}
function respawn(b) {
  const p = ptAt(MAIN, SECTOR_S[b.sector] + 1.5), lat = [-1.4, 1.4, -0.4, 0.6][b.slot];
  b.x = p.x + p.nx * lat; b.y = p.y + p.ny * lat; b.h = Math.atan2(p.ty, p.tx); b.speed = 0; b.lx = b.ly = 0; b.hp = b.T.maxHp; b.stun = 0; b.boost = 0; b.boostT = 0;
  if (b.ai) { b.ai.mode = 'main'; }
  ring(b.x, b.y, 0.4, 2.2, 0.8, 'rgba(200,255,240,.9)');
}

/* ---------- vento ---------- */
function windFactor(b) { return clamp(b.T.windBase + b.T.windAmp * Math.cos(angDiff(b.h, G.wind.a)), 0.25, 1.15); }
function windLabel(b) { const d = Math.abs(angDiff(b.h, G.wind.a)); return d < Math.PI / 3 ? ['a favor', 'good'] : d < Math.PI * 2 / 3 ? ['de lado', 'mid'] : ['contra', 'bad']; }
function updateWind(dt) {
  const w = G.wind; w.t -= dt;
  if (w.t <= 0) { w.target = w.a + rand(-1.4, 1.4); w.t = rand(15, 25); }
  w.a += clamp(angDiff(w.a, w.target), -0.13 * dt, 0.13 * dt);
}

/* ---------- física do barco ---------- */
function updateBoat(b, dt) {
  const T = b.T, inp = b.input;
  b.hitCd -= dt; b.stun = Math.max(0, b.stun - dt); b.shake = Math.max(0, b.shake - dt); b.toastT -= dt; b.bump -= dt;
  if (b.boostT > 0) { b.boostT -= dt; if (b.boostT <= 0) b.boost = 0; }
  if (b.sink > 0) { b.sink -= dt; if (b.sink <= 0) respawn(b); return; }
  const locked = G.state === 'countdown';
  const ter = terrain(b.x, b.y);
  const terrF = ter === T_SHALLOW ? 0.42 : 1;
  const wf = windFactor(b);
  let vmax = T.vmax * (b.ai ? b.ai.vmul || 1 : 1);
  if (b.finished) vmax *= 0.55;
  const stunF = b.stun > 0 ? 0.5 : 1;
  let target;
  if (locked) target = 0;
  else if (inp.up) target = vmax * wf * terrF * (1 + b.boost) * stunF;
  else if (inp.down) target = -vmax * 0.26;
  else target = vmax * wf * 0.3 * terrF * stunF;
  if (b.speed < target) b.speed = Math.min(target, b.speed + T.accel * (ter === T_SHALLOW ? 0.6 : 1) * dt * (inp.up && b.boost ? 1.8 : 1));
  else b.speed = Math.max(target, b.speed - (inp.down ? 8 : ter === T_SHALLOW ? 6 : 2.4) * dt);
  const turnIn = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  const spdK = 0.45 + 0.55 * Math.min(1, Math.abs(b.speed) / (T.vmax * 0.55));
  if (!locked) b.h += turnIn * T.turn * spdK * dt * (b.speed < -0.2 ? -1 : 1);
  b.h += b.stun > 0 ? Math.sin(G.t * 13) * 0.9 * dt : 0;
  const decay = Math.exp(-2.6 * dt); b.lx *= decay; b.ly *= decay;
  const vx = Math.cos(b.h) * b.speed + b.lx, vy = Math.sin(b.h) * b.speed + b.ly;
  let nx = b.x + vx * dt, ny = b.y + vy * dt;
  if (terrain(nx, ny) === T_SOLID) {
    if (terrain(nx, b.y) !== T_SOLID) ny = b.y; else if (terrain(b.x, ny) !== T_SOLID) nx = b.x; else { nx = b.x; ny = b.y; }
    const c = nearestChannelPoint(b.x, b.y), dx = c.x - b.x, dy = c.y - b.y, l = Math.hypot(dx, dy) || 1;
    b.lx += dx / l * 1.5; b.ly += dy / l * 1.5; b.speed *= 0.6;
    if (b.bump <= 0 && Math.abs(b.speed) > 2) { b.bump = 0.5; sfx('bump', b); }
  }
  if (terrain(nx, ny) !== T_SOLID) { b.x = nx; b.y = ny; }
  else { const c = nearestChannelPoint(b.x, b.y); b.x = lerp(b.x, c.x, 0.1); b.y = lerp(b.y, c.y, 0.1); }
  // esteira
  b.wake -= dt;
  if (b.wake <= 0 && Math.abs(b.speed) > 1.5) { b.wake = 0.06; const bx = b.x - Math.cos(b.h) * 1.2, by = b.y - Math.sin(b.h) * 1.2; G.particles.push({ k: 'foam', x: bx + rand(-0.15, 0.15), y: by + rand(-0.15, 0.15), r: 0.15, g: 0.9, t: 0, life: 1.1 }); }
  // mira e arremesso
  if (b.human) {
    if (inp.fire && !b.prevFire && b.item && !b.aiming && !locked) { b.aiming = true; b.aimDist = 3; b.aimDir = 1; }
    if (b.aiming) {
      b.aimDist += b.aimDir * 13 * dt; if (b.aimDist > 16) { b.aimDist = 16; b.aimDir = -1; } if (b.aimDist < 3) { b.aimDist = 3; b.aimDir = 1; }
      if (!inp.fire) { throwItem(b, b.x + Math.cos(b.h) * b.aimDist, b.y + Math.sin(b.h) * b.aimDist); b.aiming = false; }
    }
    b.prevFire = inp.fire;
  }
  updateProgress(b);
}
function throwItem(b, tx, ty) {
  if (!b.item) return;
  const d = Math.hypot(tx - b.x, ty - b.y);
  G.projectiles.push({ x0: b.x, y0: b.y, x1: tx, y1: ty, t: 0, T: 0.45 + d * 0.022, peak: 1.6 + d * 0.09, kind: b.item, owner: b, spin: rand(0, TAU) });
  b.item = null; sfx('throw', b);
}
function updateProgress(b) {
  const ti = trackInfo(b.x, b.y); if (!ti) return;
  b.onSc = ti.onShort;
  const s = ti.s, prevS = b.s; b.s = s;
  if (G.state !== 'race' && G.state !== 'demo') return;
  const t = G.raceT;
  if (b.sector < 3) {
    const nxt = SECTOR_S[b.sector + 1];
    if (s >= nxt && s < nxt + 18) {
      b.splits[b.sector] = t - b.secStartT; b.secStartT = t; b.sector++;
      toast(b, `Setor ${b.sector + 1} · ${SECTORS[b.sector].name}`, SECTORS[b.sector].color);
    }
  } else if (s < 18 && prevS > MAIN.L - 30) {
    if (b.lap === 0) { b.lap = 1; b.lapStartT = t; b.secStartT = t; b.sector = 0; b.splits = [null, null, null, null]; }
    else {
      b.splits[3] = t - b.secStartT; const lt = t - b.lapStartT; b.lapTimes.push(lt); if (!b.bestLap || lt < b.bestLap) b.bestLap = lt;
      b.lastSplits = b.splits.slice(); b.splits = [null, null, null, null];
      b.lap++; b.lapStartT = t; b.secStartT = t; b.sector = 0;
      if (b.lap > LAPS && !b.finished) {
        b.finished = true; b.finishT = t; b.place = ++G.finishCount; b.aiming = false;
        if (b.human) { toast(b, `Chegada! ${b.place}º lugar`, '#ffe27a'); sfx('finish', b); if (G.firstFinishT < 0) G.firstFinishT = t; }
        if (b.human && !b.ai) b.ai = { off: 0, offT: 0, mode: 'main', sc: 0, k: 0, scDone: {}, scProb: 0, skill: 0.8, throwCd: 999, auto: true };
      } else toast(b, b.lap === LAPS ? 'Última volta!' : `Volta ${b.lap}/${LAPS}`, '#ffffff');
    }
  }
  let eff = s;
  if (b.sector === 0 && s > MAIN.L * 0.7) eff = s - MAIN.L;
  if (b.sector === 3 && s < MAIN.L * 0.3) eff = s + MAIN.L;
  b.prog = (b.finished ? 100 - b.place : 0) * MAIN.L * 10 + b.lap * MAIN.L + eff;
  // contramão
  if (b.human && !b.finished && !ti.onShort && ti.p) {
    const dot = Math.cos(b.h) * ti.p.tx + Math.sin(b.h) * ti.p.ty;
    if (dot < -0.35 && Math.abs(b.speed) > 1.2) b.wrongT += 1 / 60; else b.wrongT = 0;
    if (b.wrongT > 1.2 && b.toastT < 0.2) toast(b, 'Contramão! Vire o barco', '#ff6b5b');
  }
}

/* ---------- colisões e coletáveis ---------- */
function interact(dt) {
  const boats = G.boats;
  for (let i = 0; i < boats.length; i++) for (let j = i + 1; j < boats.length; j++) {
    const a = boats[i], b = boats[j]; if (a.sink > 0 || b.sink > 0) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.T.radius + b.T.radius;
    if (d < m && d > 0.001) {
      const nx = dx / d, ny = dy / d, push = (m - d) / 2;
      if (isWater(a.x - nx * push, a.y - ny * push)) { a.x -= nx * push; a.y -= ny * push; }
      if (isWater(b.x + nx * push, b.y + ny * push)) { b.x += nx * push; b.y += ny * push; }
      a.lx -= nx * 1.2; a.ly -= ny * 1.2; b.lx += nx * 1.2; b.ly += ny * 1.2; a.speed *= 0.97; b.speed *= 0.97;
    }
  }
  for (const b of boats) {
    if (b.sink > 0) continue;
    const r = b.T.radius;
    for (const k of WORLD.rocks) {
      const dx = b.x - k.x, dy = b.y - k.y, d = Math.hypot(dx, dy), m = k.r + r * 0.85;
      if (d < m) { const nx = dx / (d || 1), ny = dy / (d || 1); b.x = k.x + nx * m; b.y = k.y + ny * m; if (b.hitCd <= 0) { b.hitCd = 0.9; hitBoat(b, 'rock', k); puff(k.x, k.y, 10, '#ffffff'); } }
    }
    for (const t of WORLD.trash) {
      if (t.cd > 0) continue;
      const dx = t.x - b.x, dy = t.y - b.y, d = Math.hypot(dx, dy);
      if (d < 0.45 + r * 0.75) {
        b.speed *= 1 - 0.45 * b.T.slowMul; t.cd = 1;
        const sp = Math.max(2, Math.abs(b.speed)) * 0.8, nx = dx / (d || 1), ny = dy / (d || 1);
        t.vx = nx * sp + Math.cos(b.h) * sp * 0.5; t.vy = ny * sp + Math.sin(b.h) * sp * 0.5; t.va = rand(-4, 4);
        toast(b, t.kind === 'garrafa' ? 'Garrafa PET! Perdeu velocidade' : 'Sacola plástica! Perdeu velocidade', '#cfe9ff'); sfx('trash', b);
        ring(t.x, t.y, 0.2, 1, 0.5);
      }
    }
    for (const s of WORLD.itemSpots) {
      if (s.off > 0 || b.item || b.finished) continue;
      if (Math.hypot(s.x - b.x, s.y - b.y) < 1.15 + r * 0.4) { b.item = s.type; s.off = 7; toast(b, s.type === 'siri' ? 'Pegou um siri! Segure e solte para arremessar' : 'Pegou uma ostra! Segure e solte para arremessar', '#ffe27a'); sfx('pick', b); sparkle(s.x, s.y, 5, '#fff3a8'); if (b.ai) b.ai.throwCd = rand(0.6, 2); }
    }
    for (const p of WORLD.repairs) {
      if (p.off > 0) continue;
      if (Math.hypot(p.x - b.x, p.y - b.y) < 1.2 + r * 0.4) { const before = b.hp; b.hp = Math.min(b.T.maxHp, b.hp + 35); p.off = 10; sparkle(p.x, p.y, 10, '#8dff9a'); toast(b, before < b.T.maxHp ? 'Boia de reparo: +vida' : 'Boia de reparo (vida cheia)', '#8dff9a'); sfx('heal', b); }
    }
  }
  WORLD.itemSpots.forEach(s => s.off = Math.max(0, s.off - dt));
  WORLD.repairs.forEach(p => p.off = Math.max(0, p.off - dt));
  for (const t of WORLD.trash) {
    t.cd = Math.max(0, t.cd - dt);
    if (t.vx || t.vy) {
      const nx = t.x + t.vx * dt, ny = t.y + t.vy * dt;
      if (terrain(nx, ny) !== T_SOLID) { t.x = nx; t.y = ny; } else { t.vx *= -0.4; t.vy *= -0.4; }
      const f = Math.exp(-1.8 * dt); t.vx *= f; t.vy *= f; t.a += t.va * dt; t.va *= f;
      if (Math.abs(t.vx) + Math.abs(t.vy) < 0.05) t.vx = t.vy = 0;
    }
  }
}

/* ---------- arremessos ---------- */
function updateProjectiles(dt) {
  for (const p of G.projectiles) {
    p.t += dt; p.spin += dt * 10;
    if (p.t >= p.T && !p.done) {
      p.done = true; let hit = null, best = 1.5;
      for (const b of G.boats) { if (b === p.owner || b.sink > 0 || b.finished) continue; const d = Math.hypot(b.x - p.x1, b.y - p.y1); if (d < best) { best = d; hit = b; } }
      if (hit) { hitBoat(hit, p.kind); toast(p.owner, `Acertou ${hit.human ? hit.name : 'o ' + hit.name}!`, '#9dffb0'); sparkle(hit.x, hit.y, 6, '#ffffff'); }
      else { ring(p.x1, p.y1, 0.2, 1.4, 0.7); puff(p.x1, p.y1, 8, '#e8f4f0', 1.2, 2.5); if (p.owner.human) toast(p.owner, 'Errou! Caiu na água', '#cfe9ff'); sfx('splash', p.owner); }
    }
  }
  G.projectiles = G.projectiles.filter(p => !p.done);
}

/* ---------- SETOR 2: peixes inquietos e garças ---------- */
function updateAnimals(dt) {
  G.fishT -= dt;
  if (G.fishT <= 0) {
    G.fishT = rand(0.28, 0.55);
    const s = rand(SECTOR_S[1] + 1, MAIN.ctrlS[5] - 1), p = ptAt(MAIN, s), lat = rand(-HW + 0.5, HW - 0.5), a = rand(0, TAU);
    G.fish.push({ x: p.x + p.nx * lat, y: p.y + p.ny * lat, dx: Math.cos(a) * 2.4, dy: Math.sin(a) * 2.4, t: -0.8, T: 0.9, hit: false });
  }
  for (const f of G.fish) {
    const was = f.t; f.t += dt;
    if (was < 0 && f.t >= 0) ring(f.x, f.y, 0.1, 0.8, 0.4);
    if (f.t >= 0 && !f.hit) {
      const k = f.t / f.T, fx = f.x + f.dx * k, fy = f.y + f.dy * k, z = 4 * 1.7 * k * (1 - k);
      if (z < 1.1) for (const b of G.boats) { if (b.sink > 0) continue; if (Math.hypot(b.x - fx, b.y - fy) < 0.45 + b.T.radius * 0.5) { f.hit = true; hitBoat(b, 'fish'); break; } }
    }
    if (f.t >= f.T && !f.done) { f.done = true; ring(f.x + f.dx, f.y + f.dy, 0.1, 0.7, 0.4); }
  }
  G.fish = G.fish.filter(f => f.t < f.T + 0.05);
  G.birdT -= dt;
  if (G.birdT <= 0) {
    G.birdT = rand(1.4, 2.6);
    const s = rand(SECTOR_S[1] + 3, SECTOR_S[2] - 3), p = ptAt(MAIN, s), side = Math.random() < 0.5 ? -1 : 1;
    G.birds.push({ x: p.x - p.nx * side * (HW + 5), y: p.y - p.ny * side * (HW + 5), vx: p.nx * side * 3.4 + p.tx * rand(-0.8, 0.8), vy: p.ny * side * 3.4 + p.ty * rand(-0.8, 0.8), z: 1.0, life: (2 * HW + 10) / 3.4, flee: false, ph: rand(0, 6) });
  }
  for (const bd of G.birds) {
    bd.x += bd.vx * dt; bd.y += bd.vy * dt; bd.life -= dt;
    if (bd.flee) { bd.z += 3 * dt; } else {
      for (const b of G.boats) { if (b.sink > 0) continue; if (Math.hypot(b.x - bd.x, b.y - bd.y) < 0.65 + b.T.radius * 0.7) { bd.flee = true; hitBoat(b, 'bird'); break; } }
    }
  }
  G.birds = G.birds.filter(b => b.life > 0 && b.z < 8);
}

/* ---------- SETOR 4: ondas ---------- */
function updateWaves(dt) {
  G.waveT -= dt;
  const s0 = SECTOR_S[3] + 2, s1 = MAIN.ctrlS[22] - 2;
  if (G.waveT <= 0) {
    G.waveT = rand(1.1, 1.9);
    const r = Math.random();
    if (r < 0.38) G.waves.push({ kind: 'back', s: rand(s0, s1 - 25), v: 11.5, t: 0, life: 4.5, hit: new Set() });
    else if (r < 0.68) G.waves.push({ kind: 'front', s: rand(s0 + 25, s1), v: -6.5, t: 0, life: 4.5, hit: new Set() });
    else { const side = Math.random() < 0.5 ? -1 : 1; G.waves.push({ kind: 'side', s: rand(s0, s1), lat: -side * (HW + 1.5), v: side * 2.8, t: 0, life: (2 * HW + 3) / 2.8 + 1.2, hit: new Set() }); }
  }
  for (const w of G.waves) {
    w.t += dt; const active = w.t > 1.2;
    if (active) { if (w.kind === 'side') w.lat += w.v * dt; else w.s += w.v * dt; }
    if (!active) continue;
    for (const b of G.boats) {
      if (b.sink > 0 || w.hit.has(b) || b.onSc) continue;
      const ti = trackInfo(b.x, b.y); if (!ti || ti.onShort) continue;
      if (w.kind === 'side') {
        if (Math.abs(ti.s - w.s) < 2.6 && Math.abs(ti.lat - w.lat) < 0.7) { w.hit.add(b); const p = ti.p; const k = Math.sign(w.v); b.lx += p.nx * k * 5; b.ly += p.ny * k * 5; b.speed *= 0.7; toast(b, 'Onda lateral! Empurrou o barco', '#9fdcff'); sfx('wave', b); }
      } else if (Math.abs(ti.s - w.s) < 0.7 && Math.abs(ti.lat) < HW + 0.5) {
        w.hit.add(b);
        if (w.kind === 'back') { b.boost = 0.4; b.boostT = 1.6; toast(b, 'Onda por trás: empurrão!', '#bdf3ff'); }
        else { b.boost = 0.28; b.boostT = 1.3; b.hp = Math.min(b.T.maxHp, b.hp + 5); toast(b, 'Furou a onda: bônus!', '#ffe27a'); }
        sfx('wave', b);
      }
    }
  }
  G.waves = G.waves.filter(w => w.t < w.life && w.s > s0 - 4 && w.s < s1 + 4);
}

/* ---------- IA ---------- */
function chooseLane(b, ai) {
  const last = ROCK_LANE[ROCK_LANE.length - 1];
  const sl = last && b.s < last.s + 1.2 ? safeLane(b.s + 2.2 + Math.abs(b.speed) * 0.15) : null;
  if (sl != null) return { lane: sl, danger: true };
  if (ai.skill < 0.5) return { lane: null, danger: false };
  const me = trackInfo(b.x, b.y); if (!me || me.onShort) return { lane: null, danger: false };
  const obs = [];
  for (const t of WORLD.trash) {
    if (Math.abs(t.x - b.x) > 11 || Math.abs(t.y - b.y) > 11) continue;
    if ((t.id || (t.id = Math.random())) > ai.skill) continue;
    const ti = trackInfo(t.x, t.y); if (!ti || ti.onShort) continue;
    let ds = wrapS(ti.s - b.s); if (ds > MAIN.L / 2) ds -= MAIN.L;
    if (ds > 0.5 && ds < 9) obs.push({ ds, lat: ti.lat, w: 0.45 + b.T.radius * 0.75 + 0.25 });
  }
  if (!obs.length) return { lane: null, danger: false };
  const cur = me.lat, base = ai.baseOff || 0;
  let best = cur, bestScore = -1e9;
  for (let off = -2.3; off <= 2.31; off += 0.1) {
    let score = -Math.abs(off - cur) * 0.4 - Math.abs(off - base) * 0.15;
    for (const o of obs) {
      const gap = Math.abs(off - o.lat) - o.w; if (gap < 0) score -= 3 * (1 - gap) / (1 + o.ds * 0.25);
      if (o.ds < 3.5 && (o.lat - cur) * (o.lat - off) < 0) score -= 2;
    }
    if (score > bestScore) { bestScore = score; best = off; }
  }
  return { lane: best, danger: false };
}
function aiUpdate(b, dt) {
  const ai = b.ai, inp = b.input; inp.up = inp.down = inp.left = inp.right = inp.fire = false;
  if (b.sink > 0 || G.state === 'countdown') return;
  let tx, ty;
  if (ai.mode === 'sc') {
    const pts = SC[ai.sc].path.pts;
    while (ai.k < pts.length - 1 && Math.hypot(pts[ai.k].x - b.x, pts[ai.k].y - b.y) < 2.2) ai.k++;
    const q = pts[Math.min(pts.length - 1, ai.k + 3)]; tx = q.x; ty = q.y;
    if (ai.k >= pts.length - 2) ai.mode = 'main';
  } else {
    ai.offT -= dt; if (ai.offT <= 0) { ai.offT = rand(2, 5); ai.baseOff = rand(-1.3, 1.3); }
    ai.laneT = (ai.laneT || 0) - dt;
    if (ai.laneT <= 0) { ai.laneT = 0.12; const r = chooseLane(b, ai); ai.lane = r.lane; ai.danger = r.danger; }
    const la = ai.danger ? 2.6 + Math.abs(b.speed) * 0.3 : 4 + Math.abs(b.speed) * 0.45;
    ai.off = lerp(ai.off, ai.lane == null ? (ai.baseOff || 0) : ai.lane, 1 - Math.exp(-7 * dt));
    const p = ptAt(MAIN, b.s + la); tx = p.x + p.nx * ai.off; ty = p.y + p.ny * ai.off;
    SC.forEach((sc, i) => {
      const ds = wrapS(sc.sIn - b.s), key = b.lap + ':' + i;
      if (ds > 0 && ds < 3 && !ai.scDone[key]) { ai.scDone[key] = true; if (Math.random() < ai.scProb) { ai.mode = 'sc'; ai.sc = i; ai.k = 0; } }
    });
  }
  const want = Math.atan2(ty - b.y, tx - b.x), d = angDiff(b.h, want);
  if (d > 0.05) inp.right = true; else if (d < -0.05) inp.left = true;
  inp.up = Math.abs(d) < (ai.danger ? 0.7 : 1.4); inp.down = Math.abs(d) > 2.1 && b.speed > 2;
  if (ai.recover > 0) { ai.recover -= dt; inp.up = false; inp.down = true; }
  // destravar se ficar parado
  if (Math.abs(b.speed) < 0.6 && G.state !== 'countdown') { ai.stuckT = (ai.stuckT || 0) + dt; if (ai.stuckT > 1.8) { ai.recover = 0.7; ai.stuckT = 0; } } else ai.stuckT = 0;
  // equilíbrio: barcos do computador muito à frente seguram um pouco
  const ref = G.humans.length ? Math.max(...G.humans.map(h => h.prog)) : b.prog;
  ai.vmul = ai.auto ? 1 : clamp(1 + (ref - b.prog) / 160 * 0.12, 0.9, 1.06) * (0.93 + ai.skill * 0.08) * (ai.danger ? 0.8 : 1);
  // arremesso
  ai.throwCd -= dt;
  if (b.item && ai.throwCd <= 0 && !ai.auto) {
    let tgt = null, bestScore = 1e9;
    for (const o of G.boats) {
      if (o === b || o.sink > 0 || o.finished) continue;
      const dx = o.x - b.x, dy = o.y - b.y, dd = Math.hypot(dx, dy); if (dd < 4 || dd > 15) continue;
      if (Math.abs(angDiff(b.h, Math.atan2(dy, dx))) > 0.45) continue;
      const sc = dd - (o.human ? 4 : 0); if (sc < bestScore) { bestScore = sc; tgt = o; }
    }
    if (tgt) {
      const dd = Math.hypot(tgt.x - b.x, tgt.y - b.y), T = 0.45 + dd * 0.022, err = (1.3 - ai.skill) * 3.2;
      throwItem(b, tgt.x + Math.cos(tgt.h) * tgt.speed * T + rand(-err, err), tgt.y + Math.sin(tgt.h) * tgt.speed * T + rand(-err, err));
    }
    ai.throwCd = rand(0.5, 1.5);
  }
}

/* ---------- passo da simulação ---------- */
function step(dt) {
  G.t += dt;
  if (G.state === 'countdown') { const before = Math.ceil(G.countdown); G.countdown -= dt; const now = Math.ceil(G.countdown); if (now !== before && now > 0 && now <= 3) sfx('beep'); if (G.countdown <= 0.6) { G.state = 'race'; sfx('go'); } }
  if (G.state === 'race' || G.state === 'demo') G.raceT += dt;
  if (G.state === 'race' || G.state === 'demo' || G.state === 'countdown' || G.state === 'ended') {
    updateWind(dt);
    for (const b of G.boats) { if (b.ai) aiUpdate(b, dt); else readInput(b); }
    for (const b of G.boats) updateBoat(b, dt);
    interact(dt); updateProjectiles(dt); updateAnimals(dt); updateWaves(dt);
  }
  updateParticles(dt);
  if (G.state === 'race') {
    const allDone = G.humans.every(h => h.finished);
    const timeout = G.firstFinishT >= 0 && G.raceT - G.firstFinishT > 45;
    if ((allDone || timeout) && G.endTimer < 0) G.endTimer = 2.5;
    if (G.endTimer >= 0) { G.endTimer -= dt; if (G.endTimer < 0) { G.state = 'ended'; showResults(); } }
  }
  if (G.state === 'demo' && G.boats.some(b => b.finished)) setupRace(true);
}
function updateParticles(dt) {
  for (const p of G.particles) {
    if (p.k === 'drop') { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 9 * dt; p.life -= dt; if (p.z < 0) p.life = 0; }
    else if (p.k === 'plus') { p.z += p.vz * dt; p.life -= dt; }
    else { p.t += dt; }
  }
  G.particles = G.particles.filter(p => p.k === 'drop' || p.k === 'plus' ? p.life > 0 : p.t < p.life);
  if (G.particles.length > 700) G.particles.splice(0, G.particles.length - 700);
}

/* ===================== DESENHO ===================== */
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
const cam = { u: 0, v: 0, zoom: 30, shx: 0, shy: 0 };
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  W = Math.floor(cv.clientWidth * DPR); H = Math.floor(cv.clientHeight * DPR);
  cv.width = W; cv.height = H;
}
const isoU = (x, y) => (x - y) * ISO_X, isoV = (x, y) => (x + y) * ISO_Y;
function w2s(x, y, z = 0) { return [(isoU(x, y) - cam.u) * cam.zoom + W / 2 + cam.shx, (isoV(x, y) - cam.v) * cam.zoom + H / 2 + cam.shy - z * cam.zoom * HZ]; }
function setWorld() { const z = cam.zoom; ctx.setTransform(z * ISO_X, z * ISO_Y, -z * ISO_X, z * ISO_Y, -cam.u * z + W / 2 + cam.shx, -cam.v * z + H / 2 + cam.shy); }
function baseZoom() { return clamp(Math.min(W, H) / 21, 17 * DPR, 44 * DPR); }

function updateCamera(dt, snap) {
  let targets = G.humans.filter(b => b.sink <= 0 || true);
  if (G.state === 'demo' || !targets.length) {
    const lead = G.boats.slice().sort((a, b) => b.prog - a.prog)[0];
    targets = lead ? [lead] : [];
  }
  if (!targets.length) return;
  let u = 0, v = 0;
  targets.forEach(b => { const lead = targets.length === 1 ? 2.5 : 0; const x = b.x + Math.cos(b.h) * lead * Math.min(1, Math.abs(b.speed) / 4), y = b.y + Math.sin(b.h) * lead * Math.min(1, Math.abs(b.speed) / 4); u += isoU(x, y); v += isoV(x, y); });
  u /= targets.length; v /= targets.length;
  let z = baseZoom() * (G.state === 'demo' ? 0.85 : 1);
  if (targets.length > 1) {
    const us = targets.map(b => isoU(b.x, b.y)), vs = targets.map(b => isoV(b.x, b.y));
    const du = Math.max(...us) - Math.min(...us) + 6, dv = Math.max(...vs) - Math.min(...vs) + 5;
    z = Math.min(z, W * 0.8 / du, H * 0.72 / dv);
  }
  z = Math.max(z, 6.5 * DPR);
  const k = snap ? 1 : 1 - Math.exp(-4 * dt), kz = snap ? 1 : 1 - Math.exp(-2.5 * dt);
  cam.u = lerp(cam.u, u, k); cam.v = lerp(cam.v, v, k); cam.zoom = lerp(cam.zoom, z, kz);
  const sh = Math.max(0, ...G.humans.map(b => b.shake));
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  cam.shx = sh > 0 && !reduce ? rand(-1, 1) * sh * 14 * DPR : 0; cam.shy = sh > 0 && !reduce ? rand(-1, 1) * sh * 10 * DPR : 0;
}
function viewBounds() { const m = 6; const hu = W / 2 / cam.zoom + m, hv = H / 2 / cam.zoom + m; return { u0: cam.u - hu, u1: cam.u + hu, v0: cam.v - hv, v1: cam.v + hv + 4 }; }
function visible(x, y, vb) { const u = isoU(x, y), v = isoV(x, y); return u > vb.u0 && u < vb.u1 && v > vb.v0 && v < vb.v1; }

function drawGround() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const s = cam.zoom / ISO_PPU;
  const dx = (ISO_U0 - cam.u) * cam.zoom + W / 2 + cam.shx, dy = (ISO_V0 - cam.v) * cam.zoom + H / 2 + cam.shy;
  // recorte da fonte só na área visível
  let sx0 = Math.max(0, -dx / s), sy0 = Math.max(0, -dy / s);
  let sx1 = Math.min(GROUND.width, (W - dx) / s), sy1 = Math.min(GROUND.height, (H - dy) / s);
  if (sx1 > sx0 && sy1 > sy0) ctx.drawImage(GROUND, sx0, sy0, sx1 - sx0, sy1 - sy0, dx + sx0 * s, dy + sy0 * s, (sx1 - sx0) * s, (sy1 - sy0) * s);
}
function drawUpright(spr, x, y, z = 0, k = 1, alpha = 1) {
  const [sx, sy] = w2s(x, y, z), sc = cam.zoom * 0.8 / SPX * k;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(spr.c, sx - spr.ax * sc, sy - spr.ay * sc, spr.c.width * sc, spr.c.height * sc);
  if (alpha < 1) ctx.globalAlpha = 1;
}
function drawFlat(vb) {
  setWorld();
  // riscos de vento sobre a água
  if (G.streaks.length < 70) for (let i = 0; i < 4; i++) {
    const u = rand(vb.u0, vb.u1), v = rand(vb.v0, vb.v1);
    const x = (u / ISO_X + v / ISO_Y) / 2, y = (v / ISO_Y - u / ISO_X) / 2;
    if (isWater(x, y)) G.streaks.push({ x, y, t: 0, life: rand(1.2, 2.2), len: rand(1, 2.2) });
  }
  const wa = G.wind.a, wx = Math.cos(wa), wy = Math.sin(wa);
  ctx.lineCap = 'round';
  for (const s of G.streaks) {
    s.t += 1 / 60; s.x += wx * 5 / 60; s.y += wy * 5 / 60;
    const a = Math.sin(Math.PI * s.t / s.life) * 0.35;
    ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`; ctx.lineWidth = 0.07;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - wx * s.len, s.y - wy * s.len); ctx.stroke();
  }
  G.streaks = G.streaks.filter(s => s.t < s.life);
  // espuma e anéis
  for (const p of G.particles) {
    if (p.k === 'foam') { const k = p.t / p.life; ctx.fillStyle = `rgba(255,255,255,${(0.55 * (1 - k)).toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + p.g * k, 0, TAU); ctx.fill(); }
    else if (p.k === 'ring') { const k = p.t / p.life; ctx.strokeStyle = p.c.replace(/[\d.]+\)$/, (1 - k).toFixed(3) + ')'); ctx.lineWidth = 0.09; ctx.beginPath(); ctx.arc(p.x, p.y, lerp(p.r0, p.r1, k), 0, TAU); ctx.stroke(); }
  }
  // ondas do setor 4
  for (const w of G.waves) {
    const forming = w.t < 1.2, a = forming ? (w.t / 1.2) * 0.45 : Math.min(1, (w.life - w.t) / 0.6) * 0.95;
    const col = w.kind === 'back' ? [210, 245, 255] : w.kind === 'front' ? [255, 232, 140] : [170, 210, 255];
    if (w.kind === 'side') {
      const p = ptAt(MAIN, w.s); const len = 2.6, dir = Math.sign(w.v);
      for (let r = 0; r < 2; r++) { const lat = w.lat - dir * r * 0.5; ctx.strokeStyle = `rgba(${col},${(a * (r ? 0.4 : 1)).toFixed(3)})`; ctx.lineWidth = r ? 0.18 : 0.3;
        ctx.beginPath(); ctx.moveTo(p.x + p.nx * lat - p.tx * len, p.y + p.ny * lat - p.ty * len); ctx.quadraticCurveTo(p.x + p.nx * (lat + dir * 0.6), p.y + p.ny * (lat + dir * 0.6), p.x + p.nx * lat + p.tx * len, p.y + p.ny * lat + p.ty * len); ctx.stroke(); }
    } else {
      const dir = Math.sign(w.v);
      for (let r = 0; r < 3; r++) {
        const p = ptAt(MAIN, w.s - dir * r * 0.55); const bow = dir * 0.7;
        ctx.strokeStyle = `rgba(${col},${(a * [1, 0.45, 0.2][r]).toFixed(3)})`; ctx.lineWidth = [0.32, 0.2, 0.14][r];
        ctx.beginPath(); ctx.moveTo(p.x - p.nx * (HW - 0.1), p.y - p.ny * (HW - 0.1)); ctx.quadraticCurveTo(p.x + p.tx * bow, p.y + p.ty * bow, p.x + p.nx * (HW - 0.1), p.y + p.ny * (HW - 0.1)); ctx.stroke();
      }
      if (!forming && w.kind === 'front') { const p = ptAt(MAIN, w.s); for (let i = -1; i <= 1; i++) { ctx.fillStyle = `rgba(255,240,170,${(a * (0.6 + 0.4 * Math.sin(G.t * 9 + i))).toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x + p.nx * i * 1.6, p.y + p.ny * i * 1.6, 0.12, 0, TAU); ctx.fill(); } }
    }
  }
  // lixo flutuando
  for (const t of WORLD.trash) {
    if (!visible(t.x, t.y, vb)) continue;
    const img = t.kind === 'garrafa' ? SPR_BOTTLE : SPR_BAG, bob = Math.sin(G.t * 2 + t.ph) * 0.15;
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.a + bob);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, img.width / FPX / 2 + 0.1, img.height / FPX / 2 + 0.05, 0, 0, TAU); ctx.fill();
    ctx.drawImage(img, -img.width / FPX / 2, -img.height / FPX / 2, img.width / FPX, img.height / FPX); ctx.restore();
  }
  // avisos de salto (círculo na água) e sombras
  for (const f of G.fish) if (f.t < 0) { const k = 1 + f.t / 0.8; ctx.strokeStyle = `rgba(255,255,255,${(0.25 + 0.5 * k).toFixed(3)})`; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.arc(f.x, f.y, 0.25 + k * 0.6, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(f.x, f.y, 0.12 + k * 0.25, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = 'rgba(10,30,30,.3)';
  for (const bd of G.birds) { ctx.beginPath(); ctx.ellipse(bd.x, bd.y, 0.7 / (1 + bd.z * 0.2), 0.35, Math.atan2(bd.vy, bd.vx), 0, TAU); ctx.fill(); }
  for (const p of G.projectiles) { const k = p.t / p.T; ctx.beginPath(); ctx.arc(lerp(p.x0, p.x1, k), lerp(p.y0, p.y1, k), 0.3, 0, TAU); ctx.fill(); }
  // itens: anel na água
  for (const s of WORLD.itemSpots) if (s.off <= 0 && visible(s.x, s.y, vb)) { ctx.strokeStyle = s.type === 'siri' ? 'rgba(130,200,255,.8)' : 'rgba(255,230,160,.8)'; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.arc(s.x, s.y, 0.75 + Math.sin(G.t * 4 + s.ph) * 0.12, 0, TAU); ctx.stroke(); }
  // anel dos jogadores e mira
  for (const b of G.boats) {
    if (b.sink > 0) continue;
    if (b.human) { ctx.strokeStyle = b.color; ctx.globalAlpha = 0.85; ctx.lineWidth = 0.12; ctx.beginPath(); ctx.arc(b.x, b.y, b.T.radius + 1.0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    if (b.aiming) {
      const tx = b.x + Math.cos(b.h) * b.aimDist, ty = b.y + Math.sin(b.h) * b.aimDist;
      ctx.setLineDash([0.35, 0.3]); ctx.strokeStyle = b.color; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(b.h) * 1.5, b.y + Math.sin(b.h) * 1.5); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 0.14; ctx.beginPath(); ctx.arc(tx, ty, 1.4, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(tx - 0.5, ty); ctx.lineTo(tx + 0.5, ty); ctx.moveTo(tx, ty - 0.5); ctx.lineTo(tx, ty + 0.5); ctx.stroke();
    }
  }
}
function drawBoat(b) {
  setWorld();
  const meta = BOAT_META[b.T.key], skin = boatSkin(b.T.key, b.skin);
  const sinkK = b.sink > 0 ? b.sink / 3 : 1;
  ctx.save(); ctx.translate(b.x, b.y);
  const wob = Math.sin(G.t * 2.2 + b.slot) * 0.025 + (b.stun > 0 ? Math.sin(G.t * 20) * 0.12 : 0);
  ctx.rotate(b.h + wob);
  const sc = (1 / meta.ppu) * (0.7 + 0.3 * sinkK);
  ctx.globalAlpha = sinkK;
  ctx.fillStyle = 'rgba(0,30,30,.28)'; ctx.beginPath(); ctx.ellipse(0.15, 0.2, 1.45, 0.55, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.scale(sc, sc);
  ctx.globalAlpha = sinkK * clamp(Math.abs(b.speed) / (b.T.vmax * 0.6), 0, 1);
  ctx.drawImage(skin.spray, -meta.cx, -meta.cy);
  ctx.globalAlpha = sinkK;
  ctx.drawImage(skin.hull, -meta.cx, -meta.cy);
  ctx.restore();
  ctx.translate(meta.seat, 0); drawPilotTop(ctx, b.T.pilot, G.t);
  ctx.restore(); ctx.globalAlpha = 1;
  if (b.sink > 0 && Math.random() < 0.3) G.particles.push({ k: 'ring', x: b.x + rand(-0.6, 0.6), y: b.y + rand(-0.6, 0.6), r0: 0.05, r1: 0.4, t: 0, life: 0.6, c: 'rgba(255,255,255,.8)' });
}
function drawLabel(b) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const [sx, sy] = w2s(b.x, b.y, 2.4);
  const fs = Math.round(clamp(cam.zoom * 0.42, 10 * DPR, 15 * DPR));
  ctx.font = `700 ${fs}px "Barlow Semi Condensed", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const txt = b.human ? b.name : b.name, w = ctx.measureText(txt).width + fs * 0.9, h = fs * 1.35;
  ctx.fillStyle = b.human ? b.color : 'rgba(16,35,28,.78)';
  roundRect(ctx, sx - w / 2, sy - h / 2, w, h, h / 2); ctx.fill();
  if (!b.human) { ctx.strokeStyle = b.color; ctx.lineWidth = 1.5 * DPR; ctx.stroke(); }
  ctx.fillStyle = b.human ? '#10231c' : '#fff'; ctx.fillText(txt, sx, sy + fs * 0.05);
  if (b.item) { const spr = b.item === 'siri' ? SPR.siri : SPR.ostra; const k = fs * 1.6 / spr.c.width * 1.4; ctx.drawImage(spr.c, sx + w / 2 + 2 * DPR, sy - spr.c.height * k * 0.7, spr.c.width * k, spr.c.height * k); }
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = COL.forest; ctx.fillRect(0, 0, W, H);
  drawGround();
  const vb = viewBounds();
  drawFlat(vb);
  // objetos em pé, ordenados por profundidade
  const list = [];
  const add = (x, y, fn) => { if (visible(x, y, vb)) list.push({ d: x + y, fn }); };
  // árvores na frente de um barco ficam transparentes para não esconder a corrida
  const focus = (G.humans.length ? G.humans : G.boats).map(b => { const [sx, sy] = w2s(b.x, b.y); return { d: b.x + b.y, sx, sy }; });
  const fade = (x, y, hu) => { const [tx, ty] = w2s(x, y); for (const f of focus) if (x + y > f.d + 0.2 && Math.abs(f.sx - tx) < cam.zoom * 2.1 && f.sy < ty + cam.zoom * 0.4 && f.sy > ty - cam.zoom * hu) return 0.35; return 1; };
  for (const t of WORLD.trees) add(t.x, t.y, () => drawUpright(SPR.mangrove[t.v], t.x, t.y, 0, t.sc, fade(t.x, t.y, 3.8 * t.sc)));
  for (const p of WORLD.palms) add(p.x, p.y, () => drawUpright(SPR.palm[p.v], p.x, p.y, 0, 1, fade(p.x, p.y, 4.6)));
  for (const h of WORLD.houses) add(h.x, h.y, () => drawUpright(SPR.house[h.v], h.x, h.y, 0, 1, fade(h.x, h.y, 2.6)));
  for (const bu of WORLD.buoys) add(bu.x, bu.y, () => drawUpright(SPR[bu.spr], bu.x, bu.y, Math.sin(G.t * 2 + bu.ph) * 0.06));
  for (const f of WORLD.flags) add(f.x, f.y, () => drawUpright(SPR.flags[f.i], f.x, f.y));
  for (const r of WORLD.rocks) add(r.x, r.y, () => drawUpright(SPR.rock[r.v], r.x, r.y, 0, r.r / 0.8));
  for (const r of WORLD.repairs) if (r.off <= 0) add(r.x, r.y, () => drawUpright(SPR.repair, r.x, r.y, Math.sin(G.t * 3 + r.x) * 0.08));
  for (const s of WORLD.itemSpots) if (s.off <= 0) add(s.x, s.y, () => drawUpright(s.type === 'siri' ? SPR.siri : SPR.ostra, s.x, s.y, 0.25 + Math.sin(G.t * 3 + s.ph) * 0.12, 1.25));
  for (const b of G.boats) add(b.x, b.y, () => drawBoat(b));
  for (const f of G.fish) if (f.t >= 0) { const k = f.t / f.T, x = f.x + f.dx * k, y = f.y + f.dy * k; add(x, y, () => {
    const [sx, sy] = w2s(x, y, 4 * 1.7 * k * (1 - k)); const [ex, ey] = w2s(x + f.dx * 0.05, y + f.dy * 0.05, 4 * 1.7 * (k + 0.05) * (0.95 - k));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(sx, sy); let a = Math.atan2(ey - sy, ex - sx); ctx.rotate(a); if (Math.abs(a) > Math.PI / 2) ctx.scale(1, -1);
    const s = cam.zoom * 0.8 / SPX; ctx.drawImage(SPR_FISH, -SPR_FISH.width * s / 2, -SPR_FISH.height * s / 2, SPR_FISH.width * s, SPR_FISH.height * s); }); }
  for (const bd of G.birds) add(bd.x, bd.y, () => {
    const [sx, sy] = w2s(bd.x, bd.y, bd.z + 0.4); const img = SPR_HERON[Math.floor(G.t * 7 + bd.ph) % 2];
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(sx, sy); const su = isoU(bd.vx, bd.vy); if (su < 0) ctx.scale(-1, 1);
    const s = cam.zoom * 0.8 / SPX; ctx.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s); });
  for (const p of G.projectiles) { const k = p.t / p.T, x = lerp(p.x0, p.x1, k), y = lerp(p.y0, p.y1, k); add(x, y, () => drawUpright(p.kind === 'siri' ? SPR.siri : SPR.ostra, x, y, 4 * p.peak * k * (1 - k), 1.1)); }
  list.sort((a, b) => a.d - b.d);
  for (const o of list) { o.fn(); }
  // partículas em pé
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const p of G.particles) {
    if (p.k === 'drop') { const [sx, sy] = w2s(p.x, p.y, p.z); ctx.fillStyle = p.c; ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.beginPath(); ctx.arc(sx, sy, cam.zoom * 0.06, 0, TAU); ctx.fill(); }
    else if (p.k === 'plus') { const [sx, sy] = w2s(p.x, p.y, p.z); const s = cam.zoom * 0.12; ctx.fillStyle = p.c; ctx.globalAlpha = clamp(p.life * 1.5, 0, 1); ctx.fillRect(sx - s, sy - s * 0.3, s * 2, s * 0.6); ctx.fillRect(sx - s * 0.3, sy - s, s * 0.6, s * 2); }
  }
  ctx.globalAlpha = 1;
  if (G.state !== 'demo' && G.state !== 'menu') {
    for (const b of G.boats) if (b.sink <= 0 && visible(b.x, b.y, vb)) drawLabel(b);
    drawOffscreenArrows();
  }
}
function drawOffscreenArrows() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const m = 34 * DPR;
  for (const b of G.humans) {
    const [sx, sy] = w2s(b.x, b.y);
    if (sx > m && sx < W - m && sy > m && sy < H - m) continue;
    const cx = W / 2, cy = H / 2, a = Math.atan2(sy - cy, sx - cx);
    const px = clamp(sx, m, W - m), py = clamp(sy, m, H - m);
    ctx.save(); ctx.translate(px, py); ctx.rotate(a);
    ctx.fillStyle = b.color; ctx.strokeStyle = '#10231c'; ctx.lineWidth = 2 * DPR;
    ctx.beginPath(); ctx.moveTo(16 * DPR, 0); ctx.lineTo(-10 * DPR, -12 * DPR); ctx.lineTo(-10 * DPR, 12 * DPR); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.font = `700 ${13 * DPR}px "Barlow Semi Condensed", sans-serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(b.name, px - Math.cos(a) * 26 * DPR, py - Math.sin(a) * 26 * DPR + 4 * DPR);
  }
}

/* ===================== INTERFACE, ENTRADA, SOM E LAÇO ===================== */
const $ = id => document.getElementById(id);
const KEYS = {}, TOUCH = { up: false, down: false, left: false, right: false, fire: false };
const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'NumpadEnter', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftRight', 'Numpad0'];
addEventListener('keydown', e => {
  const racing = G.state === 'race' || G.state === 'countdown';
  if (racing && GAME_KEYS.includes(e.code)) e.preventDefault();
  if (e.code === 'Escape' || (e.code === 'KeyP' && racing)) { if (racing || G.paused) togglePause(); return; }
  if (e.code === 'KeyM' && !e.repeat) { toggleMute(); }
  KEYS[e.code] = true;
});
addEventListener('keyup', e => { KEYS[e.code] = false; });
addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; });
function readInput(b) {
  const i = b.input, both = G.mode === 1;
  if (b.slot === 0) {
    i.up = !!(KEYS.KeyW || (both && KEYS.ArrowUp) || TOUCH.up);
    i.down = !!(KEYS.KeyS || (both && KEYS.ArrowDown) || TOUCH.down);
    i.left = !!(KEYS.KeyA || (both && KEYS.ArrowLeft) || TOUCH.left);
    i.right = !!(KEYS.KeyD || (both && KEYS.ArrowRight) || TOUCH.right);
    i.fire = !!(KEYS.Space || (both && (KEYS.Enter || KEYS.NumpadEnter)) || TOUCH.fire);
  } else {
    i.up = !!KEYS.ArrowUp; i.down = !!KEYS.ArrowDown; i.left = !!KEYS.ArrowLeft; i.right = !!KEYS.ArrowRight;
    i.fire = !!(KEYS.Enter || KEYS.NumpadEnter || KEYS.ShiftRight || KEYS.Numpad0);
  }
}

/* ---------- som (sintetizado) ---------- */
let AC = null, muted = false;
function audioInit() { if (AC) { AC.resume && AC.resume(); return; } try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
function tone(f, d, type = 'sine', vol = 0.12, slide = 0, delay = 0) {
  if (!AC || muted) return; const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, vol, freq) {
  if (!AC || muted) return; const t = AC.currentTime, len = Math.floor(AC.sampleRate * d), buf = AC.createBuffer(1, len, AC.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f).connect(g).connect(AC.destination); s.start(t);
}
function sfx(name, b) {
  if (b && !b.human) return;
  switch (name) {
    case 'beep': tone(620, 0.16, 'square', 0.07); break;
    case 'go': tone(930, 0.4, 'square', 0.08); tone(1240, 0.3, 'triangle', 0.06, 0, 0.08); break;
    case 'hit': noise(0.25, 0.3, 500); tone(160, 0.2, 'sawtooth', 0.06, -80); break;
    case 'bump': noise(0.12, 0.12, 300); break;
    case 'splash': noise(0.35, 0.16, 1600); break;
    case 'trash': tone(300, 0.1, 'triangle', 0.08, -120); noise(0.12, 0.08, 1200); break;
    case 'pick': tone(880, 0.08, 'triangle', 0.1); tone(1320, 0.12, 'triangle', 0.1, 0, 0.07); break;
    case 'heal': tone(660, 0.1, 'sine', 0.1); tone(990, 0.16, 'sine', 0.1, 0, 0.08); break;
    case 'throw': tone(420, 0.14, 'sawtooth', 0.05, 260); break;
    case 'wave': noise(0.5, 0.1, 900); break;
    case 'flap': noise(0.15, 0.12, 2500); break;
    case 'sink': tone(300, 0.8, 'sine', 0.1, -220); break;
    case 'finish': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, 0, i * 0.12)); break;
  }
}
function toggleMute() { muted = !muted; const b = $('muteBtn'); if (b) { b.textContent = muted ? 'Som: desligado' : 'Som: ligado'; b.setAttribute('aria-pressed', String(!muted)); } }

/* ---------- retratos ---------- */
const PORTRAIT = { marisqueira: { w: 238, h: 520, cx: 122, cy: 95, s: 140 }, caranguejo: { w: 188, h: 520, cx: 110, cy: 82, s: 135 } };
function portraitCss(kind, size) {
  const p = PORTRAIT[kind], k = size / p.s;
  return `background-image:url(${ASSET[kind]});background-size:${(p.w * k).toFixed(1)}px ${(p.h * k).toFixed(1)}px;background-position:${(-(p.cx * k - size / 2)).toFixed(1)}px ${(-(p.cy * k - size / 2)).toFixed(1)}px`;
}
const fmt = t => { if (t == null) return '—'; const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };

/* ---------- menu ---------- */
const STATS = {
  ligeiro: [['Velocidade', 0.92], ['Curva', 0.9], ['Resistência', 0.38], ['Força do vento', 0.5]],
  resistente: [['Velocidade', 0.72], ['Curva', 0.52], ['Resistência', 0.95], ['Força do vento', 0.95]]
};
const BLURB = {
  ligeiro: 'Casco fino, motor de popa e vela pequena. Corre muito e depende menos do vento, mas quebra fácil.',
  resistente: 'Casco largo, vela grande remendada e baú com a rede. Aguenta pancada e voa com vento a favor.'
};
function buildMenu() {
  for (let p = 0; p < 2; p++) {
    const wrap = $('cards' + p); wrap.innerHTML = '';
    for (const key of ['ligeiro', 'resistente']) {
      const T = TYPES[key];
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'card'; btn.id = `pick-${p}-${key}`;
      btn.setAttribute('aria-pressed', String(G.picks[p] === key));
      btn.innerHTML = `<span class="card-art"><img class="card-pilot" src="${ASSET[T.pilot]}" alt="${T.pilotName}"><img class="card-boat" src="${ASSET[key + '_hull']}" alt="Barco ${T.name}"></span>
        <span class="card-body"><span class="card-title">${T.name}</span><span class="card-pilotname">${T.pilotName}</span>
        <span class="card-blurb">${BLURB[key]}</span>
        <span class="stats">${STATS[key].map(([l, v]) => `<span class="stat"><span>${l}</span><span class="meter"><i style="width:${Math.round(v * 100)}%"></i></span></span>`).join('')}</span></span>`;
      btn.addEventListener('click', () => { G.picks[p] = key; wrap.querySelectorAll('.card').forEach(c => c.setAttribute('aria-pressed', String(c === btn))); });
      wrap.appendChild(btn);
    }
  }
  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(+b.dataset.mode)));
  setMode(G.mode);
  $('startBtn').addEventListener('click', startRace);
  $('againBtn').addEventListener('click', () => { $('results').hidden = true; startRace(); });
  $('menuBtn').addEventListener('click', toMenu);
  $('resumeBtn').addEventListener('click', togglePause);
  $('quitBtn').addEventListener('click', () => { G.paused = false; $('pause').hidden = true; toMenu(); });
  $('muteBtn').addEventListener('click', toggleMute);
}
function setMode(m) {
  G.mode = m;
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.mode === m)));
  $('pick1').hidden = m !== 2;
  $('p1keys').textContent = m === 2 ? 'W A S D · segure Espaço para mirar' : 'W A S D ou setas · segure Espaço para mirar';
}
function startRace() {
  audioInit();
  $('menu').hidden = true; $('results').hidden = true; $('hud').hidden = false;
  setupRace(false); buildHud(); updateCamera(0, true);
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  $('touch').hidden = !(coarse && G.mode === 1);
}
function toMenu() {
  $('results').hidden = true; $('hud').hidden = true; $('touch').hidden = true; $('menu').hidden = false;
  setupRace(true); updateCamera(0, true);
}
function togglePause() {
  if (G.state !== 'race' && G.state !== 'countdown' && !G.paused) return;
  G.paused = !G.paused; $('pause').hidden = !G.paused;
}

/* ---------- painel dos jogadores ---------- */
function buildHud() {
  const box = $('panels'); box.innerHTML = '';
  box.className = 'panels n' + G.humans.length;
  G.humans.forEach((b, i) => {
    const el = document.createElement('section'); el.className = 'panel'; el.style.setProperty('--pc', b.color);
    el.setAttribute('aria-label', `Painel do jogador ${i + 1}`);
    el.innerHTML = `<div class="ph"><span class="pport" style="${portraitCss(b.T.pilot, 46)}"></span>
      <span class="pname"><b>${b.name} · ${b.T.name}</b><span>${b.T.pilotName}</span></span>
      <span class="ppos"><b data-r="pos">1º</b><span>de 4</span></span></div>
      <div class="hp"><span class="lbl">Vida</span><span class="bar"><i data-r="hpbar"></i></span><span class="num" data-r="hp"></span></div>
      <div class="row3"><span class="cell"><span class="lbl">Velocidade</span><span><b data-r="spd">0</b> <small>nós</small></span></span>
        <span class="cell"><span class="lbl">Volta</span><b data-r="lap">1/${LAPS}</b></span>
        <span class="cell wind" data-r="wind"><span class="lbl">Vento</span><b data-r="windt">—</b></span></div>
      <div class="itemrow"><span class="lbl">Item</span><span class="itemslot" data-r="item">vazio</span><kbd>${i === 0 ? 'Espaço' : 'Enter'}</kbd></div>
      <div class="splits">${[0, 1, 2, 3].map(k => `<span class="split" style="--sc:${SECTORS[k].color}" data-r="s${k}"><em>S${k + 1}</em><b>—</b></span>`).join('')}</div>
      <div class="laps"><span>Volta atual <b data-r="lt">0:00.0</b></span><span>Melhor <b data-r="bl">—</b></span></div>
      <div class="toast" data-r="toast" aria-live="polite"></div>`;
    box.appendChild(el);
    b.ui = {}; el.querySelectorAll('[data-r]').forEach(n => b.ui[n.dataset.r] = n);
  });
}
let hudClock = 0;
function hudTick(dt) {
  hudClock -= dt;
  // contagem regressiva
  const cd = $('countdown');
  if (G.state === 'countdown') { const n = Math.ceil(G.countdown - 0.6); cd.hidden = false; cd.textContent = n > 0 ? String(n) : 'Já!'; cd.dataset.n = cd.textContent; }
  else if (G.state === 'race' && G.raceT < 0.9) { cd.hidden = false; cd.textContent = 'Já!'; }
  else cd.hidden = true;
  if (hudClock > 0) return; hudClock = 0.1;
  drawWindsock();
  if (G.state === 'demo' || G.state === 'menu') return;
  const order = G.boats.slice().sort((a, b) => b.prog - a.prog);
  for (const b of G.humans) {
    const u = b.ui; if (!u) continue;
    const pos = order.indexOf(b) + 1;
    u.pos.textContent = (b.finished ? b.place : pos) + 'º';
    const hpK = b.hp / b.T.maxHp; u.hpbar.style.width = (hpK * 100).toFixed(0) + '%'; u.hpbar.dataset.low = hpK < 0.3 ? '1' : '0';
    u.hp.textContent = Math.ceil(b.hp);
    u.spd.textContent = (Math.abs(b.speed) * 1.6).toFixed(1);
    u.lap.textContent = b.finished ? 'fim' : `${Math.max(1, Math.min(LAPS, b.lap))}/${LAPS}`;
    const [wl, wc] = windLabel(b); u.windt.textContent = wl; u.wind.dataset.w = wc;
    u.item.textContent = b.aiming ? 'mirando… solte!' : b.item ? (b.item === 'siri' ? 'Siri' : 'Ostra') : 'vazio'; u.item.dataset.has = b.item ? '1' : '0';
    for (let k = 0; k < 4; k++) {
      const el = u['s' + k], bEl = el.querySelector('b');
      let txt = '—', live = false;
      if (b.lap >= 1 && !b.finished) { if (k < b.sector) txt = fmt(b.splits[k]); else if (k === b.sector) { txt = fmt(G.raceT - b.secStartT); live = true; } }
      else if (b.finished && b.lastSplits) txt = fmt(b.lastSplits[k]);
      bEl.textContent = txt; el.dataset.live = live ? '1' : '0';
    }
    u.lt.textContent = b.finished ? fmt(b.finishT) : b.lap >= 1 ? fmt(G.raceT - b.lapStartT) : '0:00.0';
    u.bl.textContent = fmt(b.bestLap);
    if (b.toastT > 0 && b.toast) { u.toast.textContent = b.toast.text; u.toast.style.color = b.toast.color; u.toast.dataset.on = '1'; } else u.toast.dataset.on = '0';
  }
}
function drawWindsock() {
  const c = $('windc'); if (!c) return; const g = c.getContext('2d'), s = c.width;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, s, s);
  const wx = Math.cos(G.wind.a), wy = Math.sin(G.wind.a), a = Math.atan2(isoV(wx, wy), isoU(wx, wy));
  g.translate(s / 2, s / 2); g.rotate(a);
  const L = s * 0.36;
  g.strokeStyle = '#10231c'; g.lineWidth = s * 0.04; g.beginPath(); g.moveTo(-L, 0); g.lineTo(-L, s * 0.2); g.stroke();
  for (let i = 0; i < 4; i++) {
    const x0 = -L + i * L * 0.45, x1 = x0 + L * 0.45, h0 = s * (0.15 - i * 0.025), h1 = s * (0.15 - (i + 1) * 0.025);
    g.fillStyle = i % 2 ? '#f6f1e3' : '#e3542f'; g.beginPath(); g.moveTo(x0, -h0); g.lineTo(x1, -h1); g.lineTo(x1, h1); g.lineTo(x0, h0); g.closePath(); g.fill();
    g.strokeStyle = '#10231c'; g.lineWidth = s * 0.02; g.stroke();
  }
}
function drawMini() {
  const c = $('mini'); if (!c || $('hud').hidden) return;
  const g = c.getContext('2d'), sx = c.width / WW, sy = c.height / WH;
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(MINI_BASE, 0, 0, c.width, c.height);
  const order = G.boats.slice().sort((a, b) => (a.human ? 1 : 0) - (b.human ? 1 : 0));
  for (const b of order) {
    const x = (b.x - WX0) * sx, y = (b.y - WY0) * sy, r = b.human ? 5.5 : 4;
    g.fillStyle = b.color; g.strokeStyle = '#10231c'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
    if (b.human) { g.fillStyle = '#10231c'; g.font = '700 9px "Barlow Semi Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.slot + 1, x, y + 0.5); }
  }
}

/* ---------- resultado ---------- */
function showResults() {
  const order = G.boats.slice().sort((a, b) => b.prog - a.prog);
  const rows = order.map((b, i) => `<tr class="${b.human ? 'me' : ''}" style="--pc:${b.color}"><td class="rp">${i + 1}º</td>
    <td><span class="rdot"></span><b>${b.human ? b.name : b.name}</b> <span class="muted">${b.T.name} · ${b.T.pilotName}</span></td>
    <td class="num">${b.finished ? fmt(b.finishT) : 'não chegou'}</td><td class="num">${fmt(b.bestLap)}</td></tr>`).join('');
  $('resTable').innerHTML = `<thead><tr><th>Pos.</th><th>Barco</th><th class="num">Tempo total</th><th class="num">Melhor volta</th></tr></thead><tbody>${rows}</tbody>`;
  const win = order[0];
  $('resTitle').textContent = win.human ? `${win.name} venceu a regata!` : `${win.name} venceu a regata`;
  $('hud').hidden = true; $('touch').hidden = true; $('results').hidden = false;
}

/* ---------- toque (1 jogador) ---------- */
function bindTouch() {
  document.querySelectorAll('#touch [data-t]').forEach(el => {
    const k = el.dataset.t;
    const on = e => { e.preventDefault(); TOUCH[k] = true; el.dataset.on = '1'; };
    const off = e => { e.preventDefault(); TOUCH[k] = false; el.dataset.on = '0'; };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
  });
}

/* ---------- laço principal ---------- */
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (!G.paused) step(dt);
  updateCamera(dt);
  render(); drawMini(); hudTick(dt);
  requestAnimationFrame(frame);
}
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
async function boot() {
  resize(); addEventListener('resize', resize);
  const keys = ['ligeiro_hull', 'ligeiro_spray', 'resistente_hull', 'resistente_spray'];
  const imgs = await Promise.all(keys.map(k => loadImg(ASSET[k])));
  keys.forEach((k, i) => IMG[k] = imgs[i]);
  buildSprites(); placeWorld(); renderGround();
  buildMenu(); bindTouch();
  setupRace(true); updateCamera(0, true);
  $('loading').hidden = true; $('menu').hidden = false;
  requestAnimationFrame(t => { lastT = t; frame(t); });
}
boot().catch(err => { console.error(err); $('loading').textContent = 'Não foi possível carregar o jogo. Recarregue a página.'; });

