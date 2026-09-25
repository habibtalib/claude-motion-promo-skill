// motion-promo — the skill's own promo, rendered with the skill. 29s, 1920x1080.
import {
  THREE, P, FACE, createStage, groundDisc, laptop, tree, card, burst, pop, onFrame, ev, cameraRig, captions, outro, run,
  liveCanvas, canvasTex, pillTex, sprite, rrect, check, font, loadImg, spring, seg, eIO, clamp,
  beatGrid, countUp, mesh, RB, bezier, rng,
} from './lib.js';

const DUR = 29;
const [W, H] = [1920, 1080];
const BPM = 100, B = beatGrid(BPM);
const C = { navy: 0x1B1F3B, violet: 0x6C4CF1, violetL: 0x9B86F7, coral: 0xFF6B5B, sun: 0xFFC83D, mint: 0x2EC4A0, paper: 0xFCFCFE, ink: 0x2A2D4A };

const LOGO = await loadImg('assets/logo.png');
const stage = createStage({ W, H });
const { scene, camera } = stage;
groundDisc(scene, { t0: 0.05, lip: C.violetL });

// ---------- timeline ----------
const T = { s1: B.snap(2.5), s2: B.snap(8.2), s3: B.snap(13.6), s4: B.snap(19.0), out: B.snap(24.2) };
const PROMPT = '> make a 30s promo video for my app — 3D isometric, brand colours';
const P0 = 3.2, PTYPE = 1.5;
for (let c = 0; c < PROMPT.length; c++) { if (PROMPT[c] !== ' ') { ev(P0 + c / PROMPT.length * PTYPE, 'type'); } }
const STEPS = [
  ['Loaded skill: motion-promo', 5.0],
  ['Sampled brand colours from logo.png', 5.55],
  ['Storyboard: intro + 4 scenes + outro', 6.1],
  ['Built scene.js — Three.js diorama', 6.65],
];
STEPS.forEach(([, t], i) => ev(t, 'ding', { pitch: i }));
const RENDER0 = T.s3 + 0.5, RENDER1 = T.s4 - 0.6, FRAMES = 900;
const MIX_T = T.s4 + 3.2;

// ---------- terminal screen ----------
function termLine(g, y, text, col = '#E6E4F5', w = 500, x = 56) { g.fillStyle = col; g.font = font(w, 30); g.fillText(text, x, y); }
const screen = liveCanvas(1280, 800, (g, t, w, h) => {
  g.fillStyle = '#14162B'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1F2240'; g.fillRect(0, 0, w, 64);
  ['#FF6B5B', '#FFC83D', '#2EC4A0'].forEach((c, i) => { g.beginPath(); g.arc(40 + i * 34, 32, 11, 0, 7); g.fillStyle = c; g.fill(); });
  g.fillStyle = '#9A98B8'; g.font = font(600, 24); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('~/my-app — claude', w / 2, 33); g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  const n = Math.floor(PROMPT.length * clamp((t - P0) / PTYPE));
  termLine(g, 140, PROMPT.slice(0, n), '#FFFFFF', 600);
  if (t < P0 + PTYPE + 0.3 && Math.floor(t * 5) % 2 === 0) { const x = 56 + g.measureText(PROMPT.slice(0, n)).width; g.fillStyle = '#FFC83D'; g.fillRect(x + 4, 114, 14, 32); }
  STEPS.forEach(([s, ts], i) => {
    if (t < ts) { return; }
    const k = spring(seg(t, ts, ts + 0.4)), y = 215 + i * 62;
    g.save(); g.globalAlpha = clamp(k * 1.5); g.translate((1 - k) * 30, 0);
    g.beginPath(); g.arc(74, y - 10, 17, 0, 7); g.fillStyle = '#2EC4A0'; g.fill(); check(g, 74, y - 10, 20, '#14162B', 5);
    termLine(g, y, s, '#E6E4F5', 500, 112); g.restore();
  });
  if (t > RENDER0 - 0.4) {
    const k = clamp((t - RENDER0) / (RENDER1 - RENDER0)), y = 500;
    g.fillStyle = '#9A98B8'; g.font = font(600, 28); g.fillText('Rendering frames', 56, y);
    rrect(g, 56, y + 24, w - 112, 28, 14, '#262A4D'); rrect(g, 56, y + 24, Math.max(28, (w - 112) * k), 28, 14, '#6C4CF1');
    g.fillStyle = '#FFFFFF'; g.font = font(700, 28); g.textAlign = 'right'; g.fillText(countUp(t, RENDER0, RENDER1 - RENDER0, FRAMES) + ' / 900', w - 56, y); g.textAlign = 'left';
  }
  if (t > T.s4 + 0.3) {
    const y = 640;
    g.fillStyle = '#9A98B8'; g.font = font(600, 28); g.fillText('Scoring soundtrack', 56, y);
    for (let i = 0; i < 64; i++) {
      const a = (0.25 + 0.75 * Math.abs(Math.sin(i * 0.7 + t * 9) * Math.sin(i * 0.23 + t * 3))) * clamp((t - T.s4 - 0.3) * 2);
      rrect(g, 56 + i * 18, y + 60 - a * 48, 10, a * 96, 5, i % 7 === 0 ? '#FFC83D' : '#6C4CF1');
    }
  }
  if (t > MIX_T) {
    const k = spring(seg(t, MIX_T, MIX_T + 0.5));
    g.save(); g.translate(w - 56, 640); g.scale(k, k);
    rrect(g, -330, -40, 330, 56, 28, '#2EC4A0'); g.fillStyle = '#14162B'; g.font = font(800, 26); g.fillText('promo.mp4 ready', -270, -3); check(g, -300, -12, 22, '#14162B', 5);
    g.restore();
  }
});
const lap = laptop({ body: 0x3A3E5C, screenTex: screen.tex });
lap.position.copy(P(-1.7, -1.7)); lap.rotation.y = FACE; lap.scale.setScalar(1.35); scene.add(lap);
pop(lap, 0.45, { dur: 0.8, pitch: 2 });

