# Vendored: motion-video

- **Upstream:** https://github.com/farhan-syah/motion-video-skill (MIT, © 2026 Farhan Syah — see `LICENSE`)
- **Version:** 1.1.0, commit `1f4d2dc` (2026-09-26)
- **Why vendored:** motion-promo absorbs it as its general-purpose engine (HTML/CSS/SVG scenes, narration/TTS, captions, beat sync, cue audit). Do **not** run `video.mjs update` here — this is not a git clone. Re-vendor with `../scripts/sync-motion-video.sh`.

## Local changes

1. `SKILL.md` → `WORKFLOW.md` (so only motion-promo's `SKILL.md` registers as a skill); `README.md` → `UPSTREAM-README.md`; `CONTRIBUTING.md` dropped. Docs that pointed at `SKILL.md` now point at `WORKFLOW.md`.
2. `patches/0001-normalize-computed-colours-chrome-13x.patch` — `check` crashed (`Cannot read properties of null (reading 'rgb')`) on Chrome 13x+/154, which serializes `color-mix()` computed colours as `oklab(…)`. Colours are now normalized to `rgb()` in-page via a 1px canvas. Worth upstreaming.
