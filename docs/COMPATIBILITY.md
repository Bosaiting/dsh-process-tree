# Compatibility / 兼容性

Version 0.8.2 declares DSH 0.2.1-rc.2 and 0.2.1-rc.5; other releases are not declared compatible. Earlier npm 0.8.0 and GitHub 0.8.1 packages declare only rc.2.

## Local audit fixes / 本地审查修复（2026-10-31）

The local candidate preserves recorded argument text, falls back for lossy object-style formatting and ambiguous native file actions, reports host-only failure indications separately, and warns if settings storage fails. Its client SHA-256 is `1936e17281677e9f8a282422db3bf412c4829e923d3308423337e18d8fe6ca88`. On macOS, 54 unit tests and 46 synthetic Chromium browser cases passed. A separate rc.5 Web host with the locally customized Claude Style 0.19.6 runtime passed 23 synthetic function checks; a clean rc.5 Web host passed six synthetic streaming checks. No model or tool ran. A Windows-style path was exercised only in a synthetic browser fixture, not on Windows Desktop.

In one 220-call synthetic fixture, a status-only update read seven row rectangles, compared with 227 on the previously installed runtime; both retained the status marker. This is a targeted operation count, not a native Desktop latency or FPS result. The adaptive conversion batch still cannot guarantee a maximum frame duration for a single expensive row. Native Desktop sustained generation and performance, Windows/Linux, and other themes remain unverified.

## Unreleased Go task-function display / Go 任务函数展示

Go summaries show primitive positional values in recorded order, with `nil` for recorded null and raw named arguments available separately. Multi-line calls use trailing commas. Composite or incomplete arguments, unsafe strings, and unsuitable tool names retain the native summary. Separate visual blocks group recorded child calls; they do not establish an actual Go signature or execution order. Python remains the default and existing language preferences are preserved.

On macOS arm64, 51 unit and 40 Chromium fixture cases passed, with an additional settings persistence check; 1,920 Python/JavaScript/C/C++/Java formatter comparisons matched the previously installed runtime. An isolated rc.5 Web host using the locally customized Claude Style theme passed 23 compatibility checks and a focused native-fallback check. Synthetic records were used without running a model or tool. Client SHA-256: `8ac15b20850921409cb354102d8a630d75a6ff0239aaf5bc01d9615159169964`. Native Desktop behavior, Go compilation, sustained live generation and other platforms were not verified.

Sequential headless Chromium samples with 1,000 synthetic calls took 750 ms for initial Go conversion, 701 ms for Go to Python, and 702 ms for Python to Go. These are single samples including fixture scanning, not native Desktop performance measurements.

## Unreleased Java positional display / Java 位置参数展示

Java task-function summaries show primitive values in recorded order, without assuming a real method signature. The raw recorded arguments remain available from a separate disclosure; very long disclosures use the existing display limit and direct users to native details. Composite or incomplete arguments and names unsuitable as Java identifiers retain the native summary. Python, JavaScript, C and C++ display settings are preserved.

On macOS arm64, 50 unit and 39 Chromium fixture cases passed, and 960 Python/JavaScript/C/C++ formatter comparisons matched the previously installed runtime. An isolated rc.5 Web host passed the 22-check function compatibility sequence and focused native-fallback checks with both a clean profile and the user's locally customized Claude Style theme. The expanded-code font regression passed four checks in the clean profile. Fixtures used synthetic records; no model or tool was run. Client SHA-256: `51131387f5369e830e0d78895fb14fe4f39e485affdc72239471e1283ba5e843`. Native Desktop behavior and sustained live generation were not verified.

Sequential headless Chromium samples with 1,000 synthetic calls took 756 ms for initial Java conversion, 702 ms to switch Java to Python, and 702 ms to switch Python to Java. These single samples include fixture scanning and do not establish native Desktop performance.

## Unreleased expanded tool-code font / 展开的工具代码字号

In task-function view, only the native code text inside a tool call is sized to match the function summary. Syntax highlighting and native copy and wrap controls are retained; unrelated code blocks and other layouts are not targeted.