[[-6.2, -4.2, 1], [-6.4, 2.6, 0.8], [2.0, -6.8, 0.9]].forEach(([u, v, s], i) => {
  const tr = tree(s, { leaf: C.mint }); tr.position.copy(P(u, v)); scene.add(tr); pop(tr, 0.75 + i * 0.12, { pitch: 1 + i });
});

// ---------- scene 2: a diorama assembles itself ----------
const STAGE_POS = P(4.5, 1.2);
const mini = new THREE.Group(); mini.position.copy(STAGE_POS); scene.add(mini);
mini.add(mesh(new THREE.CylinderGeometry(2.5, 2.6, 0.3, 64), C.violetL, { y: 0.15 }));
mini.add(mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.04, 64), 0xEDEBFB, { y: 0.31 }));
pop(mini, T.s2 + 0.1, { dur: 0.8, out: T.s4 - 0.3, pitch: 0 });
const miniProps = [];
function addMini(g, x, z, t0, pitch) { g.position.set(x, 0.32, z); mini.add(g); pop(g, t0, { dur: 0.65, out: T.s4 - 0.4, pitch }); miniProps.push(g); return g; }
{
  const house = new THREE.Group();
  house.add(mesh(RB(1.1, 0.8, 0.9, 0.05), C.paper, { y: 0.4 }));
  const roof = mesh(new THREE.ConeGeometry(0.85, 0.6, 4), C.coral, { y: 1.1, ry: Math.PI / 4 }); house.add(roof);
  house.add(mesh(RB(0.25, 0.4, 0.05, 0.02), C.navy, { y: 0.2, z: 0.46 }));
  addMini(house, -0.7, -0.6, T.s2 + 0.6, 2);
  const t1 = tree(0.55, { leaf: C.mint }); addMini(t1, 1.1, -0.9, T.s2 + 0.8, 4);
  const coins = new THREE.Group();
  for (let i = 0; i < 5; i++) { coins.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.09, 24), C.sun, { y: 0.045 + i * 0.095, x: (rng() - .5) * .04 })); }
  addMini(coins, 0.9, 0.7, T.s2 + 1.0, 6);
  const ph = new THREE.Group(); ph.add(mesh(RB(0.45, 0.85, 0.06, 0.05), C.navy, { y: 0.45, rx: -0.2 }));
  addMini(ph, -0.9, 0.9, T.s2 + 1.2, 7);
  const star = mesh(new THREE.OctahedronGeometry(0.35), C.sun, { y: 0.5 }); const sg = new THREE.Group(); sg.add(star); addMini(sg, 0.1, 0.2, T.s2 + 1.4, 9);
  onFrame(t => { star.rotation.y = t * 2; star.position.y = 0.55 + Math.sin(t * 3) * 0.08; });
}
// palette chips + storyboard cards floating above
const chips = [C.violet, C.coral, C.sun, C.mint].map((c, i) => {
  const m = mesh(RB(0.62, 0.62, 0.14, 0.14), c); scene.add(m);
  pop(m, T.s2 + 1.9 + i * 0.15, { dur: 0.6, out: T.s3 + 0.1 + i * 0.05, outDur: 0.3, pitch: 3 + i }); return m;
});
const palLab = pillTex('Brand colours', { fs: 56 });
const palS = sprite(palLab.tex, 0.55, palLab.aspect); scene.add(palS); pop(palS, T.s2 + 2.4, { sfx: null, out: T.s3 + 0.1, outDur: 0.3 });
const boardTex = ['Intro', 'Scene 1', 'Scene 2', 'Outro'].map((n, i) => canvasTex(360, 240, (g, w, h) => {
  rrect(g, 0, 0, w, h, 26, '#FFFFFF'); rrect(g, 20, 20, w - 40, 130, 16, ['#6C4CF1', '#FF6B5B', '#FFC83D', '#2EC4A0'][i]);
  g.fillStyle = '#1B1F3B'; g.font = font(800, 40); g.fillText(n, 24, 205);
}));
const boards = boardTex.map((tx, i) => {
  const b = card(tx, 1.2, 0.8, { depth: 0.06 }); b.rotation.y = FACE; scene.add(b);
  pop(b, T.s2 + 3.0 + i * 0.18, { dur: 0.6, out: T.s3 + 0.15 + i * 0.05, outDur: 0.3, pitch: 5 + i }); return b;
});

