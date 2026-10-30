# rc.5 host scrolling trace and causality probes

Measured locally using the existing `test/performance-rc5` 200-call synthetic fixture, macOS arm64 26.4, translated Node 25.5.0 and mac-arm64 Chromium 153.0.8010.12. The local baseline `client.js` SHA-256 is `158386a4843ce7f54387db96bdd089af57f5227805b2aed303b16c2b8e9eae7c`. This is not a native Desktop or real-model benchmark. Run browsers without other benchmarks competing for CPU, and record the browser version and platform when repeating.

`trace.cjs` records a scroll trace plus raw frame intervals, inclusive main-thread event totals, maximum layout events, and CDP Performance metrics. `ablation.cjs` runs the same trace with temporary interventions. Its `disabled-by-default-devtools.timeline.invalidationTracking` category materially increases overhead: compare its results only to equally instrumented controls. Trace events nest; `Layout`, `UpdateLayoutTree`, `TaskDuration`, `RecalcStyleDuration` and `ScriptDuration` must not be added together. Under these runs CDP attributes most of the cost included in timeline `Layout` to `RecalcStyleDuration`.

**Privacy:** trace JSON and the verbose `parse-invalidations.cjs` output can include local URLs, tokens, script names or local paths. Keep them in the disposable directory only. The shareable `trace-evidence-sanitized.json` contains aggregate counts, selector texts, stack function names and frame intervals, and excludes URLs and token values; inspect it before publishing. The `trace.cjs` and `ablation.cjs` scripts require a marked disposable root and logs inside it. The fixture refuses the normal DSH profile.

## Prepare fresh local hosts

Use the parent fixture's README and `test/performance-rc5/cordis.patch.yml`. Run each command in a shell, adjusting paths and choosing unused loopback ports; keep logs and the access tokens private. The baseline package must be packed separately and installed only into the temporary `home-on` profile. Each host restart adds a synthetic session, so a fresh root is preferable.

```sh
ROOT=/private/tmp/dpt-trace-repro
CLI='/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh'
PROJECT=/path/to/dsh-process-tree
TRACE_DIR=/path/to/trace-scripts
PLUGIN_TGZ=/path/to/dsh-process-tree-0.8.2.tgz
PLAYWRIGHT="$PROJECT/node_modules/playwright"
mkdir -p "$ROOT/home-off" "$ROOT/home-on"
touch "$ROOT/.dpt-disposable-test"
DSH_HOME="$ROOT/home-off" "$CLI" --profile web --dump-config > "$ROOT/off-config.txt"
DSH_HOME="$ROOT/home-on" "$CLI" --profile web --dump-config > "$ROOT/on-config.txt"
DSH_HOME="$ROOT/home-on" "$CLI" plugin --profile web add "$PLUGIN_TGZ"
DPT_PERF_TEST_ROOT="$ROOT" DSH_HOME="$ROOT/home-off" DPT_ROWS=200 "$CLI" --profile web --patch "$PROJECT/test/performance-rc5/cordis.patch.yml" --host 127.0.0.1 --port 18822 --no-open > "$ROOT/off.log" 2>&1 &
OFF_PID=$!
DPT_PERF_TEST_ROOT="$ROOT" DSH_HOME="$ROOT/home-on" DPT_ROWS=200 "$CLI" --profile web --patch "$PROJECT/test/performance-rc5/cordis.patch.yml" --host 127.0.0.1 --port 18823 --no-open > "$ROOT/on.log" 2>&1 &
ON_PID=$!
export DPT_PERF_TEST_ROOT="$ROOT" DSH_PLAYWRIGHT_MODULE="$PLAYWRIGHT"
export DPT_HOST_OFF_LOG="$ROOT/off.log" DPT_HOST_ON_LOG="$ROOT/on.log"
# After both host logs show ready:
DSH_TEST_OUTPUT="$ROOT/results" DPT_REGIME=normal DPT_REPEATS=3 DPT_FRAMES=240 node "$TRACE_DIR/trace.cjs"
DSH_TEST_OUTPUT="$ROOT/results" DPT_REGIME=stress DPT_REPEATS=3 DPT_FRAMES=90 node "$TRACE_DIR/trace.cjs"
# Always terminate both temporary hosts after the test:
kill "$OFF_PID" "$ON_PID"
```

Normal = a 2,000px outward/return sweep over 240 animation-frame callbacks; stress = 11,000px over 90 callbacks. Three repeats rotate off, classic, quiet and botanical order. The script disables animations in the test UI. The scroll target, actual range, frame intervals, page errors, and trace summaries are recorded. Chromium trace is diagnostic instrumentation, not an unbiased FPS measurement.

## Ablations

Run each in fresh profiles using the same setup and `DPT_STYLES=quiet DPT_REGIME=stress DPT_FRAMES=90 DPT_REPEATS=1`. The paired `DPT_ABLATION=none` condition also needs to be run. Set `DPT_ABLATION` to one of:

- `hide-svg`: hide the tree with CSS visibility while retaining SVG updates. This changes visual output.
- `no-host-css`: delete plugin rules containing `.dpt-host` for this page. This changes host row layout.
- `freeze-hook`: freeze `TreeView.applySvgSize` after the first call, intentionally making the overlay stale. It requires a test-only copy of the installed isolated `client.js` modified so the existing test hook exposes `TreeView`; do not modify the normal profile or store. This does not suppress element insertion/removal.
- `no-host-has`: delete the rc.5 host stylesheet rules containing `:has(` and `conversation.chat.node`. The script records the selectors and count. This can alter host display, spacing and empty-row handling and must not be used as a fix.
- `freeze-svg-children`: block insertion and removal within the tree SVG. It records the number of blocked operations. This leaves old nodes onscreen and prevents the tree from updating: it is a diagnostic intervention, not a candidate fix.

For `freeze-hook`, atomically replace the file inside the disposable on profile with a copied test-hook build (never edit the package store's linked file directly):

```sh
ISOLATED="$ROOT/home-on/profiles/web/node_modules/dsh-process-tree/client.js"
python3 - "$ISOLATED" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text()
needle='      DEFAULTS, STYLE_PRESETS, ELBOW_RADIUS, normalize, elbowCurve, dotRadius, railX, topBranchStartY,'
assert s.count(needle)==1
s=s.replace(needle,'      TreeView, DEFAULTS, STYLE_PRESETS, ELBOW_RADIUS, normalize, elbowCurve, dotRadius, railX, topBranchStartY,')
t=p.with_name('client.js.instrumented');t.write_text(s);t.replace(p)
PY
```

The recorded baseline and causality data came from sequential runs, not a randomized causal experiment. In the recorded quiet stress run `none` had 87/89 intervals over 25 ms. Deleting five host `:has()` rules yielded 0/89; blocking 206 SVG child changes yielded 0/89. These are each one sample with tracing enabled, and each changes interface behavior. Together with the matching invalidation stacks they support a host-style invalidation mechanism; validate any real fix separately with visual and compatibility tests.

After a run, `node "$TRACE_DIR/parse-invalidations.cjs" "$ROOT/results/trace-none-stress-quiet-0.json" "$ROOT/results/invalidation-summary.json"` streams the potentially large trace and records invalidation counts, selectors and stacks. That verbose summary may contain URLs; do not publish it directly.