On macOS arm64, an isolated rc.5 Web host using the user's locally customized Claude Style 0.19.3 reproduced the mismatch with the previous runtime (13px summary versus 15px code). The updated runtime passed four focused checks both with that theme and in a clean no-theme profile: matching size in light/dark media modes, following a changed 17px summary size, preserved token colours/copy/wrap, and native folding plus an unrelated code block. A first themed folding check sampled before its transition finished; waiting for the native hidden state corrected the test. All records were synthetic; no model or tool was run. Client SHA-256: `6a400b02d6d55c386e66cf9f17fb4f0cb7e2180fd8cf18821231d5f950864bb8`. Native Desktop runtime and other desktop platforms were not verified by these tests.

## Unreleased Java task-function display / Java 任务函数展示

The preceding Java candidate added `.java` virtual tabs and visible recorded `name = value` labels. That presentation has since been replaced by the positional view. Its equals signs were read-only presentation, not Java named arguments or assignments; JSON values and null were not assigned invented types. Python, JavaScript, C and C++ preferences remained intact.

On macOS arm64, 50 unit cases and 38 Chromium fixture cases passed; 960 Python/JavaScript/C/C++ formatter comparisons matched the previously installed runtime. A clean isolated rc.5 Web host with synthetic Session/PTC records passed 22 checks, including Java preview, nesting, folding, failure navigation, file actions and persisted language after reload. A first host attempt completed the Java interaction checks but hung before finishing the final fold/reload check and was interrupted; a subsequent run passed the full sequence after bounding and instrumenting the test. No model or tool was run. Client SHA-256: `0f496e5aece4fe1ee780d5b892ab7ed96c3992508dfaa236cda92750d5354164`. Native Desktop runtime, sustained live generation and Windows/Linux Desktop were not validated by these checks.

In sequential headless Chromium samples with 1,000 synthetic calls, initial Java conversion took 749 ms, switching Java to C++ took 699 ms, and switching Python to Java took 720 ms. These are single samples and include per-frame fixture scanning; they are not native Desktop frame rates or performance guarantees.

## Unreleased C++ task-function display / C++ 任务函数展示

The current source adds C++ to the function layout, sharing C-style arguments and scope rendering with separate C++ keyword validation, a `.cpp` tab and `void task_01()` heading. Composite values and null remain labelled records; nesting is illustrative, not executable C++. Python, JavaScript and C language preferences remain intact.

On macOS arm64, 49 unit cases and 38 Chromium fixture cases passed; 720 Python/JavaScript/C formatter comparisons matched the previously installed runtime. A clean isolated rc.5 Web host with synthetic Session/PTC records passed 21 checks, including C++ preview, nesting, folding, failure navigation, file actions and persisted language after reload. No model or tool was run. Client SHA-256: `3e587ee31758c4cce0ae4d56a5057445016c43d34f2cce2a94a890da8294357e`. Native Desktop runtime, sustained live generation and Windows/Linux Desktop were not validated by these checks.

In sequential headless Chromium samples with 1,000 synthetic calls, initial C++ conversion took 739 ms, switching C++ to C took 697 ms, and switching C to C++ took 703 ms. These are single samples and include per-frame fixture scanning; they are not native Desktop frame rates or performance guarantees.

## Unreleased C task-function display / C 任务函数展示

The current source adds C to the function layout while preserving Python and JavaScript selections. C parameter names are comments, composite values are labelled JSON, and null is explicitly labelled without guessing a pointer type. Scope braces show recorded nesting; this is not executable C. The standalone trailing-braces layout remains independent.

On macOS arm64, 48 unit cases and 38 Chromium fixture cases passed; 480 Python/JavaScript formatter comparisons matched the previously installed runtime. A clean isolated rc.5 Web host with synthetic Session/PTC records passed 20 checks, including C preview, nesting, folding, failure navigation, file actions and saved language after reload. The first two host attempts exposed test assumptions about an ambiguous close button and narrow-layout line wrapping; the corrected checks passed without a runtime change. No model or tool was run. Client SHA-256: `955362aba60a0793cdc9e9953bc57ce4d6947aa2903bb8f68e328aceb392fe7d`. These checks do not establish native Desktop runtime behavior, sustained live generation, or Windows/Linux Desktop support.

