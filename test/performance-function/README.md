# Function-code long-history benchmark

`benchmark.cjs` measures this repository's actual client code in a synthetic,
host-shaped browser DOM and synthetic Chat projection. It does not run a DSH
agent, model, or tool, and does not use or change a personal profile. It is not
a native desktop FPS measurement. The fixture generates root tool calls with
long parameters; other shapes, especially deeply nested native UI, need separate
measurements.

Run `DPT_ROWS=1000 node test/performance-function/benchmark.cjs`. Set
`DSH_CLIENT_SOURCE` to an absolute path to compare another source version;
`DSH_PLAYWRIGHT_MODULE` selects a Playwright installation. The script records
first expression, time until all expressions appear, animation-frame intervals,
long tasks, and a synthetic changed-call update. The per-frame expression count
adds test overhead to both candidates. Headless browser scheduling and machine
load influence results; compare repeated sequential samples on the same machine.
The initial times include manager setup and host-shaped DOM work, not only the
plugin conversion method. An unfinished conversion after 30 seconds is reported
as `all: null`.

The recorded [2026-10-31 comparison](results-2026-10-31.json) contains three
alternating 1,000-call samples and one 5,000-call sample per version. With
1,000 calls, first expression appeared in 37–39 ms after batching, versus
469–495 ms before; all expressions appeared in 744–768 ms versus 469–495 ms.
For 5,000 calls, the single samples were 94 ms first / 4,561 ms all versus
12,936 ms first and all. The candidate still recorded long tasks at 5,000 calls.
These are isolated synthetic browser results, not native desktop measurements or
a guarantee for real histories.
