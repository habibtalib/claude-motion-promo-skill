// motion-promo lib — reusable helpers for deterministic 3D isometric diorama promos.
// Everything is a pure function of time t: the renderer calls window.renderAt(t) for every frame.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { THREE };

// ---------- easing / math ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const eIO = k => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const eOut = k => 1 - Math.pow(1 - clamp(k), 3);
export const eIn = k => Math.pow(clamp(k), 3);
/** damped spring 0→1 with ~15% overshoot: the "pop with a bounce" curve */
export const spring = k => k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.exp(-6 * k) * Math.cos(10 * k);
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const lerpAng = (a, b, k) => { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; };
export function makeRng(seed = 7) {
  let s = seed;
  return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let x = Math.imul(s ^ s >>> 15, 1 | s); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}
export const rng = makeRng(7);

/** Beat grid: place cuts/hits on the music grid (audio.py uses the same BPM via META). */
export function beatGrid(bpm = 100) {
  const beat = 60 / bpm, bar = beat * 4;
  return { bpm, beat, bar, at: (barN, beatN = 0) => barN * bar + beatN * beat, snap: t => Math.round(t / beat) * beat };
}
/** Animated number string for canvas/DOM counters: countUp(t, 3.2, 1.0, 1250, { prefix: 'RM ', decimals: 2 }) */
export function countUp(t, t0, dur, to, { from = 0, decimals = 0, prefix = '', suffix = '', locale = 'en-MY' } = {}) {
  const k = 1 - Math.pow(1 - clamp((t - t0) / dur), 4);
  return prefix + (from + (to - from) * k).toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
}
/** wrap each word of an element in <span class="w"> for staggered reveals */
export function splitWords(el, text) {
  el.innerHTML = text.split(' ').map(w => `<span class="w">${w.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>`).join(' ');
  return [...el.querySelectorAll('.w')];
}
/** 3-property staggered word entrance (opacity + rise + scale); exits handled by the container */
export function revealWords(words, t, t0, { per = 0.09, dur = 0.55, rise = 22 } = {}) {
  words.forEach((w, j) => {
    const p = spring((t - t0 - j * per) / dur);
    w.style.opacity = String(clamp(p * 1.6));
    w.style.transform = `translateY(${(1 - p) * rise}px) scale(${0.92 + 0.08 * p})`;
  });
}

// Diorama coordinates: u = screen-right, v = toward camera (at the default 45° orbit). y = up.
export const P = (u, v, y = 0) => new THREE.Vector3((u + v) / Math.SQRT2, y, (v - u) / Math.SQRT2);
/** rotation.y that makes an object's +z face the default camera */
export const FACE = Math.PI / 4;

// ---------- sound events (consumed by audio.py) ----------
export const EVENTS = [];
/** types understood by audio.py: pop swish whoosh card type ding click scan stamp chime sparkle coin chaching celebrate shimmer */
export const ev = (t, type, extra = {}) => EVENTS.push({ t: +t.toFixed(4), type, ...extra });

// ---------- per-frame animation registry ----------
export const anims = [];
export const onFrame = fn => anims.push(fn);

/** Scale-pop obj in at t0 with a bouncy spring; optional shrink-out at `out`. Emits a sound event. */
export function pop(obj, t0, { dur = 0.7, out = null, outDur = 0.35, sfx = 'pop', pitch = null } = {}) {
  const base = obj.scale.clone();
  if (sfx) { ev(t0, sfx, pitch != null ? { pitch } : {}); }
  anims.push(t => {
    let s = t < t0 ? 0 : spring((t - t0) / dur);
    if (out != null && t > out) { s *= 1 - eIn((t - out) / outDur); }
    obj.visible = s > 0.002;
    obj.scale.copy(base).multiplyScalar(Math.max(s, 0.002));
  });
}

// ---------- stage ----------
export function createStage({ W = 1920, H = 1080, lightFrom = [-3, 22, 13] } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0xffffff, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd4d0e6, 1.55));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(...lightFrom);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 70 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5; sun.shadow.blurSamples = 16;
  scene.add(sun, sun.target);
  const stage = document.getElementById('stage');
  stage.style.width = W + 'px'; stage.style.height = H + 'px';
  return { renderer, scene, camera, sun, W, H };
}

