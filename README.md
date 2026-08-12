# Atlas — Global HR Workspace landing page

A pixel-accurate HTML / CSS / vanilla-JS implementation of the supplied Figma
file (`Untitled (10).fig`). No frameworks, no build step, no dependencies —
open `index.html` in a browser, or serve the folder statically.

```
index.html
css/style.css
js/script.js
assets/
  fonts/    figtree-400.woff2, figtree-500.woff2
  images/   hero + bento photography and avatars, extracted from the .fig
  svg/      logo mark, search, globe, check badge, arrow, connector
```

## How the design values were obtained

The `.fig` file is a ZIP containing `canvas.fig`, a Kiwi-encoded (zstd
compressed) scene graph plus the original image blobs. It was decoded rather
than eyeballed, so every number in `css/style.css` — position, size, corner
radius, padding, gap, font size, line height, letter spacing, fill colour,
paint opacity and background-blur radius — is the literal value stored in the
document. The vector icons were reconstructed from the file's own path
geometry and written out as SVG; the photographs and avatars are the original
image blobs, cropped with the exact crop transforms recorded on each fill.

A geometry audit comparing 58 rendered element boxes against their Figma
counterparts passes within 0.75px on all but one text width (see *Typeface*).

## Page composition

The Figma document holds two 1800 × 1350 presentation artboards. Each shows
the website inside a light-grey mock-up shell carrying the designer's own
credit labels ("case ui/ux", "kris anfalova"). Those framing elements are
presentation furniture, not the product, and are deliberately not implemented.
What remains is assembled into one landing page:

| Section    | Source |
| ---------- | ------ |
| Hero       | `Dribbble shot HD - 132` — the 1685 × 1073 page card |
| Features   | `Dribbble shot HD - 134`, left artboard |
| Showcase   | `Dribbble shot HD - 134`, right artboard |

## Two judgement calls

**Typeface.** The design specifies **TT Hoves** (Regular / Medium), a
commercial face that cannot be redistributed. Rather than guess a substitute,
33 strings whose exact advance widths are recorded in the Figma file were
measured against 23 candidate web fonts. **Figtree** was the closest match
(2.20% mean width error, 5.17% worst case) and is used at the design's own
weights, sizes, line heights and tracking. Every headline and paragraph wraps
on the same words, and the display text boxes come out at the same heights as
Figma records (180px, 55px, 174px).

**Section scale.** The hero artboard draws the page 1685px wide; the features
and showcase artboards draw the same page 1186.5px wide. Their values are
therefore multiplied by 1685 / 1186.5 = 1.420143 so all three sections sit on
one page. This is a uniform scale — every proportion inside those sections is
exactly as authored.

## Sizing and responsive behaviour

The file contains only desktop artboards — no tablet or mobile frames, and no
prototype interactions — so the design is never re-flowed. Instead the whole
page is scaled through one custom property, `--k`, which takes the largest
value at which the design fits the viewport on both axes:

```
--k: min(1px, (100vw - 40px) / 1685, (100svh - 24px) / 1073)
```

- `1px` caps it at 100% of the Figma canvas.
- The width term keeps a 20px gutter either side of the 1685px page.
- The height term sizes the page so the **1073px hero card fits the viewport
  in full** — section one is completely visible without scrolling, the way the
  Figma frame presents it.

Every proportion stays identical to the artboard at any viewport size, and
there is no horizontal overflow at any width.

## The hero animation

Section one replays the supplied motion study (1800 × 1350, 60fps, a 5.20s
loop). The recording was taken apart frame by frame rather than approximated —
the panel's top edge was tracked across all 313 frames, and every duration,
delay and easing value below comes out of that trace.

**The panel is a three-state machine**, anchored by its centre at y 339 of the
media box, growing and shrinking around that fixed point:

| state | height | contents |
| --- | --- | --- |
| collapsed | 83px | search row only |
| suggestions | 223px | + the three role rows |
| results | 388px | + the three result rows and the count |

**The cycle**, in loop time:

| t | |
| --- | --- |
| 0.00s | result rows fade out |
| 0.07s | panel collapses to 83px (0.67s) |
| 0.35s | the query cross-fades back to its placeholder |
| 1.06s | "Designer" is typed, 58ms a character, each one fading in |
| 1.38s | panel grows to 223px (0.90s) |
| 1.62 / 1.79 / 1.96s | role rows arrive, 170ms apart |
| 2.85s | role rows leave |
| 3.20s | panel grows to 388px (1.52s) |
| 3.37 / 3.57 / 3.77s | result rows arrive, 200ms apart |
| 4.27s | "and 50+ expert hired" arrives |

All three panel transitions share one easing curve. Fitting a cubic-bezier to
the traced curve gives `cubic-bezier(0.42, 0.02, 0.05, 0.97)`, within 1% of the
reference across its whole length. Rows scale up from 90% as they fade in, and
leave more than twice as fast as they arrive — also measured, not guessed.

**The photograph** carries a slow push-in. Fitting frame 1 onto every later
frame recovers a pure centred zoom reaching 124% over the 5.2s, which is
reproduced as an alternating Ken Burns about a point just above centre.

Playing back the implementation and sampling it against the trace, the panel
height tracks the reference within a few pixels at every point in the cycle,
and each content beat lands on its measured frame.

Nothing outside the panel moves — the nav, headline, avatars, copy and call to
action are static in the reference, and they are static here.

## Interactions

Only behaviour the design itself represents is implemented, in vanilla JS:

- the demo stands down the moment anyone points at, tabs into or types in the
  panel; it settles into a fourth `full` state — the complete Figma layout,
  search row, roles, results and count together — so every control the design
  draws stays reachable;
- the search field filters the role list and the result rows;
- the country control — which the file shows in both a "Global" and a country
  state — is a keyboard-accessible listbox over the countries in the design,
  and filters the results;
- a role can be selected (the file maps no roles onto the results, so
  selection only changes the row's own state);
- links and buttons have hover and focus feedback.

The loop pauses whenever the hero scrolls out of view, and
`prefers-reduced-motion: reduce` skips it altogether: no push-in, no cycle, the
panel simply renders its full state.

One note on fidelity: the motion study places the panel higher than the static
Figma frame does, and never shows the roles and results at the same time. Where
the two disagree the animation wins, since it is the later and more specific
artefact — but every component inside the panel keeps the exact geometry,
colour and type recorded in the `.fig`, which the geometry audit still confirms.
