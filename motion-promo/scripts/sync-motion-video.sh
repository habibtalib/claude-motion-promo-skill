#!/usr/bin/env bash
# Re-vendor motion-video from upstream and re-apply local patches.  usage: scripts/sync-motion-video.sh [ref]
set -euo pipefail
cd "$(dirname "$0")/.."
REF="${1:-main}"; TMP="$(mktemp -d)"
git clone -q https://github.com/farhan-syah/motion-video-skill "$TMP/mv" && git -C "$TMP/mv" checkout -q "$REF"
for p in motion-video/patches/*.patch; do git -C "$TMP/mv" apply "$PWD/$p" || { echo "patch failed: $p (maybe upstreamed? drop it)"; exit 1; }; done
keep="$TMP/keep"; mkdir -p "$keep"; cp -R motion-video/patches motion-video/UPSTREAM.md "$keep/"
rm -rf motion-video && rsync -a --exclude .git --exclude .gitignore --exclude CONTRIBUTING.md "$TMP/mv/" motion-video/
mv motion-video/SKILL.md motion-video/WORKFLOW.md && mv motion-video/README.md motion-video/UPSTREAM-README.md
cp -R "$keep/." motion-video/
sed -i.bak 's/`SKILL.md`/`WORKFLOW.md`/g' motion-video/references/*.md motion-video/WORKFLOW.md && rm -f motion-video/references/*.bak motion-video/WORKFLOW.md.bak
(cd motion-video/scripts && (bun install || npm install))
echo "vendored $(git -C "$TMP/mv" rev-parse --short HEAD) — update UPSTREAM.md (version/commit) and re-check WORKFLOW.md wording"