// ---------- toon materials & geometry ----------
const gradTex = (() => {
  const t = new THREE.DataTexture(new Uint8Array([168, 168, 168, 255, 218, 218, 218, 255, 255, 255, 255, 255]), 3, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
})();
const matCache = new Map();
/** new toon material (use for anything whose colour you will animate) */
export const M = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradTex, ...o });
/** cached toon material by colour */
export const Mc = color => { if (!matCache.has(color)) { matCache.set(color, M(color)); } return matCache.get(color); };
export const RB = (w, h, d, r = 0.08) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
export function mesh(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true, recv = true } = {}) {
  const m = new THREE.Mesh(geo, typeof mat === 'number' ? Mc(mat) : mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = cast; m.receiveShadow = recv; return m;
}
/** cylinder between two points */
export function rod(a, b, r, col) {
  const d = new THREE.Vector3().subVectors(b, a); const L = d.length();
  const m = mesh(new THREE.CylinderGeometry(r, r, L, 10), col);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}

// ---------- 2D canvas → textures ----------
export const FONT_FAMILY = '"Avenir Next", Avenir, "Helvetica Neue", sans-serif';
export const font = (w, s) => `${w} ${s}px ${FONT_FAMILY}`;
export const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
export function rrect(g, x, y, w, h, r, fill, stroke, lw = 2) {
  g.beginPath(); g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
export function check(g, cx, cy, s, col = '#fff', lw) {
  g.save(); g.strokeStyle = col; g.lineWidth = lw || s * 0.2; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(cx - s * 0.42, cy + s * 0.02); g.lineTo(cx - s * 0.12, cy + s * 0.3); g.lineTo(cx + s * 0.45, cy - s * 0.3); g.stroke(); g.restore();
}
export function drawContain(g, img, x, y, w, h) {
  const a = img.naturalWidth / img.naturalHeight; let dw = w, dh = w / a;
  if (dh > h) { dh = h; dw = h * a; }
  g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
/** a canvas you redraw every frame (e.g. a laptop/phone screen); call .update(t) inside onFrame */
export function liveCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { tex, g, w, h, update: t => { draw(g, t, w, h); tex.needsUpdate = true; } };
}
export const plane = (tex, w, h, extra = {}) => new THREE.Mesh(new THREE.PlaneGeometry(w, h),
  new THREE.MeshBasicMaterial({ map: tex, transparent: true, ...extra }));
/** rounded pill label texture, optional green check icon */
export function pillTex(text, { bg = '#fff', fg = '#1E1B33', icon = null, fs = 64, border = '#E6E2F4' } = {}) {
  const h = Math.round(fs * 1.9), pad = Math.round(fs * 0.7);
  const tmp = document.createElement('canvas').getContext('2d'); tmp.font = font(800, fs);
  const iw = icon ? h * 0.72 + fs * 0.35 : 0;
  const w = Math.ceil(tmp.measureText(text).width + pad * 2 + iw) + 12;
  const tex = canvasTex(w, h + 12, g => {
    rrect(g, 6, 6, w - 12, h, h / 2, bg, border, 5);
    let x = 6 + pad;
    if (icon) {
      const r = h * 0.36; g.beginPath(); g.arc(x + r - fs * 0.25, 6 + h / 2, r, 0, 7); g.fillStyle = icon; g.fill();
      check(g, x + r - fs * 0.25, 6 + h / 2, r * 1.1, '#fff', r * 0.28); x += iw - fs * 0.25;
    }
    g.fillStyle = fg; g.font = font(800, fs); g.textBaseline = 'middle'; g.fillText(text, x, 6 + h / 2 + fs * 0.05);
  });
  return { tex, aspect: w / (h + 12) };
}
/** camera-facing sprite, hgt in world units */
export function sprite(tex, hgt, aspect = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  s.scale.set(hgt * aspect, hgt, 1); s.renderOrder = 5; return s;
}

// ---------- common props ----------
/** grey ground disc with lip + soft drop shadow; pops in at t0 */
export function groundDisc(scene, { radius = 10, top = 0xDEDDE8, side = 0xC4C2D4, lip = 0xC9C3EE, t0 = 0.08 } = {}) {
  const disc = new THREE.Group(); scene.add(disc);
  const dm = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.6, 128), [Mc(side), Mc(top), Mc(side)]);
  dm.position.y = -0.3; dm.receiveShadow = true; disc.add(dm);
  disc.add(mesh(new THREE.TorusGeometry(radius, 0.07, 8, 128), lip, { rx: Math.PI / 2, cast: false }));
  const blob = plane(canvasTex(256, 256, g => {
    const r = g.createRadialGradient(128, 128, 60, 128, 128, 128); r.addColorStop(0, 'rgba(30,27,51,.16)'); r.addColorStop(1, 'rgba(30,27,51,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  }), radius * 3, radius * 3, { depthWrite: false });
  blob.rotation.x = -Math.PI / 2; blob.position.y = -0.64; disc.add(blob);
  pop(disc, t0, { dur: 0.9, pitch: -4 });
  return disc;
}
/** laptop whose screen shows `screenTex` (1.6:1). Origin at base; faces +z. */
export function laptop({ body = 0x4A4E66, keys = 0x1E1B33, screenTex } = {}) {
  const g = new THREE.Group();
  g.add(mesh(RB(3.5, 0.2, 2.35, 0.08), body, { y: 0.1 }));
  g.add(mesh(RB(3.0, 0.03, 1.15, 0.02), keys, { y: 0.21, z: -0.28 }));
  g.add(mesh(RB(0.95, 0.02, 0.5, 0.02), 0x2F3142, { y: 0.21, z: 0.72 }));
  const lid = new THREE.Group(); lid.position.set(0, 0.2, -1.12); lid.rotation.x = -0.2;
  lid.add(mesh(RB(3.5, 2.3, 0.12, 0.08), body, { y: 1.15 }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), new THREE.MeshBasicMaterial({ map: screenTex }));
  scr.position.set(0, 1.17, 0.065); lid.add(scr); g.add(lid);
  return g;
}
/** smartphone on a stand; screen texture 400x760 */
export function phone({ body = 0x1E1B33, stand = 0x5A4BB0, screenTex } = {}) {
  const g = new THREE.Group();
  g.add(mesh(RB(0.9, 0.18, 0.7, 0.06), stand, { y: 0.09 }));
  const b = new THREE.Group(); b.position.set(0, 0.16, 0); b.rotation.x = -0.28;
  b.add(mesh(RB(1.0, 1.9, 0.12, 0.1), body, { y: 0.95 }));
  const s = plane(screenTex, 0.88, 1.7); s.material.transparent = false; s.position.set(0, 0.97, 0.065); b.add(s);
  g.add(b); return g;
}
/** simple rounded tree */
export function tree(s = 1, { leaf = 0x7CC9A2, trunk = 0x9A7A62 } = {}) {
  const g = new THREE.Group(); g.scale.setScalar(s);
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.8, 10), trunk, { y: 0.4 }), mesh(new THREE.SphereGeometry(0.7, 20, 16), leaf, { y: 1.3 }));
  return g;
}
/** a floating 3D card: rounded slab + textured face */
export function card(tex, w, h, { slab = 0xFCFCFE, depth = 0.08 } = {}) {
  const g = new THREE.Group();
  g.add(mesh(RB(w, h, depth, 0.1), slab, { z: -depth / 2 - 0.01 }));
  g.add(plane(tex, w, h));
  return g;
}
/** confetti burst of octahedrons at t0 around `center` */
export function burst(scene, t0, center, { n = 18, colors = [0xF7D417, 0xB8002A, 0x5A4BB0, 0x1FA971], life = 1.1 } = {}) {
  const g = new THREE.Group(); scene.add(g); const parts = [];
  for (let i = 0; i < n; i++) {
    const m = mesh(new THREE.OctahedronGeometry(0.14), colors[i % colors.length], { cast: false });
    const a = rng() * Math.PI * 2, e = (rng() - 0.2) * 1.2;
    m.userData.dir = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) + 0.4, Math.sin(a) * Math.cos(e)).normalize().multiplyScalar(1.6 + rng() * 1.4);
    g.add(m); parts.push(m);
  }
  anims.push(t => {
    const k = (t - t0) / life; g.visible = k > 0 && k < 1;
    if (!g.visible) { return; }
    parts.forEach((m, i) => {
      m.position.copy(center).addScaledVector(m.userData.dir, eOut(k)).add(new THREE.Vector3(0, -1.2 * k * k, 0));
      m.scale.setScalar(Math.max(0.01, Math.sin(Math.PI * clamp(k * 1.3)) * 1.3));
      m.rotation.set(t * 5 + i, t * 3, 0);
    });
  });
  return g;
}
/** quadratic bezier helper → function k∈[0,1] → Vector3 */
export const bezier = (a, q, b) => k => new THREE.Vector3(
  (1 - k) ** 2 * a.x + 2 * (1 - k) * k * q.x + k * k * b.x,
  (1 - k) ** 2 * a.y + 2 * (1 - k) * k * q.y + k * k * b.y,
  (1 - k) ** 2 * a.z + 2 * (1 - k) * k * q.z + k * k * b.z);