In sequential headless Chromium samples with 1,000 synthetic calls, initial C conversion took 771 ms, switching C to JavaScript took 699 ms, and switching Python to C took 703 ms. These are single samples and include per-frame fixture scanning; they are not native Desktop frame rates or performance guarantees.

## Unreleased JavaScript task-function display / JavaScript 任务函数展示

The preceding candidate added a Python/JavaScript language preference to the function layout; the default and legacy fallback remain Python. The JavaScript object and scope braces visualize recorded arguments and nesting, not executable source or a callback. The separate trailing-braces layout remains independent. No TypeScript option is claimed.

On macOS arm64, 46 unit cases and 38 Chromium fixture cases passed. Python formatter output matched the preceding source in 240 combinations of names, values, incomplete records and scope/wrapping states. A clean isolated rc.5 Web host with synthetic Session/PTC events passed 19 checks including JavaScript switching, preview, nesting, folding, failure navigation, file actions and saved settings. No model or tool was run. Client SHA-256: `4a9f4ae36de8aeb940d82ad0136da1eb6d6f3166c3b9f4b24407096eed2fddac`. Native Desktop runtime, sustained live generation and Windows/Linux Desktop were not validated by these checks.

In separate sequential headless Chromium samples with 1,000 synthetic calls, initial conversion took 770 ms for Python and 752 ms for JavaScript; switching after conversion took 701 ms and 703 ms respectively. The fixture scans every expression each frame and includes its own overhead. These are single synthetic samples, not native Desktop frame rates or performance guarantees.

## 0.10.0 task functions / 任务函数

Code blocks now have a default `function` layout and an optional `braces` layout. The function layout borrows `uiSession.adapter.current` and its existing `hooks.chat` source in the verified rc.2/rc.5 clients. It reads native-flow-keyed nodes and recursive `data.root.subCalls`, never writes Session events, retains a Session, requests a model or loads history. Context is used only for matched current-session rows. Unsupported/custom summaries retain native presentation; special controls are not hidden without a safe action mapping.

Owned expression nodes are appended alongside intact native summary nodes. Native file actions and disclosure are retained, and complete parameters are exposed by an independent keyboard-operable disclosure. Inactive views retain their normal-flow layout while releasing data subscriptions and delegated events. The new `codeLayout` field defaults to `function`; all existing settings retain their values. This visual representation is not an executable program or a guarantee of Python call semantics.

Validation uses pure normalization/formatting checks, Chromium fixtures and synthetic Session records, including actual PTC event projection in both supported Web hosts. No model or tool is executed. Final counts and runtime hash are recorded in `verification/0.10.0.json`; native macOS installation/settings checks are recorded separately in a private receipt. No sustained model-session, Windows/Linux or desktop FPS claim is made.

## 0.9.1 IDE colours / IDE 配色

Code blocks now use VS Code Dark+/Light+ token colours for function-like summaries, file links and reasoning headers. Brackets and guides cycle through three nesting colours; execution status colours apply to summaries, preserving stable pair identity. Explicit preview themes override the ambient palette. No settings fields were added or reset.

The final runtime passed 31 unit and 28 Chromium cases plus 13 code-style checks in each isolated rc.2 and rc.5 Web host. Precise colour assertions use reduced motion to avoid sampling a 140ms transition; normal animation coverage remains separate. Results are in `verification/0.9.1.json`. Desktop installation and exact settings equality are recorded separately in the private installation receipt. Prior test records remain unchanged.

## 0.9.0 code blocks / 代码块

The fourth style uses CSS generated content attached to existing summary and subcall anchors. It preserves the host text, links, folding and status. Closing braces reserve normal-flow rows; inactive views retain lightweight scope attributes so suspension does not change history height. Existing preferences and the classic fresh-install default are retained.

Validation covers synthetic Chromium fixtures and a real isolated DSH 0.2.1-rc.5 Web host. Nested Web-host scopes are explicitly injected DOM based on genuine host summaries, not evidence of model/tool execution. The code style also passed 11 checks in a fresh isolated DSH 0.2.1-rc.2 Web profile using the same packed runtime. Final test counts are recorded in `verification/0.9.0.json`; machine-specific Desktop installation and preference equality are recorded separately in a private local receipt. No sustained live-model, Windows/Linux or native Desktop performance claim is made.

