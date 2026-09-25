---
name: motion-promo
description: Use when the user wants a promo / explainer / motion video for an app or product — "make a promo video", "create a motion video for <app>", "video iklan", "buat video promo", "animated product video", "3D isometric promo". Builds a deterministic 3D isometric diorama (Storyset-style toon shading, bouncy pop-ins, orbiting ortho camera, caption cards, real app UI on a laptop screen) with Three.js, renders frame-accurately via headless Chromium → ffmpeg, and synthesizes a synced soundtrack (music + SFX) in numpy. Also use to write a detailed video prompt for claude.ai.
---

# motion-promo

Render a polished 3D-diorama promo MP4 locally (no timeouts, any length). Proven output: 30s 1080p with 183 synced SFX, renders in ~80s on Apple Silicon.

**Pipeline:** `scene.js` (Three.js, pure function of time `renderAt(t)`) → `render.mjs` (Playwright screenshots each frame, pipes PNG → ffmpeg) → `audio.py` (music + SFX from `events.json`, emitted by the scene) → `make.sh` (mux + loudnorm -14 LUFS + contact sheet).

Files (all in this skill dir):
- `template/` — copy this to start. `lib.js` (helpers), `scene.js` (12s working demo), `index.html` (captions/outro DOM + brand CSS tokens), `render.mjs`, `audio.py`, `make.sh`, `package.json`, `assets/logo.png` (placeholder).
- `examples/skill-promo/scene.js` — the 29s promo for this skill itself (terminal typing a prompt, a mini diorama assembling, film frames flying into a spinning reel with a live frame counter, speaker pumping on the beat + EQ bars + floating notes). Uses lib.js — the best starting point for a new scene.

## Workflow

### 1. Gather brand inputs (don't guess)
- **Logo:** find it in the repo (`public/img`, `public/images`, `assets`, `resources`) → copy to `assets/logo.png`.
- **Colours:** sample from the logo, don't invent hex codes:
  ```bash
  python3 -c "from PIL import Image;from collections import Counter;im=Image.open('assets/logo.png').convert('RGBA').resize((120,120));print(Counter('#%02x%02x%02x'%(r//16*16,g//16*16,b//16*16) for r,g,b,a in im.getdata() if a>200 and not(r>230 and g>230 and b>230)).most_common(6))"
  ```
  Also check the repo CSS/tailwind config for brand tokens.
- **Real UI:** screenshot public pages (login/landing) with Playwright; draw inner screens on a `liveCanvas` with fictional data. **Never put real customer/user PII on screen** — invent names, IC/ID numbers, reference nos.
- **Copy:** tagline, CTA text, URL. If there's no official tagline, write one but **flag it to the user as a placeholder**.

### 2. Storyboard (the prompt recipe)
Write/confirm a storyboard before coding. A strong one specifies (this is also the prompt to give claude.ai if the user wants a prompt instead of a render):
- duration + style: "3D isometric diorama in flat illustration style (like Storyset): toon shading, soft shadows, white background, grey ground disc, brand colours only"
- camera: "orthographic, slowly orbits and zooms between scenes, never fully still"; "every object pops in with a bounce"
- props on the disc, each described concretely (laptop showing real app UI, phone, folder, coins…)
- one feature per scene, each with a caption card at the top, and a **physical metaphor** per feature (form types itself, papers fly into a folder, stamp slams, pipeline rises, coins fly along a dotted line…)
- ending: logo, tagline, CTA button (cursor clicks it)
- audio: music mood + specific SFX per action. Voiceover can't be synthesized well offline → ask for a recorded MP3 and mix it in with music ducked.

Typical timing for 30s: intro 2.5s · 4 scenes × ~5.5s · outro 5s. Language of captions = the app's locale.

### 3. Set up (outside the product repo unless asked)
```bash
cp -R ~/.claude/skills/motion-promo/template ~/<app>-promo && cd ~/<app>-promo && npm i
```
Needs `node`, `ffmpeg`, `python3` + `numpy`, Playwright Chromium (`npx playwright install chromium` if missing), PIL for colour sampling. Don't commit promo files into the product repo.

### 4. Build the scene
Edit `scene.js` (config at top: `DUR`, `[W,H]` — `1080,1920` for 9:16), brand tokens in `index.html :root`, outro copy in `index.html #outro`.