// ---------- camera rig ----------
/**
 * shots: [{ s: startSec, tgt: [u, v, y], h: [halfHeightStart, halfHeightEnd], az: [deg, deg], el: [deg, deg] }]
 * Each shot drifts linearly (never fully still); consecutive shots blend over `blend` seconds.
 * A 'whoosh' sound event is emitted at every cut. shakes: [[t, amplitude], ...]
 */
export function cameraRig(camera, shots, { W, H, dur, blend = 1.0, shakes = [] }) {
  shots.forEach((c, i) => { if (i > 0) { ev(c.s, 'whoosh'); } });
  const at = (i, t) => {
    const c = shots[i], e = i + 1 < shots.length ? shots[i + 1].s : dur + 0.5;
    const k = clamp((t - c.s) / (e - c.s), -0.3, 1.3);
    return { tgt: P(...c.tgt), h: lerp(c.h[0], c.h[1], eIO(k) * 0.3 + k * 0.7), az: lerp(c.az[0], c.az[1], k), el: lerp(c.el[0], c.el[1], k) };
  };
  return t => {
    let i = 0; while (i + 1 < shots.length && t >= shots[i + 1].s) { i++; }
    let s = at(i, t);
    if (i > 0 && t < shots[i].s + blend) {
      const a = at(i - 1, t), k = eIO((t - shots[i].s) / blend);
      s = { tgt: a.tgt.clone().lerp(s.tgt, k), h: lerp(a.h, s.h, k), az: lerp(a.az, s.az, k), el: lerp(a.el, s.el, k) };
    }
    let shake = 0; for (const [ts, amp] of shakes) { if (t > ts) { shake += amp * Math.exp(-(t - ts) * 12) * Math.sin((t - ts) * 70); } }
    const az = THREE.MathUtils.degToRad(s.az), el = THREE.MathUtils.degToRad(s.el), R = 60;
    const tgt = s.tgt.clone().add(new THREE.Vector3(0, shake, 0));
    camera.position.set(tgt.x + R * Math.cos(el) * Math.sin(az), tgt.y + R * Math.sin(el), tgt.z + R * Math.cos(el) * Math.cos(az));
    const a = W / H;
    // portrait: keep horizontal extent similar so the diorama still fits
    const hh = a < 1 ? s.h / a * 0.95 : s.h;
    Object.assign(camera, { left: -hh * a, right: hh * a, top: hh, bottom: -hh });
    camera.updateProjectionMatrix(); camera.lookAt(tgt);
  };
}