// ---------- scene 3: frames fly into a film reel ----------
const REEL = P(5.9, -2.4, 2.3);
const reel = new THREE.Group(); reel.position.copy(REEL); reel.rotation.y = FACE; scene.add(reel);
const reelSpin = new THREE.Group(); reel.add(reelSpin);
reelSpin.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.28, 48), C.navy, { rx: Math.PI / 2 }));
reelSpin.add(mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.34, 24), C.sun, { rx: Math.PI / 2 }));
for (let i = 0; i < 6; i++) {
  const a = i / 6 * Math.PI * 2;
  reelSpin.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.32, 20), C.violetL, { x: Math.cos(a) * 0.9, y: Math.sin(a) * 0.9, rx: Math.PI / 2 }));
}
const post = mesh(new THREE.CylinderGeometry(0.1, 0.14, 2.3, 12), C.ink, { y: -1.15, z: -0.2 }); reel.add(post);
pop(reel, T.s3 + 0.2, { dur: 0.8, out: T.s4 - 0.1, pitch: 1 });
const frameTex = [0, 1, 2, 3].map(i => canvasTex(300, 200, (g, w, h) => {
  g.fillStyle = '#1B1F3B'; g.fillRect(0, 0, w, h);
  for (let x = 12; x < w; x += 34) { rrect(g, x, 8, 18, 16, 4, '#FFFFFF'); rrect(g, x, h - 24, 18, 16, 4, '#FFFFFF'); }
  const c = ['#6C4CF1', '#FF6B5B', '#FFC83D', '#2EC4A0'][i];
  rrect(g, 16, 36, w - 32, h - 72, 10, '#EDEBFB');
  g.beginPath(); g.ellipse(w / 2, h / 2 + 18, 90, 26, 0, 0, 7); g.fillStyle = '#C9C3EE'; g.fill();
  rrect(g, w / 2 - 34, h / 2 - 34, 68, 50, 8, c);
}));
const LAP_SCREEN = lap.position.clone().add(new THREE.Vector3(0, 2.0, 0));
const FILM_N = 26, FILM_DT = (RENDER1 - RENDER0 - 1.0) / FILM_N;
const film = [];
for (let i = 0; i < FILM_N; i++) {
  const f = card(frameTex[i % 4], 0.9, 0.6, { slab: C.navy, depth: 0.04 }); f.visible = false; scene.add(f); film.push(f);
  ev(RENDER0 + i * FILM_DT, 'type');
}
const filmPath = bezier(LAP_SCREEN, LAP_SCREEN.clone().lerp(REEL, 0.5).add(new THREE.Vector3(0, 3.2, 0)), REEL);
const counter = liveCanvas(620, 150, (g, t, w, h) => {
  g.clearRect(0, 0, w, h); rrect(g, 6, 6, w - 12, h - 12, (h - 12) / 2, '#FFFFFF', '#E6E2F4', 5);
  g.fillStyle = '#6C4CF1'; g.beginPath(); g.arc(78, h / 2, 34, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(66, h / 2 - 18); g.lineTo(66, h / 2 + 18); g.lineTo(96, h / 2); g.fill();
  g.fillStyle = '#1B1F3B'; g.font = font(800, 58); g.textBaseline = 'middle';
  g.fillText('frame ' + countUp(t, RENDER0, RENDER1 - RENDER0, FRAMES), 132, h / 2 + 4);
});
const counterS = sprite(counter.tex, 0.62, 620 / 150); counterS.position.copy(REEL).add(new THREE.Vector3(0, 2.2, 0)); scene.add(counterS);
pop(counterS, RENDER0 - 0.2, { out: T.s4 - 0.1, sfx: null });
ev(RENDER1, 'chime', { pitch: 2 });
burst(scene, RENDER1 + 0.05, REEL.clone().add(new THREE.Vector3(0, 0.8, 0)), { colors: [C.violet, C.coral, C.sun, C.mint] });

// ---------- scene 4: soundtrack ----------
const SPK = P(5.6, -2.3);
const speaker = new THREE.Group(); speaker.position.copy(SPK); speaker.rotation.y = FACE - 0.2; scene.add(speaker);
speaker.add(mesh(RB(1.9, 2.8, 1.5, 0.18), C.navy, { y: 1.4 }));
const cones = [[2.0, 0.62], [0.75, 0.38]].map(([y, r]) => {
  const g = new THREE.Group(); g.position.set(0, y, 0.76);
  g.add(mesh(new THREE.CylinderGeometry(r, r, 0.08, 36), C.violetL, { rx: Math.PI / 2 }));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, 0.14, 24), C.sun, { rx: Math.PI / 2, z: 0.03 }));
  speaker.add(g); return g;
});
pop(speaker, T.s4 + 0.25, { dur: 0.8, pitch: 0 });
const eq = [];
for (let i = 0; i < 9; i++) {
  const b = new THREE.Group(); b.position.copy(P(-3.4 + i * 0.62, 4.3)); scene.add(b);
  const m = mesh(RB(0.42, 1, 0.42, 0.12), [C.violet, C.coral, C.sun, C.mint][i % 4], { y: 0.5 }); b.add(m); eq.push(b);
  pop(b, T.s4 + 0.6 + i * 0.07, { dur: 0.5, sfx: i % 3 === 0 ? 'pop' : null, pitch: i });
}
function note() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.2, 16, 12), C.violet, { x: -0.1 }));
  g.children[0].scale.set(1.25, 0.9, 0.9);
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), C.violet, { x: 0.11, y: 0.37 }));
  g.add(mesh(RB(0.3, 0.1, 0.06, 0.03), C.violet, { x: 0.24, y: 0.7, rz: -0.4 }));
  return g;
}
const notes = [];
for (let i = 0; i < 7; i++) { const n = note(); n.visible = false; scene.add(n); notes.push(n); }
const lufs = pillTex('-14 LUFS · 180+ synced SFX', { icon: '#2EC4A0', fs: 56 });
const lufsS = sprite(lufs.tex, 0.6, lufs.aspect); lufsS.position.copy(SPK).add(new THREE.Vector3(0, 4.0, 0)); scene.add(lufsS);
pop(lufsS, MIX_T, { sfx: 'chaching' });

