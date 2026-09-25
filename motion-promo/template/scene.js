// Starter scene — a short working demo. Replace props/timeline with the storyboard.
// Full reference (29s, 4 scenes, terminal, mini diorama, film reel, speaker): ../examples/skill-promo/scene.js
import {
  THREE, P, FACE, createStage, groundDisc, laptop, phone, tree, card, burst, pop, onFrame, ev,
  cameraRig, captions, outro, run, liveCanvas, canvasTex, pillTex, sprite, rrect, check, font, drawContain,
  loadImg, spring, seg, eOut, clamp, beatGrid,
} from './lib.js';

// ---- CONFIG ----
const DUR = 12;                       // seconds
const BPM = 100, B = beatGrid(BPM);   // put cuts on the beat grid: B.at(bar, beat), B.snap(t)
const [W, H] = [1920, 1080];          // 1080x1920 for vertical
const C = { brand: 0x2E1A6E, brand2: 0x5A4BB0, accent: 0xB8002A, hi: 0xF7D417, ok: 0x1FA971, paper: 0xFCFCFE };

const LOGO = await loadImg('assets/logo.png');
const stage = createStage({ W, H });
const { scene, camera } = stage;

// ---- PROPS ----
groundDisc(scene, { t0: 0.05 });

// laptop with a screen redrawn every frame (the "real app UI" goes here: drawImage a screenshot, or draw the UI)
const FIELDS = [['Customer', 'Acme Sdn Bhd'], ['Amount', 'RM 1,250.00'], ['Due date', '30 Oct 2026']];
const F0 = 2.4, FSTEP = 0.8, FTYPE = 0.55;
FIELDS.forEach(([, v], i) => {
  for (let c = 0; c < v.length; c++) { ev(F0 + i * FSTEP + c / v.length * FTYPE, 'type'); }
  ev(F0 + i * FSTEP + FTYPE + 0.05, 'ding', { pitch: i });
});
const screen = liveCanvas(1280, 800, (g, t, w, h) => {
  g.fillStyle = '#F4F3FA'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2E1A6E'; g.fillRect(0, 0, w, 96); drawContain(g, LOGO, 22, 10, 76, 76);
  g.fillStyle = '#fff'; g.font = font(700, 34); g.textBaseline = 'middle'; g.fillText('Your App', 112, 50);
  g.fillStyle = '#2E1A6E'; g.font = font(800, 40); g.textBaseline = 'alphabetic'; g.fillText('New Invoice', 48, 170);
  FIELDS.forEach(([lab, val], i) => {
    const y = 210 + i * 130, t0 = F0 + i * FSTEP, done = t >= t0 + FTYPE + 0.05;
    g.fillStyle = '#6B6785'; g.font = font(600, 24); g.fillText(lab, 48, y + 24);
    rrect(g, 48, y + 36, w - 170, 64, 12, '#fff', done ? '#1FA971' : '#D9D6E8', 3);
    g.fillStyle = '#1E1B33'; g.font = font(500, 30); g.fillText(val.slice(0, Math.floor(val.length * clamp((t - t0) / FTYPE))), 70, y + 80);
    if (done) { g.beginPath(); g.arc(w - 80, y + 68, 24, 0, 7); g.fillStyle = '#1FA971'; g.fill(); check(g, w - 80, y + 68, 26, '#fff', 6); }
  });
});
const lap = laptop({ screenTex: screen.tex }); lap.position.copy(P(-1.2, -1.6)); lap.rotation.y = FACE; lap.scale.setScalar(1.3); scene.add(lap);
pop(lap, 0.5, { dur: 0.8, pitch: 2 });