## Test levels / 验证层次

- Unit: normalization, migrations and geometry helpers.
- Browser: real Chromium, ResizeObserver, IntersectionObserver, SVG and React on synthetic host-shaped markup. This verifies renderer behavior and cleanup, without model requests or private data.
- Host: exact packed plugin loaded by a separate real DSH Web host with a new DSH_HOME, with and without an unchanged upstream theme. Real-host settings and activation checks are recorded separately from synthetic transcript checks.
- Native Desktop: separate acceptance; a Web result does not establish Desktop scrolling performance.

## 0.8.2 rc.2 final Web regression / rc.2 最终版 Web 回归

The final runtime (client SHA-256 `8ee4deda8c0b3968285a07a81dbf5a5f3e631d8bed14937414b0160e609ac79c`) was installed into a clean, isolated official DSH 0.2.1-rc.2 Web profile on macOS arm64. The real-host synthetic session passed 17 regular checks and nine botanical optimization opt-in checks without model requests. The first run exposed a test assumption: rc.2 shows the signature in a collapsed reasoning row, while its expanded row shows the body. The revised host test retains the expanded-body assertion and checks the filtered collapsed title when explicitly requested. Results and the initial failure are recorded in `docs/verification/rc2-final-regression.json`. This is not native Desktop, Windows, Linux, sustained generation or performance validation.

## 0.8.2 native Desktop spot check / 桌面版抽查

The final runtime (client SHA-256 `8ee4deda8c0b3968285a07a81dbf5a5f3e631d8bed14937414b0160e609ac79c`) was installed on macOS arm64 in the DSH 0.2.1-rc.5 Desktop profile with an existing customized Claude Style. After enabling the opt-in and temporarily selecting botanical style, an existing short acceptance session displayed its crown, branches and six nodes; three top-level nodes matched their rows with zero measured center offset, and manual scrolling retained alignment. The prior settings were restored except for the requested opt-in. This was not a clean-profile Desktop benchmark or a sustained live-model test; Windows, Linux and other Desktop configurations remain unverified.

## 0.8.2 botanical opt-in scrolling optimization / 植物滚动优化

With 200 synthetic calls in rc.5 Web, invalidation traces associated botanical
SVG child changes with host `:has()` style recalculation. Single-run diagnostic
interventions that hid the canopy or all artwork did not meaningfully reduce
long intervals; blocking SVG child mutations or removing host selectors did.
Those interventions change the interface and were not shipped. A general SVG
reuse pool improved measurements but changed compositing order in overlapping
branches; a pool restricted to preserving order showed no convincing speedup.
Neither pool is included.

The new botanical Advanced setting is **off by default**, including for old
preferences. When enabled it puts the chat root graphics inside an open Shadow
DOM so their internal mutations no longer trigger the host's ancestor selectors.
This retains geometry and paint order but ordinary `document.querySelector` and
external CSS cannot directly reach those internal elements. Other plugins or
custom CSS depending on direct access may be incompatible while it is enabled;
turning it off restores the previous DOM. The settings preview remains outside
the isolated drawing layer. A static hidden marker avoids the host `:empty`
selector shifting the first row; a `<style>` fallback handles blocked
constructable stylesheets. Other themes and native desktop sessions are not
covered by these tests.

Final three-round, 3-second, 200-call elapsed-time comparisons in headless
Chromium on rc.5 Web measured intervals above 25 ms as follows: at 800 CSS px/s,
baseline 17/526 (3.23%), candidate disabled 32/511 (6.26%), candidate enabled
0/543; at 6000 px/s, baseline 179/363 (49.31%), disabled 165/377 (43.77%),
enabled 1/537 (0.19%). The enabled fast case had one 116.6 ms interval of
unknown origin, retained in the raw data. The same fixture content height
(18,489 px), 200 calls, matching visible anchors, and 500 px final scroll
position were verified in each run. These are synthetic stress signals, not
native Desktop FPS, real-user latency, or a guarantee of no long frames. An
earlier batch may overlap startup of other hosts and is retained separately;
the numbers above come from the subsequent controlled repeat.

