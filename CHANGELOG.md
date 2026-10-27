# Changelog

## Unreleased

- Draw a straight trunk in classic and botanical; the old wavy default (4.83 px) migrates to 0, custom values are kept.
- Top-level tool branches leave the trunk between rows instead of from the previous dot, so siblings no longer read as children.
- One dot rule everywhere: solid for thinking, ring for tools, same size at every depth, drawn in the line's own colour.
- Even row rhythm: top-level steps and nested calls share one 16 px gap; branch transitions bend within it instead of adding padding.
- Classic lines use the host's text colour at about two-thirds strength instead of a faint sage grey; the taper is stronger along the trunk, stems and forks.
- Classic leaves now mean something: a leaf sprouts when a tool step finishes, and running or failed steps stay bare. The random leaf-density slider is gone; a saved density of 0 migrates to hidden leaves. Default leaf size is 9 px.
- Quiet lines are presented as the understated mode: listed last in the settings and READMEs.

## 0.7.4

- Increase the botanical root preset from 2.8 px to 5.6 px, retaining taper and texture.
- Keep classic and quiet preset widths unchanged; preserve explicitly saved custom widths.
- Refresh all three README previews using the actual renderer.
- Run CI in a pinned Playwright image to avoid slow Ubuntu dependency installation.

## 0.7.3

- Make classic curves the default for fresh installations and settings without a valid style.
- Preserve explicit saved style choices and custom values; quiet and botanical remain available.

## 0.7.2

- Register the client factory without reading storage or querying media during prefetch.
- Add portable, locked test dependencies, package checks and browser CI configuration.
- Verify the packed runtime in fresh DSH 0.2.1-rc.2 profiles, with and without stock Claude Style 0.19.1.
- Complete native macOS Desktop visual and functional acceptance; document the remaining sustained-generation and performance limits.
- Retain the MIT notice for adapted dsh-tool-indent code and document original canopy ownership.
- Replace machine-local installation instructions with public package and GitHub instructions.
- Exclude the standalone canopy source from the runtime archive; the renderer retains its embedded artwork.

## 0.7.1

- Discover and release process containers from changed subtrees rather than rescanning historical groups on every new turn.

Earlier local iterations are not presented as public GitHub releases.