Rules that make it look good:
- **Everything is a function of `t`.** No clocks, no `Math.random()` (use `rng()` from lib — seeded). This is what makes frame-accurate rendering and audio sync work.
- Layout in diorama coords `P(u, v, y)`: u = screen-right, v = toward camera; `rotation.y = FACE` faces the camera. Disc radius 10; keep props within ~8.5.
- Every prop: `pop(obj, t0, { out, pitch })` → bounce in + a `pop` sound. Set final scale **before** calling `pop` (it captures base scale).
- Things that float: add a gentle `Math.sin(t*2.x)*0.06` bob. Camera shots always drift (`cameraRig` az/h ranges).
- Emit a sound event for every visible action: `ev(t, 'stamp')`. Types: `pop swish whoosh card type ding click scan stamp chime sparkle coin chaching celebrate shimmer` (`pitch` optional). `cameraRig`/`captions`/`outro` emit their own.
- Caption card covers the top ~16% of frame — frame shots so action sits in the middle/lower 2/3.
- Characters: build from primitives (capsule/cylinder body, sphere head, pivoted limbs). Turn them 3/4 toward camera, not their back. Blink, bob, cheer (arms up) and jump on success moments.
- Text on 3D objects: `canvasTex` → `plane`/`card`; labels → `pillTex` + `sprite`. Numbers that change: `countUp(t, t0, dur, to, {prefix:'RM ', decimals:2})` (right-align to avoid digit jitter).
- **Choreography** (borrowed from Remotion motion-graphics craft): stagger everything (0.1–0.2s between props, ~0.09s between words); entrances animate 2–3 properties (lib's caption/outro words do opacity + rise + scale); exits exist and are ~2x faster than entrances (`pop(..., { out, outDur: 0.3 })`); **holds** — after a hit let the object sit still (only the slow camera drift + gentle bob), constant jitter reads amateur.
- **Rhythm:** something moves in the first 0.5s; a new visual element at least every ~3s; scene = HIT → hold → build → HIT.
- **Beat sync:** set `BPM` in scene.js, use `B = beatGrid(BPM)` and put camera cuts / big hits on `B.snap(t)` or `B.at(bar, beat)`. `run(..., { bpm })` passes it to audio.py so the music grid matches.
- **Texture:** soft vignette is applied by ffmpeg during the full render (`VIGNETTE=0.22`; ≤0.25 on light themes or white turns grey, ~0.4 suits dark). Film grain is opt-in (`GRAIN=3`): it looks nice but temporal noise inflates file size ~5x (30s: 12MB → 60MB) — only for masters, never for web/README. Neither shows in `render.mjs preview` frames — check `preview/check_*.png`. Don't add full-screen DOM overlays: each costs ~150ms/frame in capture.
- Fonts: system "Avenir Next" works on macOS only. On Linux/other machines put a display font (.woff2) in `assets/` and add `@font-face` (render.mjs serves woff2); also update `FONT_FAMILY` in lib.js.
- **No emoji as icons** — they render as full-colour platform glyphs that ignore the palette. Draw icons (the lib `check()` etc.) in brand colours.

### 5. Preview → iterate (cheap)
```bash
node render.mjs preview 1.2,4.5,8,11.6,15.8,18,21.6,24.6,28.4
```
Read `preview/f_*.png`. Check: nothing hidden behind the caption card, character not occluded by props, labels not overlapping, scene centred, disc not too white. Fix and re-preview before a full render.

### 6. Full render + audio + mux
```bash
./make.sh 30 "" <app>-promo      # fps, bpm ("" = use BPM from scene.js), output name
```
Outputs `out/<name>.mp4` and `preview/contact.png` (1 frame / 2.5s). Read the contact sheet. Copy the final to `~/Desktop/`.

### 7. Verify before claiming done
`make.sh` also extracts key frames **from the final mp4** (`preview/check_*.png`, verifies the encode, not just the renderer) — read them.

Pre-delivery checklist:
- [ ] No linear motion anywhere (spring / eIO / eOut only); every progress value clamped (`seg`)
- [ ] Entrances staggered, nothing important pops simultaneously; exits faster than entrances
- [ ] ≥3 holds; new element at least every ~3s; motion in the first 0.5s
- [ ] Caption card never covers the action; nothing touches frame edges (9:16: keep key content in the middle ~75% vertically — platform UI covers top/bottom)
- [ ] Character faces 3/4 to camera and is never hidden behind props at key moments
- [ ] One hero/accent colour dominates each frame; no emoji icons; no real PII on screens
- [ ] SFX on every hit, impacts land slightly early (audio.py `LEAD`), cuts on the beat grid
- [ ] `ffprobe` shows h264 + aac, correct duration/size.
- Loudness ≈ -14 LUFS, peak ≤ -1 dBFS (make.sh prints it). If one SFX dominates the waveform (`ffmpeg -i out/audio.wav -filter_complex showwavespic=s=1600x300 -frames:v 1 preview/wave.png`), lower its gain in `audio.py`.
- Contact sheet shows every scene.
- Tell the user honestly: **audio was checked by meters/waveform, not by ear**; list placeholder copy (tagline/URL) and fictional data.

## When to use a different tool
This skill = **3D isometric diorama** product promos. For **2D kinetic typography, logo stings, editing existing footage, or word-synced captions over speech** (Whisper), use a Remotion-based skill instead (e.g. [`remotion-motion-graphics`](https://github.com/haidrrrry/claude-remotion-skill) — install with `cp -r claude-remotion-skill/remotion-motion-graphics ~/.claude/skills/`). The two can combine: render the diorama here, then drop the MP4 into Remotion as an `<OffthreadVideo>` layer for captions/VO.

## Gotchas (learned)
- three r180+: `PCFSoftShadowMap` removed → use `PCFShadowMap` + `shadow.radius`.
- `RoundedBoxGeometry` radius must be < half of every dimension (lib's `RB` clamps).
- Toon + bright hemisphere light washes out a white disc → keep disc ~`#DEDDE8`, hemi ≈1.55.
- A flat open book reads as a sliver from the iso angle → thick cream pages + page lines.
- Stamp/thud SFX peaks dominate normalisation → keep impact gains ≈0.5 and loudnorm at the end.
- Re-render check: make sure you're reading the fresh `preview/` files (timestamps) — stale frames look like "the fix didn't work".
- Portrait: `cameraRig` auto-widens; still re-frame shots for 9:16 and re-preview.
- claude.ai web sandbox times out on long renders — this local pipeline has no limit; tell users to render via Claude Code for long/complex videos.
- Playwright page must be served over HTTP (import maps + ES modules fail on `file://`) — render.mjs has a built-in static server.
