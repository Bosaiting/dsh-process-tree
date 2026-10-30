# Botanical diagnostic ablations in rc.5

The six single samples were recorded on macOS 26.4 using headless Chromium 153.0.8010.12 and the isolated rc.5 Web host with 200 completed synthetic calls. The plugin source SHA-256 was `710b00411c67b5c1a6e5e9e6744acbbb1064e5199712201adb60b3e5b54f4afa`. No model was used. The script scrolls a maximum of 11,000 CSS pixels outward and back over 90 requestAnimationFrame callbacks. This fixed-frame pressure scenario differs from the elapsed-time speed benchmark and is not native Desktop performance.

All six comparisons use the extra Chromium invalidation-tracing category, which has substantial overhead. The `none` sample is the similarly instrumented control. Timeline and CDP metric durations can be nested/overlap and cannot be summed. Each ablation has exactly one sample. `hide-crown` changes only visibility of floating/portal crown artwork; `hide-all-art` hides the SVG tree and crown. `no-plugin-has` removes both plugin :has rules, changing theme styling. `no-host-has` removes five rc.5 host :has rules, changing layout and display. `freeze-svg-children` blocks insertion and removal inside the SVG tree; the tree no longer represents the scroll. Each one changes visual or structural behavior and is diagnostic only.

The baseline had 79 of 89 intervals over 25ms; crown hidden 78, all art hidden 76, plugin :has removed 79, host :has removed 1, and SVG child changes blocked 0. The two last changes support the previously observed host style invalidation mechanism, not a production solution. Detailed counts, raw frame intervals, CSS selector texts and CDP summaries are in `botanical-evidence-sanitized.json`.

To reproduce, follow the `test/performance-rc5/trace/README-trace.md` isolated host setup. Set `DPT_PERF_TEST_ROOT` to a marked disposable root, `DSH_PLAYWRIGHT_MODULE` to the project's Playwright package, `DPT_HOST_OFF_LOG` and `DPT_HOST_ON_LOG` to loopback host logs within that root, `DPT_STYLES=botanical`, `DPT_REGIME=stress`, `DPT_REPEATS=1`, `DPT_FRAMES=90`, and `DPT_ABLATION` to each value above (`none` for control). Set a different `DSH_TEST_OUTPUT` per case and execute `node botanical-ablation.cjs` in a separate process for each sample. The script writes raw traces that can contain access tokens or local URLs: keep them private and discard them safely only as appropriate, never publish them. The sanitized evidence file omits traces, addresses and tokens.

## Opt-in elapsed-time comparison

`host-speed-optin.cjs` uses the project's guarded 200-call fixture and three fresh, marked isolated profiles: baseline, candidate with the option disabled, and candidate with it enabled. Use rc.5, install each source as a packed plugin in its own profile and start each on a loopback port using `test/performance-rc5/cordis.patch.yml`. Configure `DPT_PERF_TEST_ROOT` as the marked common root; the three log paths must be inside it. Set `DSH_PLAYWRIGHT_MODULE` to the project Playwright module and run:

```sh
DPT_MODES=baseline,disabled,enabled DPT_STYLES=botanical \
DPT_SPEEDS=normal:800,stress:6000 DPT_REPEATS=3 DPT_DURATION_MS=3000 \
DPT_HOST_BASELINE_LOG="$DPT_PERF_TEST_ROOT/baseline.log" \
DPT_HOST_DISABLED_LOG="$DPT_PERF_TEST_ROOT/disabled.log" \
DPT_HOST_ENABLED_LOG="$DPT_PERF_TEST_ROOT/enabled.log" \
DSH_TEST_OUTPUT="$DPT_PERF_TEST_ROOT/results" node host-speed-optin.cjs
```

The script confirms the requested settings switch, counts matching dots through the open shadow root, and records content height, actual final position and raw animation-frame intervals. Stop all temporary hosts afterwards. `docs/verification/rc5-botanical-performance.json` retains the final controlled sample, the earlier sample potentially overlapped by host startup, and the rejected pool experiments. The earlier `shadow-prototype.patch` is a diagnostic artifact for the baseline source SHA noted above, not a fix; it preserves the original 6 px height discrepancy for diagnosis. Never commit raw browser traces or host logs.
