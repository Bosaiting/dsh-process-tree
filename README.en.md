<div align="center">
  <h1>DSH Process Tree</h1>
  <p><strong>Make DeepSeek Harness tool activity easier to read and navigate.</strong></p>
  <p>Task functions · Code palettes · Interactive process trees</p>
  <p>
    <a href="README.md"><img src="https://img.shields.io/badge/lang-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-B85645.svg" alt="简体中文" /></a>
    <a href="README.en.md"><img src="https://img.shields.io/badge/lang-English-3771A4.svg" alt="English" /></a>
  </p>
  <p>
    <a href="https://www.npmjs.com/package/dsh-process-tree"><img src="https://img.shields.io/npm/v/dsh-process-tree.svg?label=version&amp;color=B56C43" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/dsh-process-tree"><img src="https://img.shields.io/npm/dm/dsh-process-tree.svg?label=downloads&amp;color=8A674F" alt="npm monthly downloads" /></a>
    <a href="https://github.com/Bosaiting/dsh-process-tree"><img src="https://img.shields.io/github/stars/Bosaiting/dsh-process-tree.svg?label=stars&amp;color=3B77A1" alt="GitHub stars" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-478164.svg" alt="MIT license" /></a>
  </p>
</div>

The default code view presents recorded calls, arguments, comments and nested scopes as a task function. Classic curves, quiet lines and botanical artwork are also available.

This community UI plugin supports DSH Web and the Desktop web interface. It does not render in TUI.

## Quick install

```sh
dsh plugin --profile web add dsh-process-tree@latest
```