// ---------- per-frame motion ----------
onFrame(t => {
  screen.update(t);
  counter.update(t);
  // mini-diorama: chips + storyboard float in an arc above it
  chips.forEach((m, i) => { m.position.copy(STAGE_POS).add(new THREE.Vector3(0, 3.2 + Math.sin(t * 2.4 + i) * 0.08, 0)).add(P(-1.2 + i * 0.8, 0)); m.rotation.set(0.25, FACE + Math.sin(t + i) * 0.2, 0); });
  palS.position.copy(STAGE_POS).add(new THREE.Vector3(0, 4.05, 0));
  boards.forEach((b, i) => { b.position.copy(STAGE_POS).add(P(-2.2 + i * 1.45, -2.2, 2.5 + Math.sin(t * 2 + i) * 0.07)); });
  mini.rotation.y = t * 0.15;
  // reel spin (faster while frames arrive)
  reelSpin.rotation.z = -(t * 1.2 + 6 * eIO(seg(t, RENDER0, RENDER1)) * Math.PI * 2);
  film.forEach((f, i) => {
    const t0 = RENDER0 + i * FILM_DT, k = seg(t, t0, t0 + 1.0);
    f.visible = t >= t0 && t < t0 + 1.0;
    if (!f.visible) { return; }
    f.position.copy(filmPath(eIO(k))); f.rotation.set(-0.2, FACE + Math.sin(k * Math.PI) * 0.5, Math.sin(k * 6) * 0.2);
    f.scale.setScalar(Math.min(1, k * 6, (1 - k) * 5 + 0.2));
  });
  counterS.position.y = REEL.y + 2.2 + Math.sin(t * 2.2) * 0.06;
  // speaker pumps on the beat, EQ bounces, notes drift up
  const beatPh = ((t - T.s4) / B.beat) % 1, pump = t > T.s4 ? Math.exp(-beatPh * 6) : 0;
  cones.forEach((c, i) => c.scale.set(1 + pump * (0.18 - i * 0.05), 1 + pump * (0.18 - i * 0.05), 1));
  eq.forEach((b, i) => { if (b.visible) { b.children[0].scale.y = 0.5 + 1.8 * Math.abs(Math.sin(t * 5 + i * 0.9)) * (0.6 + 0.4 * pump); b.children[0].position.y = b.children[0].scale.y / 2; } });
  notes.forEach((n, i) => {
    const t0 = T.s4 + 0.8 + i * 0.6, k = (t - t0) / 2.2;
    n.visible = k > 0 && k < 1 && t < T.out;
    if (!n.visible) { return; }
    n.position.copy(SPK).add(new THREE.Vector3(Math.sin(k * 5 + i) * 0.6, 2.4 + k * 3.6, 0)).add(P(i % 2 ? -0.8 : 0.9, 0.9));
    n.rotation.set(0, FACE, Math.sin(k * 6 + i) * 0.3); n.scale.setScalar(Math.sin(Math.PI * clamp(k * 1.2)) * 1.1);
  });
  lufsS.position.y = SPK.y + 4.0 + Math.sin(t * 2.4) * 0.06;
});
notes.forEach((_, i) => ev(T.s4 + 0.8 + i * 0.6, 'chime', { pitch: i % 3 }));