// ---------- DOM overlays ----------
/** caption cards: [{ s, e, n?, logo?: src, t1, t2 }] rendered in #cap. Emits 'card' sound at each s. */
export function captions(list) {
  list.forEach(c => ev(c.s, 'card'));
  const el = document.getElementById('cap'), num = el.querySelector('.num'), t1 = el.querySelector('.t1'), t2 = el.querySelector('.t2');
  let idx = -1, words = [];
  return t => {
    const i = list.findIndex(c => t >= c.s && t < c.e);
    if (i !== idx) {
      idx = i;
      if (i >= 0) {
        const c = list[i];
        num.className = 'num' + (c.logo ? ' logo' : '');
        num.innerHTML = c.logo ? `<img src="${c.logo}">` : String(c.n ?? '');
        words = splitWords(t1, c.t1); t2.textContent = c.t2 || '';
      }
    }
    if (i >= 0) {
      const c = list[i], k = spring((t - c.s) / 0.65), x = eIn(seg(t, c.e - 0.25, c.e));
      el.style.opacity = String(clamp((t - c.s) * 5) * (1 - x));
      el.style.transform = `translateX(-50%) translateY(${(1 - k) * -60 - x * 40}px) scale(${0.8 + 0.2 * k})`;
      revealWords(words, t, c.s + 0.12);
      const k2 = spring((t - c.s - 0.12 - words.length * 0.09) / 0.5);
      t2.style.opacity = String(clamp(k2 * 1.5)); t2.style.transform = `translateY(${(1 - k2) * 12}px)`;
    } else { el.style.opacity = '0'; }
  };
}
/**
 * outro: veil fades over the diorama, then elements (by id) spring in; optional cursor clicks the CTA.
 * items: [[id, t0], ...]; opts: { veil: [t0, t1], cta: 'o-btn', click: sec }
 */