The candidate passed 30 unit and 25 Chromium tests, the normal rc.5 host suite
17/17 with and without stock Claude Style 0.19.1, the opt-in host suite 9/9 in
both configurations and the opt-in synthetic stream 5/5. A theme fold test
initially failed because the test did not await the asynchronous aria-expanded
transition; the failure is retained, and the corrected check still verifies
matching anchors after fold/restore. Raw sanitized data and reproduction scripts
are in the source checkout under `docs/verification/rc5-botanical-*.json`,
`test/performance-rc5/botanical/`, and `test/botanical-host/`. Raw traces and
host logs may contain temporary access tokens and must not be shared.

## 0.8.2 rc.5 scrolling investigation / 滚动性能跟踪

In a 200-call synthetic rc.5 Web session, Chromium traces under rapid scrolling
showed substantially more document-wide layout/style recalculation with the
plugin. Paint was not the main difference in this fixture. Invalidation traces
associated SVG child insertions/removals with several host `:has()` selectors.
Two single-run diagnostic interventions—removing five relevant host CSS rules,
and freezing SVG child insertions/removals (206 blocked)—each reduced intervals
above 25 ms from 87/89 to 0/89 under the same heavy tracing. Both interventions
alter interface behavior and are diagnostic evidence, not fixes; trace event
and CDP metrics can overlap and must not be added together.

The candidate rounds the existing window outward to 256px boundaries and reuses
a committed window only when the visible row set, full size, crown space and
scale are unchanged. The original 320px overscan is never reduced. This avoids
many redundant SVG changes but leaves host selectors untouched. A commit
failure preserves dirty state and does not promote an incomplete window snapshot.

In two paired synthetic elapsed-time speed comparisons of the final candidate
against the prior source, fast scrolling (6,000 CSS px/s, 3 seconds) produced
these proportions of requestAnimationFrame intervals above 25 ms: classic
134/229 (58.5%) to 46/311 (14.8%); quiet 93/267 (34.8%) to 14/348 (4.0%);
botanical 169/190 (88.9%) to 132/229 (57.6%). At 800 px/s, classic was 7/355
to 3/359 and botanical 59/285 to 42/319. One ordinary-speed quiet baseline
sample had an unexplained 1.63-second interval; it is retained and should not be
interpreted as an ordinary frame. These samples are headless Chromium Web-host
stress probes, not native Desktop FPS or input latency. Botanical still has
substantial long-frame cost. Alignment after rapid jumps was checked after the
observers settled; first-frame completeness was not established.

Raw redacted measurements, including the anomalous sample, are in the source
checkout at `docs/verification/rc5-layout-trace-results.json`. Source-only
reproduction instructions are in `test/performance-rc5/README-speed.md` and
`test/performance-rc5/trace/README-trace.md`. Never publish raw Chromium trace
files or host logs: they may contain temporary access tokens.

## 0.8.2 rc.5 empty-row and performance checks / 空行与性能检查

An empty process row can be indexed as empty and later gain text through a
character-data update without a size change. In synthetic DOM this left its
matching dot missing in an earlier local 0.8.2 candidate. The change observes only initially skipped empty
rows, stops observing each when it becomes usable, and disconnects on suspend
and stop. Tests cover text-node updates, insertion, removal, offscreen cleanup,
and resume. In the rc.5 Web host a synthetic DOM row reproduces this edge case;
separately, five controlled synthetic stream phases exercised the real rc.5 host
renderer. In that stream, a signature-only row had no dot, and the visible
reasoning obtained its own matching dot. The earlier local 0.8.2 candidate passed that stream
scenario, so this is not evidence that ordinary rc.5 streaming triggers the bug.

That earlier empty-row candidate passed 29 unit tests, 20 Chromium checks and 17 real rc.5
Web-host checks, both without an added theme and with unchanged Claude Style
0.19.1. The five synthetic stream phases also passed with the final candidate.
No model was called. Native Desktop, Windows and real sustained model sessions
were not tested by these checks.

