# rc.5 Web speed benchmark

Compares marked, disposable rc.5 hosts without model requests. Never use personal profiles or copy normal host logs into the test root: the test changes style settings in every enabled profile. Logs contain temporary access tokens; do not share or archive them. The script reads only loopback URLs, requires its logs to be inside the marked root, redacts tokens in page/errors and never includes URLs in JSON.

The driver commands an equal elapsed-time-based out-and-back scroll, starting at 500px. For each speed it moves at that speed for 1.5s, returns at that speed for 1.5s, and records rAF intervals and long tasks. Defaults are 200, 800, 3000 and 6000 CSS px/s, with 3 repeats. These speeds are synthetic probes, not validated human scroll-speed categories. A run fails if the host lacks the required range, rather than silently moving a shorter distance. Starting position and traveled pixel distance match; when enabling the plugin alters row spacing, logical rows traversed and layout complexity differ. Old-vs-new plugin with identical style offers a more direct comparison. rAF is a synthetic stress signal, not an input-to-presentation latency or native Desktop FPS measurement.

Sample outputs record scrollable height and target, actual duration, final scroll position, content height, first 20 row heights, row gap and padding; these measurements happen outside the timed scroll. The timed loop records requested positions rather than reading back scrollTop after every write, avoiding potential forced layout introduced by the benchmark itself. Browser long-task entries are only events of at least 50ms, so their absence does not establish a lack of layout or paint cost. A separate browser trace is needed for causal attribution.

Dependencies: a fresh rc.5 CLI, Playwright/Chromium, two packed plugin builds, and the repository's guarded `test/performance-rc5/` fixture. Prepare the following from the repository root (replace paths with local values and choose free ports). Each candidate archive must have a distinct file name. Configuration and host data live entirely in the test root:

```sh
DSH_CLI='/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh'
DPT_PERF_TEST_ROOT='/private/tmp/dpt-speed-repro'
FIXTURE="$PWD/test/performance-rc5/cordis.patch.yml"
BENCH="$PWD/test/performance-rc5/host-speed-benchmark.cjs"
PLAYWRIGHT="$PWD/node_modules/playwright"
BASELINE_TGZ='/path/to/baseline.tgz'
CANDIDATE_TGZ='/path/to/candidate.tgz'
mkdir -p "$DPT_PERF_TEST_ROOT/home-off" "$DPT_PERF_TEST_ROOT/home-baseline" "$DPT_PERF_TEST_ROOT/home-candidate"
touch "$DPT_PERF_TEST_ROOT/.dpt-disposable-test"
for mode in off baseline candidate; do
  DSH_HOME="$DPT_PERF_TEST_ROOT/home-$mode" "$DSH_CLI" --profile web --dump-config > "$DPT_PERF_TEST_ROOT/$mode-config.txt"
done
DSH_HOME="$DPT_PERF_TEST_ROOT/home-baseline" "$DSH_CLI" plugin --profile web add "$BASELINE_TGZ"
DSH_HOME="$DPT_PERF_TEST_ROOT/home-candidate" "$DSH_CLI" plugin --profile web add "$CANDIDATE_TGZ"
DPT_PERF_TEST_ROOT="$DPT_PERF_TEST_ROOT" DSH_HOME="$DPT_PERF_TEST_ROOT/home-off" DPT_ROWS=200 "$DSH_CLI" --profile web --patch "$FIXTURE" --host 127.0.0.1 --port 18811 --no-open > "$DPT_PERF_TEST_ROOT/off.log" 2>&1 &
OFF_PID=$!
DPT_PERF_TEST_ROOT="$DPT_PERF_TEST_ROOT" DSH_HOME="$DPT_PERF_TEST_ROOT/home-baseline" DPT_ROWS=200 "$DSH_CLI" --profile web --patch "$FIXTURE" --host 127.0.0.1 --port 18812 --no-open > "$DPT_PERF_TEST_ROOT/baseline.log" 2>&1 &
BASE_PID=$!
DPT_PERF_TEST_ROOT="$DPT_PERF_TEST_ROOT" DSH_HOME="$DPT_PERF_TEST_ROOT/home-candidate" DPT_ROWS=200 "$DSH_CLI" --profile web --patch "$FIXTURE" --host 127.0.0.1 --port 18813 --no-open > "$DPT_PERF_TEST_ROOT/candidate.log" 2>&1 &
CAND_PID=$!
# Wait for both the loopback address and fixture-ready marker in each log.
DPT_PERF_TEST_ROOT="$DPT_PERF_TEST_ROOT" DSH_PLAYWRIGHT_MODULE="$PLAYWRIGHT" \
DPT_HOST_OFF_LOG="$DPT_PERF_TEST_ROOT/off.log" DPT_HOST_BASELINE_LOG="$DPT_PERF_TEST_ROOT/baseline.log" DPT_HOST_CANDIDATE_LOG="$DPT_PERF_TEST_ROOT/candidate.log" \
DSH_TEST_OUTPUT="$DPT_PERF_TEST_ROOT/results" DPT_REPEATS=3 node "$BENCH"
kill "$OFF_PID" "$BASE_PID" "$CAND_PID"
```

The JSON contains raw frame intervals and long-task durations. Runs alternate source order per style and reverse job order between repeat blocks, reducing but not eliminating drift. Run without parallel browser/CPU benchmarks. Record the exact candidate sources and device/runtime versions externally. There is no real time formatting or score hiding; inspect failures rather than excluding them. Environment variables `DPT_STYLES=classic`, `DPT_SPEEDS=normal:800,stress:6000`, `DPT_REPEATS=1` and `DPT_MODES=off,baseline,candidate` enable a shorter smoke run. `DPT_DURATION_MS` changes the total out-and-back duration; ensure every host has the required range. Results are sanitized JSON at `host-speed-results.json`; profile directories and logs are not evidence files and should not be shared.