const phoneTex = canvasTex(400, 760, (g, w, h) => {
  g.fillStyle = '#F4F3FA'; g.fillRect(0, 0, w, h); g.fillStyle = '#2E1A6E'; g.fillRect(0, 0, w, 260);
  drawContain(g, LOGO, w / 2 - 70, 50, 140, 140);
  [['#B8002A', 320], ['#5A4BB0', 470], ['#1FA971', 620]].forEach(([c, y]) => rrect(g, 40, y, w - 80, 110, 22, c));
});
const ph = phone({ screenTex: phoneTex }); ph.position.copy(P(4.2, -4.4)); ph.rotation.y = FACE - 0.35; scene.add(ph);
pop(ph, 0.8, { pitch: 5 });

[[-5.5, -5, 1], [5.8, -2.5, 0.8]].forEach(([u, v, s], i) => { const tr = tree(s); tr.position.copy(P(u, v)); scene.add(tr); pop(tr, 0.9 + i * 0.15, { pitch: 1 + i }); });

// scene 2: "PAID" card pops above the laptop with confetti
const paidTex = canvasTex(620, 240, (g, w, h) => {
  rrect(g, 8, 8, w - 16, h - 16, 60, '#1FA971'); g.beginPath(); g.arc(118, h / 2, 62, 0, 7); g.fillStyle = '#fff'; g.fill(); check(g, 118, h / 2, 74, '#1FA971', 17);
  g.fillStyle = '#fff'; g.font = font(900, 118); g.textBaseline = 'middle'; g.fillText('PAID', 216, h / 2 + 8);
});
const paid = card(paidTex, 2.4, 0.93, { slab: C.ok, depth: 0.22 }); paid.rotation.y = FACE; scene.add(paid);
const PAID_T = 6.6;
pop(paid, PAID_T, { dur: 0.75, sfx: 'stamp' });
ev(PAID_T + 0.05, 'chaching');
const PAID_POS = lap.position.clone().add(new THREE.Vector3(0, 4.6, 0));
burst(scene, PAID_T + 0.05, PAID_POS);

const tag = pillTex('Paid via FPX', { icon: '#1FA971', fs: 60 });
const tagS = sprite(tag.tex, 0.6, tag.aspect); tagS.position.copy(P(2.4, 0.6, 2.2)); scene.add(tagS);
pop(tagS, PAID_T + 0.4, { pitch: 6 });

onFrame(t => {
  screen.update(t);
  paid.position.copy(PAID_POS); paid.position.y += Math.sin(t * 2.4) * 0.08;
  tagS.position.y = 2.2 + Math.sin(t * 2.6) * 0.06;
});

// ---- CAMERA (u, v, y target; ortho half-height; azimuth/elevation degrees). Never fully still. ----
const cam = cameraRig(camera, [
  { s: 0, tgt: [0, -0.6, 1.4], h: [14, 9.6], az: [8, 34], el: [42, 33] },
  { s: B.snap(2.0), tgt: [-0.6, -0.8, 2.3], h: [6.2, 5.8], az: [38, 48], el: [31, 30] },
  { s: B.snap(6.2), tgt: [0, -0.8, 3.0], h: [7.2, 6.8], az: [50, 40], el: [30, 29] },
  { s: B.snap(9.0), tgt: [0, -0.4, 1.4], h: [11, 12.6], az: [40, 62], el: [33, 41] },
], { W, H, dur: DUR, shakes: [[PAID_T, 0.07]] });

// ---- OVERLAYS ----
const cap = captions([
  { s: 0.2, e: 1.9, logo: 'assets/logo.png', t1: 'Your App', t2: 'One-line value proposition' },
  { s: 2.2, e: 6.0, n: 1, t1: 'Create an invoice', t2: 'The form fills itself in seconds' },
  { s: 6.4, e: 8.9, n: 2, t1: 'Get paid instantly', t2: 'FPX payments, auto-reconciled' },
]);
const out = outro([['o-logo', 9.6], ['o-title', 9.9], ['o-sub', 10.05], ['o-tag', 10.25], ['o-btn', 10.55], ['o-url', 10.8]],
  { veil: [9.2, 9.8], cta: 'o-btn', click: 11.4 });

run(stage, DUR, t => { cam(t); cap(t); out(t); }, { bpm: BPM });