Restart the corresponding DSH instance after installation. Desktop users can use the plugin manager; see [installation](#install) for other options.

## Preview

### Default code view

The task-function view shows loaded calls, recorded arguments, failure status and nesting. The minimap navigates visible calls; file and web links retain their native host actions.

| Dark mode | Light mode |
|:---:|:---:|
| [![Dark code view with task function, web fetch, failure result and minimap](docs/images/code-view-dark.png)](docs/images/code-view-dark.png) | [![The same task records in the light code view](docs/images/code-view-light.png)](docs/images/code-view-light.png) |

Select the recorded-failures count to open a list and navigate to a call. Plugin-folded ancestor scopes are opened when needed:

![Recorded failure list](docs/images/code-failures.png)

These screenshots use a **synthetic session** in an isolated DSH host. Files, URLs, outputs and the failure are demonstration data; no model or tool was run and the example URL was not accessed. Screenshots were captured at 2× pixel density; open an image to view it at full resolution.

### Code palettes

Choose light and dark palettes independently, and use either the host background or the preset's code-area background. The four dark variants below are captured from the actual settings preview:

| VS Code Dark+ | JetBrains Darcula |
|:---:|:---:|
| ![VS Code Dark+ preview](docs/images/palette-vscode.png) | ![JetBrains Darcula preview](docs/images/palette-jetbrains.png) |
| **Catppuccin Mocha** | **Dracula Classic** |
| ![Catppuccin Mocha preview](docs/images/palette-catppuccin.png) | ![Dracula Classic preview](docs/images/palette-dracula.png) |

Colours are adapted to this plugin's syntax roles, with some contrast adjustments; they are not complete reproductions of the original IDE themes. See [third-party notices](THIRD_PARTY_NOTICES.md) for sources.

### Tree styles

The same tool calls in three tree styles, captured from a synthetic session in an isolated host. Select an image to view it at full size:

| Classic curves | Botanical | Quiet lines |
|:---:|:---:|:---:|
| [![Classic curves](docs/images/tree-classic.png)](docs/images/tree-classic.png) | [![Botanical](docs/images/tree-botanical.png)](docs/images/tree-botanical.png) | [![Quiet lines](docs/images/tree-quiet.png)](docs/images/tree-quiet.png) |

## Features

- **Task functions and nested scopes:** show recorded tool names, arguments, comments and call relationships. Independent arrows fold child calls without changing native result disclosure.
- **Display languages:** Python, JavaScript, C, C++, Java and Go, plus a separate trailing-braces layout.
- **Status and navigation:** distinguish failures, interruptions, unknown outcomes and unfinished calls. The failure list and minimap navigate loaded, visible calls. Durations appear only when both timestamps are recorded.
- **Native interactions:** safely matched file buttons and `web_fetch` URLs delegate to the original host actions. Native results remain expandable and long arguments can be disclosed. Unsafe mappings and missing structured records retain the native summary instead of guessing.
- **Long histories:** calls near the viewport are converted first, with the rest processed in batches. Unconverted rows keep their native summary; distant histories release drawing resources and restore them on return.

Language views are **read-only illustrations of execution records**, not original or executable source code. Display order does not establish sequential execution or an actual function signature. Java and Go retain native summaries for objects, arrays, incomplete arguments or unsuitable tool names; raw names remain available through disclosure. Python, JavaScript, C and C++ use ellipses when numbers or duplicate names cannot be represented without changing the record, and retain the raw arguments.

An unknown outcome requires an explicit host indication or a result without a valid success/error flag; it does not establish whether an operation ran. Host-marked failures with a successful structured result are counted separately without inferring an exit code.

## Install

### Plugin market

1. Open **Plugins → Experimental plugins** and enable **Custom plugin markets** (called **Custom plugin indexes** in some builds).
2. Open **Discover → Add index source**. If sources already exist, use **Manage index sources…** in the market menu.
3. Add the address below, select **Process Tree by Bosaiting**, search for `dsh-process-tree`, and confirm the source is `https://registry.npmjs.org` before installing.

```text
https://raw.githubusercontent.com/Bosaiting/dsh-process-tree/main/market/index.json
```

Restart when prompted. Index sources belong to a profile and must be added separately by each user. See the [Discover guide](docs/DISCOVER.md) for troubleshooting.

### Command-line or offline installation

```sh
# Install the latest version into the Web profile
dsh plugin --profile web add dsh-process-tree@latest

# Or install a pinned version
dsh plugin --profile web add dsh-process-tree@0.11.1
```

For offline installation, download the npm package first and use the resulting filename:

```sh
npm pack dsh-process-tree@0.11.1
dsh plugin --profile web add ./dsh-process-tree-0.11.1.tgz
```

Restart the corresponding DSH instance. Use the plugin manager for Desktop; the verified macOS Desktop also provides a bundled CLI for the `desktop` profile. Do not edit the Desktop application installation directory directly.

## Settings

Open **Settings → Plugins → 过程树**. Fresh installations and the full reset use these defaults:

| Setting | Default |
| --- | --- |
| Style | Code blocks |
| Code layout | Task function |
| Display language | Python |
| Light palette | VS Code Light+ |
| Dark palette | JetBrains Darcula |
| Code background | Preset background |

Existing valid saved styles and colour choices are preserved. Code style hides the tree-style **Intensity**, **State colours** and **Advanced** controls; switch to a tree style to adjust those options.

![Light and dark palette selectors and code background setting](docs/images/code-color-settings.png)

Light presets are VS Code Light+, JetBrains Light, Catppuccin Latte and Alucard Light; dark presets are VS Code Dark+, JetBrains Darcula, Catppuccin Mocha and Dracula Classic. Each preset retains its own custom colours. A palette reset affects only the selected preset; **Restore defaults** resets all plugin settings. Palette changes work offline.

Code colours can be adjusted for functions and tools, keywords, parameters, strings and files, numbers, comments, plain text and three bracket levels. If an older version saves settings after a downgrade, active colours remain but preset selections and other preset customisations may be lost; back up settings first if needed.

The three tree styles support separate light and dark running/error colours. Line, dot, indentation, summary and leading controls live in the collapsed **Advanced** section. Botanical scrolling optimisation is off by default; enabling it may affect other plugins or custom CSS that directly access internal root elements.

## Compatibility and data

Version 0.11.1 does not block installation or loading by DSH version. This does not mean future releases have been tested. rc.5 passed isolated Web-host checks; sustained native Desktop operation and Windows/Linux remain among the unverified areas. Older published 0.8.2 retains its original RC2/RC5 restriction. See [compatibility](docs/COMPATIBILITY.md) for evidence and limits.

The plugin reads rendered chat structure, element dimensions and the current session's already-loaded Chat projection without loading extra history. It registers no model tools, runs no commands and sends no network requests. Preferences are stored in the current interface's `localStorage` (`dsh.process-tree.v1`); uninstalling leaves them intact. If storage fails, settings display a warning and another change retries after recovery.

Claude Style is not a runtime dependency. Avoid enabling another plugin that adds the same indentation or process connections to the same area.

## Documentation

| Document | Contents |
| --- | --- |
| [Plugin market](docs/DISCOVER.md) | Add an index, install and troubleshoot |
| [Compatibility](docs/COMPATIBILITY.md) | Tested hosts, evidence and unverified areas |
| [Changelog](CHANGELOG.md) | Version history |
| [Third-party notices](THIRD_PARTY_NOTICES.md) | Palette sources, copyrights and licenses |

## Remove

```sh
dsh plugin --profile web remove dsh-process-tree
```

Restart the corresponding instance; Desktop users can use the plugin manager. The rest of the DSH profile can remain in place.

## Develop and validate

Node.js 22.19 or newer is required. Runtime JavaScript is checked in and needs no build; React and Playwright development dependencies serve tests only.

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run check:package
```

Set `DSH_CHROMIUM_EXECUTABLE` to use an existing Chromium. See [compatibility](docs/COMPATIBILITY.md) for host checks, evidence and limits. When reporting issues, include the DSH version, OS, style and other UI plugins without private conversation data.

## License and credits

MIT; see [LICENSE](LICENSE). The canopy is original artwork by the project owner. Row indentation, summary dimming and leading adapt Asheep233's [dsh-tool-indent](https://github.com/Asheep233/dsh-tool-indent); its original notice is retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