Performance was measured with headless Chromium and synthetic sessions. In a
200-call rc.5 Web fixture, a fixed 11,000-pixel out-and-back sweep over 90 frames
had p95 about 33.4 ms with the plugin enabled; the plugin-off comparison was
16.7 ms in one run. This is a fast stress test, not a native Desktop FPS result.
A 128-edge cache reduced synthetic curve generation by about 4% while retaining
up to 128 detached edges; a 16-edge candidate produced no convincing improvement
in three sequential rc.5 host runs and retained additional DOM objects. Neither
candidate is included. Timed plugin JavaScript stages alone did not explain the
host long frames; layout and paint remain unmeasured, so the bottleneck and a
reliable smoothness improvement remain open. The source checkout contains raw results in `docs/verification/rc5-performance-results.json`
and reproduction instructions in `test/performance-rc5/README-perf.md`.

To reproduce the controlled stream check, make a fresh empty directory, create
`.dpt-disposable-test` inside it, and set `DSH_STREAM_TEST_DIR` to that directory
and `DSH_HOME` to its `home` child. Install the packed candidate into this
profile and start rc.5 with `--patch ./test/fixtures/stream-fixture.patch.yml`
on a loopback port. Set `DSH_TEST_HOST_LOG` to the host log inside that same
directory and run `node test/host-stream-regression.cjs`. Never share the log;
it contains a temporary access token. The stream fixture refuses the normal
user DSH home and does not run an agent or invoke a model.

## Earlier 0.8.2 compatibility candidate / 早期兼容候选版

On macOS arm64, the Desktop-bundled **DSH 0.2.1-rc.5** CLI ran separate disposable Web profiles. The unchanged 0.8.1 package was rejected by the version gate. A packed 0.8.2 candidate, with `engines.dsh` set to `0.2.1-rc.2 || 0.2.1-rc.5`, installed without an exemption. The renderer adds recognition of the host's `ok` completion state.

The actual rc.5 Web host passed 16 checks both without a theme and with unmodified npm Claude Style 0.19.1. These cover the host-rendered synthetic transcript and alignment, rc.5 reasoning metadata filtering and folding, completed-tool leaves, simulated running/error/stopped DOM state changes, scrolling, process folding, three styles and settings preview, reduced motion, both color schemes, settled overlay writes, and live disable/re-enable cleanup. An initial state test selected a row outside the theme's clipped viewport and timed out; selecting a visible row resolved the test setup. A further host check exposed that successful calls use state `ok`, which the renderer did not recognize as completed; that check failed before the fix. The candidate adds `ok` to the finished list. All 29 unit and 19 Chromium checks also passed. See [recorded results](verification/0.8.2.json).

In that earlier check no model or tool was run. Nested calls were tested in the synthetic browser fixture, not the rc.5 host fixture; state transitions in the host were injected into its rendered DOM. At that point rc.5 native Desktop, Windows/Linux and sustained generation or performance were not tested. The user's existing customized Claude Style is distinct from the stock theme tested here. This evidence supports the explicit rc.5 compatibility declaration, not a blanket claim for intermediate or future releases.

## 0.8.1 documentation update / 文档更新

The 0.8.1 GitHub release refreshes README images and host-test instructions;
the plugin runtime is unchanged from 0.8.0. The npm and Discover versions remain
0.8.0. The 0.8.1 candidate passed 29 unit checks, 19 Chromium browser checks and
13 real DSH Web fixture checks in an isolated profile without an additional theme.
These checks do not establish native Desktop performance; the 0.8.0 limitations
below still apply.

## 0.8.0 validation / 0.8.0 验证

The release candidate passed 29 unit checks and 19 Chromium browser checks on macOS.
The candidate runtime matches the installed Desktop runtime by SHA-256; the README
captures include a real running conversation in an existing customized Desktop
profile and a sanitized replay in isolated DSH Web. These observations are not
clean-profile Desktop acceptance or a sustained performance measurement.
Windows/Linux Desktop and other DSH versions remain unverified.

After publication, the exact 0.8.0 package also passed 13 fixture checks in an
isolated DSH Web profile without an additional theme, including live disable and
re-enable. This real-host check does not measure native Desktop performance.

