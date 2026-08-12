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

## Interactions

Only behaviour the design itself represents is implemented, in vanilla JS:

- the talent panel's search field filters the role list and the result rows;
- the country control — which the file shows in both a "Global" and a country
  state — is a keyboard-accessible listbox over the countries in the design,
  and filters the results;
- a role can be selected (the file maps no roles onto the results, so
  selection only changes the row's own state);
- links and buttons have hover and focus feedback.

Nothing is animated: the file defines no transitions.
