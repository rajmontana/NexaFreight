#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# NexaFreight patch preflight
#
# Run from inside your NexaFreight clone:
#
#     bash /path/to/patches/preflight.sh /path/to/patches
#
# Read-only. Touches nothing, commits nothing, applies nothing.
# ---------------------------------------------------------------------------

set -uo pipefail

PATCHDIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
BASE=87d7eaba96fba5e80010ddb20e3f4a591081ce93
SHORT=87d7eab

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32mOK\033[0m    %s\n' "$*"; }
warn() { printf '  \033[33mWARN\033[0m  %s\n' "$*"; }
bad()  { printf '  \033[31mBLOCK\033[0m %s\n' "$*"; }

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  bad "not inside a git repository — cd into your NexaFreight clone first"
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

bold "── repo ──────────────────────────────────────────────"
echo "  root    : $REPO_ROOT"
echo "  branch  : $(git rev-parse --abbrev-ref HEAD)"
echo "  HEAD    : $(git log --oneline -1)"

bold "── 1. is my base commit present? ─────────────────────"
if git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  ok "$SHORT exists locally"
  if [ "$(git rev-parse HEAD)" = "$BASE" ]; then
    ok "HEAD is exactly $SHORT — patches apply as authored"
  elif git merge-base --is-ancestor "$BASE" HEAD 2>/dev/null; then
    AHEAD=$(git rev-list --count "${BASE}..HEAD")
    warn "HEAD is $AHEAD commit(s) AHEAD of $SHORT"
    echo "        your extra commits:"
    git log --oneline "${BASE}..HEAD" | sed 's/^/          /'
    echo "        -> use 'git am -3' so git can three-way merge"
  else
    warn "HEAD has DIVERGED from $SHORT (not a descendant)"
    echo "        merge-base: $(git merge-base "$BASE" HEAD 2>/dev/null | cut -c1-7)"
    echo "        -> use 'git am -3', expect possible conflicts"
  fi
else
  bad "$SHORT not found locally — run: git fetch origin frontend-rebuild"
fi

bold "── 2. working tree clean? ────────────────────────────"
DIRTY=$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ')
if [ "$DIRTY" = "0" ]; then
  ok "no uncommitted changes to tracked files"
else
  bad "$DIRTY tracked file(s) modified — git am will refuse to start"
  git status --short --untracked-files=no | sed 's/^/          /'
  echo "        -> commit them, or: git stash push -u"
fi

if [ -d .git/rebase-apply ] || [ -d .git/rebase-merge ]; then
  bad "an am/rebase is already in progress — run: git am --abort"
fi

bold "── 3. do the files I edited still match their base? ──"
# If these blobs match 87d7eab, the patches apply regardless of other commits.
for f in \
  frontend/src/components/GlobeMap.tsx \
  frontend/src/components/ShipmentInspectorPanel.tsx \
  frontend/src/app/page.tsx \
  frontend/src/app/globals.css \
  frontend/next.config.ts
do
  if ! git cat-file -e "${BASE}:${f}" 2>/dev/null; then
    warn "$f — not present at $SHORT (unexpected)"
    continue
  fi
  WANT=$(git rev-parse "${BASE}:${f}")
  if [ ! -f "$f" ]; then
    bad "$f — MISSING from your working tree"
    continue
  fi
  HAVE=$(git hash-object "$f")
  if [ "$WANT" = "$HAVE" ]; then
    ok "$f"
  else
    warn "$f — differs from $SHORT (patch may need -3 or manual merge)"
  fi
done

bold "── 4. would the new files collide? ───────────────────"
COLLIDE=0
for f in \
  frontend/.env.local.example \
  frontend/src/components/KpiBand.tsx \
  frontend/src/components/DossierHeaderCards.tsx \
  frontend/src/components/CopilotVerdictCard.tsx \
  frontend/src/components/dossier.test.ts \
  frontend/src/hooks/useFleetKpis.ts \
  frontend/src/lib/format/inr.ts \
  frontend/src/lib/format/inr.test.ts \
  frontend/src/lib/analytics/kpi.ts \
  frontend/src/lib/analytics/kpi.test.ts \
  frontend/src/lib/map/freightMarkers.ts \
  frontend/src/lib/map/waybill.ts \
  frontend/src/lib/map/waybill.test.ts
do
  if [ -e "$f" ]; then bad "$f already exists — patch 'creates' it and will fail"; COLLIDE=1; fi
done
[ "$COLLIDE" = "0" ] && ok "all 13 new files are free"

bold "── 5. dry-run every patch ────────────────────────────"
shopt -s nullglob
PATCHES=("$PATCHDIR"/0*.patch)
if [ ${#PATCHES[@]} -eq 0 ]; then
  bad "no 0*.patch files found in: $PATCHDIR"
else
  FAIL=0
  for p in "${PATCHES[@]}"; do
    if git apply --check --whitespace=nowarn "$p" 2>/dev/null; then
      ok "$(basename "$p")"
    else
      FAIL=1
      warn "$(basename "$p") — strict apply fails; trying three-way…"
      if git apply --check --3way --whitespace=nowarn "$p" 2>/dev/null; then
        echo "          three-way WOULD work -> use: git am -3"
      else
        bad "  three-way also fails — send me the output of:"
        echo "          git apply --check --3way $(basename "$p")"
      fi
    fi
  done
  # Note: patches are cumulative; later ones can only be checked in sequence.
  [ "$FAIL" = "0" ] && echo "        (note: checked independently; 0002+ build on 0001,"
  [ "$FAIL" = "0" ] && echo "         so a lone failure here may just be ordering)"
fi

bold "── 6. toolchain ──────────────────────────────────────"
echo "  node    : $(node --version 2>/dev/null || echo 'NOT FOUND')"
echo "  npm     : $(npm --version 2>/dev/null || echo 'NOT FOUND')"
echo "  docker  : $(docker --version 2>/dev/null | head -1 || echo 'not found (needed for the db)')"
echo "  python  : $(python3 --version 2>/dev/null || echo 'NOT FOUND')"
if [ -f frontend/.env.local ]; then
  warn "frontend/.env.local exists — patch 0005 adds .env.local.example, yours is untouched"
  if grep -q NEXT_PUBLIC_USD_INR frontend/.env.local 2>/dev/null; then
    echo "        NEXT_PUBLIC_USD_INR = $(grep NEXT_PUBLIC_USD_INR frontend/.env.local | cut -d= -f2)"
  else
    echo "        -> no NEXT_PUBLIC_USD_INR set; will default to 95.8"
  fi
else
  echo "  .env.local : absent (cp frontend/.env.local.example frontend/.env.local)"
fi

bold "──────────────────────────────────────────────────────"
echo "Paste this whole output back and I'll tell you exactly how to proceed."
