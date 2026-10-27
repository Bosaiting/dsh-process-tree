# Compatibility / 兼容性

Current version: 0.8.0. Host version declarations are limited to verified releases.

## Test levels / 验证层次

- Unit: normalization, migrations and geometry helpers.
- Browser: real Chromium, ResizeObserver, IntersectionObserver, SVG and React on synthetic host-shaped markup. This verifies renderer behavior and cleanup, without model requests or private data.
- Host: exact packed plugin loaded by a separate real DSH Web host with a new DSH_HOME, with and without an unchanged upstream theme. Real-host settings and activation checks are recorded separately from synthetic transcript checks.
- Native Desktop: separate acceptance; a Web result does not establish Desktop scrolling performance.

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
