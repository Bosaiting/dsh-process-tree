# rc.5 isolated-host performance fixture

The fixture creates completed synthetic local session events only. It never runs an agent, invokes a model, or executes a tool. **Use only fresh, disposable `DSH_HOME` directories**, never the real user profile. Each restart seeds another session; use fresh homes for repeatable session listings. Set `DPT_ROWS` before starting each host (200 in the recorded run). Bind servers only to loopback. Server logs contain ephemeral access tokens; do not share or commit them.

Example setup on macOS, with the current directory this fixture directory and a separately installed rc.5 CLI. Set `PLUGIN_TGZ` and `DSH_PLAYWRIGHT_MODULE` to the actual plugin archive and Playwright module path; choose unused ports. The helper script `host-perf.cjs` uses the full available distance and `host-perf-fixed.cjs` uses an identical 11,000-pixel travel distance (requiring each condition's scrollable range to exceed 11,000px). Both take logs via `DPT_HOST_OFF_LOG`, `DPT_HOST_ON_LOG` and write raw frame intervals and long task durations to `DSH_TEST_OUTPUT`. The scroll target is detected from the rendered DOM and recorded. Disabling animation and selecting the plugin styles happens through the disposable profile UI.

```sh
# Run each command with the chosen executable; shown value is this machine.
DSH_CLI='/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh'
TASK_ROOT='/private/tmp/my-dpt-perf-repro'
mkdir -p "$TASK_ROOT/home-off" "$TASK_ROOT/home-on"
touch "$TASK_ROOT/.dpt-disposable-test"
DSH_HOME="$TASK_ROOT/home-off" "$DSH_CLI" --profile web --dump-config > "$TASK_ROOT/off-config.txt"
DSH_HOME="$TASK_ROOT/home-on" "$DSH_CLI" --profile web --dump-config > "$TASK_ROOT/on-config.txt"
DSH_HOME="$TASK_ROOT/home-on" "$DSH_CLI" plugin --profile web add "$PLUGIN_TGZ"
DPT_PERF_TEST_ROOT="$TASK_ROOT" DSH_HOME="$TASK_ROOT/home-off" DPT_ROWS=200 "$DSH_CLI" --profile web --patch "$PWD/cordis.patch.yml" --host 127.0.0.1 --port 18811 --no-open > "$TASK_ROOT/off.log" 2>&1 &
OFF_PID=$!
DPT_PERF_TEST_ROOT="$TASK_ROOT" DSH_HOME="$TASK_ROOT/home-on" DPT_ROWS=200 "$DSH_CLI" --profile web --patch "$PWD/cordis.patch.yml" --host 127.0.0.1 --port 18812 --no-open > "$TASK_ROOT/on.log" 2>&1 &
ON_PID=$!
# Wait until both logs contain the host URL and fixture-ready marker.
DSH_PLAYWRIGHT_MODULE="$DSH_PLAYWRIGHT_MODULE" DPT_HOST_OFF_LOG="$TASK_ROOT/off.log" DPT_HOST_ON_LOG="$TASK_ROOT/on.log" DSH_TEST_OUTPUT="$TASK_ROOT/results" DPT_REPEATS=3 DPT_FRAMES=90 node "$PWD/host-perf-fixed.cjs"
kill "$OFF_PID" "$ON_PID"
```

The measured instrumented script additionally needs a temporary test-only injected hook into the plugin's copied `client.js`; its timings are inclusive, so do not add `collect` to `readUpdate` or `buildModel` to `computeUpdate`. Any instrumented release build is not identical to the published plugin. Raw archived data in `../../docs/verification/rc5-performance-results.json` have the same instrumentation applied to both candidates.

Environment recorded: macOS 26.4 on arm64, Node v25.5.0 x64, Playwright Chromium 153.0.8010.12 (mac-arm64). 1100×800 viewport, 200 completed calls, animations disabled, 90 requestAnimationFrame ticks with an 11,000px outward-and-return sweep. This is a synthetic headless Chromium Web host, not a native desktop or real session measurement. `requestAnimationFrame` intervals include rendering and the host, not just plugin code. The 11,000px script is a fast stress scenario rather than an ordinary-scroll benchmark.

## Reproducing the stage comparison

The fixed-distance uninstrumented off comparison is recorded in `../../docs/verification/rc5-performance-results.json`; it contains only one sample per condition. The earlier three-repeat all-styles data in that same results file used each condition's full scroll range, which differed between off and on.

Use the isolated on-profile installed plugin's locally installed 0.8.2 source (SHA-256 `edcf55f1a029accd1df5b4024412d3ca4bc4c8f13c79ee59a39b75f4ba7c80a1`) as the input. `candidate16.patch` is an experimental optimization only; it was not selected for release. `instrument-source.cjs` creates the same timing hook and function call counters used in both real-host comparisons. The benchmark script registers the hook on page initialization, wraps the TreeView methods, resets the counters immediately before the scroll, then records inclusive timing and detached DOM nodes. `candidate16.patch` applies exactly to this original source.

```sh
# Set these to the paths for your new disposable on profile and this fixture.
ISOLATED_PLUGIN="$TASK_ROOT/home-on/profiles/web/node_modules/dsh-process-tree"
cp "$ISOLATED_PLUGIN/client.js" "$TASK_ROOT/original.js"
cp "$TASK_ROOT/original.js" "$TASK_ROOT/candidate.js"
patch "$TASK_ROOT/candidate.js" < "$PWD/candidate16.patch"
node "$PWD/instrument-source.cjs" "$TASK_ROOT/original.js" "$TASK_ROOT/original-instrumented.js"
node "$PWD/instrument-source.cjs" "$TASK_ROOT/candidate.js" "$TASK_ROOT/candidate-instrumented.js"
# Replace only this isolated profile's file with a new copy, never the original
# repository or the actual user's profile. Repeat once each for the two sources.
cp "$TASK_ROOT/original-instrumented.js" "$ISOLATED_PLUGIN/client.js.new"
mv "$ISOLATED_PLUGIN/client.js.new" "$ISOLATED_PLUGIN/client.js"
DSH_PLAYWRIGHT_MODULE="$DSH_PLAYWRIGHT_MODULE" DPT_HOST_OFF_LOG="$TASK_ROOT/off.log" DPT_HOST_ON_LOG="$TASK_ROOT/on.log" DSH_TEST_OUTPUT="$TASK_ROOT/phases-original" DPT_REPEATS=3 DPT_FRAMES=90 node "$PWD/host-perf-instrumented.cjs"
cp "$TASK_ROOT/candidate-instrumented.js" "$ISOLATED_PLUGIN/client.js.new"
mv "$ISOLATED_PLUGIN/client.js.new" "$ISOLATED_PLUGIN/client.js"
DSH_PLAYWRIGHT_MODULE="$DSH_PLAYWRIGHT_MODULE" DPT_HOST_OFF_LOG="$TASK_ROOT/off.log" DPT_HOST_ON_LOG="$TASK_ROOT/on.log" DSH_TEST_OUTPUT="$TASK_ROOT/phases-candidate" DPT_REPEATS=3 DPT_FRAMES=90 node "$PWD/host-perf-instrumented.cjs"
```

The recorded run used sequential original and candidate blocks, not alternating paired trials; temporal drift is therefore an additional limitation. The style order rotates across repeats. Temporary test servers served the changed source after each atomic file replacement. The counters record JS duration and calls, not layout, paint or GPU work; retained node counts exclude JS object storage, text-string bytes, and native/browser memory.

## Follow-up trace and speed comparisons

For rc.5 layout/style invalidation traces and the causality probes, see [trace/README-trace.md](trace/README-trace.md). For equal-time, equal-speed baseline/candidate comparisons, see [README-speed.md](README-speed.md). These synthetic Web measurements do not establish native Desktop FPS.

For the botanical-specific selector investigation and optional-mode speed comparison, see [botanical/README.md](botanical/README.md).