export function outro(items, { veil = [0, 0], cta = 'o-btn', click = null, words = ['o-tag'] } = {}) {
  ev(items[0][1], 'shimmer'); items.slice(1).forEach(([, t], i) => ev(t, 'pop', { pitch: 4 + i }));
  if (click != null) { ev(click, 'click'); ev(click + 0.05, 'sparkle'); }
  const O = id => document.getElementById(id);
  const split = Object.fromEntries(words.filter(id => O(id)).map(id => [id, splitWords(O(id), O(id).textContent)]));
  return t => {
    O('veil').style.opacity = String(eIO(seg(t, veil[0], veil[1])));
    items.forEach(([id, t0]) => {
      const el = O(id), k = spring((t - t0) / 0.7);
      el.style.opacity = String(clamp((t - t0) * 5));
      let sc = 0.6 + 0.4 * k;
      if (id === cta && click != null) {
        const pk = seg(t, click - 0.08, click + 0.25);
        if (pk > 0 && pk < 1) { sc *= 1 - 0.07 * Math.sin(Math.PI * pk); }
        sc *= 1 + (t > click - 0.55 ? 0.025 * Math.sin((t - click + 0.55) * 6) : 0);
        const ring = el.querySelector('.ring'), rk = seg(t, click, click + 0.8);
        if (ring) { ring.style.opacity = String(rk > 0 && rk < 1 ? 1 - rk : 0); ring.style.transform = `scale(${1 + rk * 0.35}, ${1 + rk * 0.9})`; }
      }
      el.style.transform = `translateY(${(1 - k) * 50}px) scale(${sc})`;
      if (split[id]) { revealWords(split[id], t, t0 + 0.05, { per: 0.08 }); }
    });
    const cur = O('cursor');
    if (cur && click != null) {
      const ck = eIO(seg(t, click - 0.65, click)), b = O(cta).getBoundingClientRect();
      const bx = b.left + b.width * 0.72, by = b.top + b.height * 0.62;
      cur.style.opacity = String(clamp((t - click + 0.75) * 5) * (1 - seg(t, click + 1.05, click + 1.45)));
      const press = t > click - 0.05 && t < click + 0.15 ? 0.85 : 1;
      cur.style.transform = `translate(${lerp(bx + 260, bx, ck)}px, ${lerp(by + 180, by, ck)}px) scale(${press})`;
    }
  };
}

/** wire everything up: fn(t) runs after registered anims; exposes window.renderAt / EVENTS / META (bpm → audio.py) */
export function run({ renderer, scene, camera, W, H }, dur, fn, { bpm = 100 } = {}) {
  window.renderAt = t => { for (const a of anims) { a(t); } fn(t); renderer.render(scene, camera); };
  window.EVENTS = EVENTS.sort((a, b) => a.t - b.t);
  window.META = { W, H, dur, bpm };
  window.renderAt(0);
  window.READY = true;
}
