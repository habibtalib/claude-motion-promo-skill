// Frame-accurate renderer: drives window.renderAt(t) in headless Chromium and pipes PNG frames to ffmpeg.
// usage:  node render.mjs preview 1,4.5,10     → preview/f_<t>.png (fast visual check)
//         node render.mjs full [fps]           → out/video_noaudio.mp4 (+ events.json for audio.py)
//         GRAIN=0 VIGNETTE=0 node render.mjs full   → no texture pass
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d);
  });
}).listen(0);
const port = srv.address().port;
const [mode = 'preview', arg = '1'] = process.argv.slice(2);

const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
// open once to read META (size/duration), then size the viewport to match
let page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const hook = p => {
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { console.log('[page]', m.text()); } });
  p.on('pageerror', e => console.log('[pageerror]', e.message));
};
hook(page);
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
const meta = await page.evaluate(() => window.META);
if (meta.W !== 1920 || meta.H !== 1080) {
  await page.close();
  page = await browser.newPage({ viewport: { width: meta.W, height: meta.H } }); hook(page);
  await page.goto(`http://localhost:${port}/index.html`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
}
const events = await page.evaluate(() => window.EVENTS);
fs.writeFileSync(path.join(ROOT, 'events.json'), JSON.stringify({ meta, events }));
for (const d of ['preview', 'out']) { fs.mkdirSync(path.join(ROOT, d), { recursive: true }); }

const renderAt = t => page.evaluate(t => window.renderAt(t), t);
if (mode === 'preview') {
  for (const t of arg.split(',').map(Number)) {
    await renderAt(t);
    await page.screenshot({ path: path.join(ROOT, 'preview', `f_${t.toFixed(2)}.png`) });
    console.log('preview', t);
  }
} else {
  const FPS = Number(process.argv[3] || 30), N = Math.round(FPS * meta.dur);
  // texture pass in ffmpeg (free; a DOM overlay costs ~150ms/frame): temporal film grain + soft vignette.
  // GRAIN=0 / VIGNETTE=0 disables. Previews don't show it — check preview/check_*.png from make.sh.
  const GRAIN = Number(process.env.GRAIN ?? 0), VIG = Number(process.env.VIGNETTE ?? 0.22);
  const vf = [GRAIN > 0 && `noise=alls=${GRAIN}:allf=t`, VIG > 0 && `vignette=angle=${VIG}`].filter(Boolean);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    ...(vf.length ? ['-vf', vf.join(',')] : []), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(ROOT, 'out', 'video_noaudio.mp4')],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    await renderAt(i / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) { await new Promise(r => ff.stdin.once('drain', r)); }
    if (i % 60 === 0) { console.log(`frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`rendered ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
srv.close();