// ---------- camera ----------
const cam = cameraRig(camera, [
  { s: 0, tgt: [0, -0.4, 1.4], h: [14, 9.4], az: [8, 34], el: [42, 33] },
  { s: T.s1, tgt: [-1.5, -1.3, 2.2], h: [5.4, 5.0], az: [38, 47], el: [31, 30] },
  { s: T.s2, tgt: [3.4, 1.0, 2.6], h: [6.3, 5.9], az: [50, 58], el: [30, 29] },
  { s: T.s3, tgt: [2.2, -1.4, 2.8], h: [6.6, 6.2], az: [44, 36], el: [29, 28] },
  { s: T.s4, tgt: [1.6, 0.4, 2.6], h: [7.0, 6.6], az: [32, 44], el: [30, 30] },
  { s: T.out, tgt: [0, -0.3, 1.4], h: [11, 12.6], az: [44, 66], el: [33, 41] },
], { W, H, dur: DUR });

const cap = captions([
  { s: 0.2, e: T.s1 - 0.15, logo: 'assets/logo.png', t1: 'motion-promo', t2: 'A Claude Code skill · this video was made with it' },
  { s: T.s1 + 0.2, e: T.s2 - 0.2, n: 1, t1: 'Describe your promo', t2: 'One prompt: app, style, scenes, sound' },
  { s: T.s2 + 0.2, e: T.s3 - 0.2, n: 2, t1: 'It builds a 3D diorama', t2: 'Your logo, colours and real UI — toon-shaded, every prop pops' },
  { s: T.s3 + 0.2, e: T.s4 - 0.2, n: 3, t1: 'Renders frame by frame', t2: 'Deterministic Three.js → headless Chromium → ffmpeg' },
  { s: T.s4 + 0.2, e: T.out - 0.2, n: 4, t1: 'Scores the soundtrack', t2: 'Music + SFX synced to every pop, stamp and cut' },
]);
const out = outro([['o-logo', T.out + 0.6], ['o-title', T.out + 0.95], ['o-sub', T.out + 1.15], ['o-tag', T.out + 1.35], ['o-btn', T.out + 1.75], ['o-url', T.out + 2.0]],
  { veil: [T.out + 0.1, T.out + 0.7], cta: 'o-btn', click: T.out + 3.1 });

run(stage, DUR, t => { cam(t); cap(t); out(t); }, { bpm: BPM });