## 0.7.4 botanical roots / 植物根系加粗

The botanical preset now uses a 5.6 px line width, up from 2.8 px. Classic
remains the default with its existing width, and quiet is unchanged. Explicit
saved widths are preserved; selecting botanical reapplies its thicker preset.
README previews were regenerated from the actual renderer. Version-specific
checks and remaining limits are in [0.7.4 verification](verification/0.7.4.json).
Native Desktop acceptance was not repeated for this preset-only update.

## 0.7.3 default-style update / 默认风格更新

0.7.3 changes the fresh-install and invalid-style fallback to classic curves.
Explicit saved styles and customized values remain unchanged. Missing fields
use the selected style's preset. Rendering code is unchanged. Unit checks
passed 12/12 and cached Chromium headless checks passed 10/10. System Chrome
failed two in-progress-animation timing assertions; these separate failures
are retained in the version-specific record. Checks are recorded in
[0.7.3 verification](verification/0.7.3.json). The native Desktop acceptance
below applies to the recorded **0.7.2 runtime hash**; it is not a claim that
0.7.3 was reinstalled or accepted in a clean native profile.

The first public commit `c82810b4c9e0ac80268a9a4825d10bf1e179bcca`
was cloned from GitHub and installed from its GitHub URL into a separate empty
DSH home and Web profile with scripts disabled. Installed runtime and manifests
matched the published source. The installer reported peer-dependency warnings;
this installation check did not start another host or run a model. The public
clone passed `npm ci`, 12 unit checks and package checks. The
[GitHub Actions run](https://github.com/Bosaiting/dsh-process-tree/actions/runs/40304015658)
on Ubuntu with Node 24 passed dependency installation, unit, browser and
package checks. This is Linux browser CI, separate from Linux Desktop acceptance.

## 0.7.2 acceptance / 上一版本验收

Verified on 2026-10-26, macOS arm64, Chromium and DSH 0.2.1-rc.2:

| Environment / 环境 | Result / 结果 |
| --- | --- |
| Unit tests | 12 passed |
| Browser renderer on host-shaped markup | 10 passed, including actual React settings preview |
| Fresh DSH Web, no theme or local patches | 13 host checks passed |
| Fresh DSH Web + unchanged npm Claude Style 0.19.1 | 13 host checks passed |
| Local Git source installed into another empty profile | Passed without installation hooks or build allowance |
| Native macOS Electron window, existing customized profile | Functional and visual acceptance passed with limits below |
| Windows/Linux Desktop, clean native profile, other DSH versions | Not verified / 未验证 |

Both real-host runs installed the packed candidate, using independent empty
DSH_HOME directories, without credentials, old chats, local theme patches or
other user plugins. A test-only fixture used the real Session API on an idle
host agent to append completed synthetic records. The host's own conversation
renderer created six tool rows and six reasoning rows. No model or tool ran.

Checks covered native row/dot alignment, clipped inner and outer scrolling,
process folding, all three styles and the settings preview, reduced motion,
light/dark themes, zero settled-overlay DOM writes over twenty frames, and live
disable/re-enable through a profile patch. Disabling removed plugin SVG, styles
and root spacing variables; re-enabling created one instance. Both pages had
zero uncaught JavaScript errors.

Stock Claude Style's client SHA-256 was
`6146bdc06622058c6cc2ecdfac68f843c276cfa6fb85bc8d34d923a354f2d7c6`,
identical in the npm archive and installed test profile. The candidate runtime
client SHA-256 was
`f5c03b34fe98dbbc320364fc2d555331f4a85ea4c949585e123bc7c39c3b0f6c`,
identical in source and both installed packages. Sanitized machine-readable
results are kept in [verification](verification/0.7.2.json).

These completed synthetic turns establish functional coexistence; they do not
measure long-running model streams, native Desktop frame rates or all possible
community-plugin combinations. The public host-version declaration currently
admits only the verified DSH release. The GitHub workflow is configured for
Linux browser checks; the later 0.7.3 public-CI result is recorded above.

## Native macOS Desktop / 原生桌面验收

On 2026-10-26, the exact candidate runtime was installed using the Desktop-bundled
CLI and loaded in the actual DSH 0.2.1-rc.2 Electron window after restart. This
used an existing profile with locally customized Claude Style 0.19.1 and other
UI plugins; it is additional coexistence evidence, separate from the clean,
unchanged-theme Web checks above.

Native checks passed for all three style presets and live settings preview,
light/dark appearance, content fonts 14 and 16, existing nested calls, process
folding and tool-output expansion. Inner scrolling correctly clipped the crown
and restored it when scrolled to the top. Temporarily disabling the plugin via
the host profile removed the visible crown, connectors and extra indentation;
re-enabling restored them. Existing long-history scrolling, conversation
switching and local search input remained operable. All 32 original tree
preferences were compared after restart and matched; original appearance and
profile configuration were restored. No new chat messages or model/tool runs
were submitted.

This is visual and functional acceptance, not a sustained-generation performance
result. Native FPS, input latency, CPU/memory growth and resource counts were
not measured. Composer typing with prediction requests and new running/error
transitions were not tested. Existing inspector connection retries and missing
theme fonts were observed, so this run does not claim a clean global console.
Windows/Linux Desktop and a clean native Desktop profile remain unverified.

## Reproduce the real-host checks / 复现真实宿主检查

Use an installed DSH **0.2.1-rc.2** CLI. Keep all profiles below a disposable
directory; never point this procedure at your normal DSH_HOME. On macOS/Linux,
from the repository root:

```sh
npm ci
npm pack
plugin_version=$(node -p "require('./package.json').version")
mkdir -p .release-checks/host
export DSH_HOME="$PWD/.release-checks/host/home"
dsh --profile web --dump-config > .release-checks/host/config.txt
dsh plugin --profile web add "$PWD/dsh-process-tree-${plugin_version}.tgz"
# For the second environment, use a different empty home and add the stock theme:
# dsh plugin --profile web add dsh-claude-style@0.19.1
dsh --profile web --patch ./test/fixtures/cordis.patch.yml \
  --host 127.0.0.1 --port 18763 --no-open > .release-checks/host/server.log 2>&1
```

Keep that disposable host running. In another terminal in the same repository:

```sh
export DSH_TEST_HOST_LOG="$PWD/.release-checks/host/server.log"
export DSH_TEST_PROFILE_PATCH="$PWD/.release-checks/host/home/profiles/web/cordis.patch.yml"
npm run test:host
# Also set DSH_EXPECT_THEME=1 for the profile with stock Claude Style.
# For DSH 0.2.1-rc.5, also set DSH_EXPECT_FILTERED_REASONING=1.
```

`DSH_TEST_HOST_URL` can supply the printed loopback URL instead of the log.
`DSH_CHROMIUM_EXECUTABLE` selects an existing Chromium; otherwise install the
locked browser with `npx playwright install chromium`. `DSH_TEST_OUTPUT`
selects the local result directory. The test intentionally changes and restores
the supplied disposable profile patch to verify actual unloading; without that
variable it explicitly reports lifecycle checks as untested. Stop the host and
unset DSH_HOME after the check. Log files contain a temporary host access token
and must not be committed or attached to public issues.

## Known boundaries / 已知边界

The tree uses host `data-*` anchors for process groups, calls and summary rows. These can change in a future DSH release. Unsupported markup may show no tree even when the package loads. React must come from the host's shared module table.

Claude Style is not a dependency. Its quiet-decoration marker and resolved reduced-motion setting are recognized when present. Coexistence must be tested against the unmodified upstream release, independently of any local patches.

Other plugins changing the same row spacing, root CSS variables or process connectors may conflict. Do not run a second indentation or tree renderer alongside this plugin. Browser lifecycle tests cover release of SVG, observers, animations and settings resources; native checks and their limits are recorded separately above.

Chromium is the verified browser. Firefox and Safari are unverified. The local
Git check exercises source installation without a hosted repository. The public
repository is https://github.com/Bosaiting/dsh-process-tree; the 0.7.3 hosted
clone, GitHub source install and remote-CI results are recorded separately above.
