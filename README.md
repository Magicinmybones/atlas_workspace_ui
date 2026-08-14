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
prototype interactions — so the design is never re-flowed into a layout it does
not specify. Instead every length is `<figma value> × --k`, and `--k` is the
ratio between the space the page actually has and the 1685px canvas.

There are two of those ratios, because the hero and the sections under it are
constrained by different things:

```
--page-scale  (100cqw - 2 × gutter) / 1685
--hero-scale  min(--page-scale, viewport height / (675 + 336))
```

- **The page always spans the viewport.** `--page-scale` is width-driven and
  the page itself is `margin-inline: 20px`, so the design never leaves bars of
  empty space down either side — at any width the only margin is the gutter
  plus the media's own 10-unit inset from the design.
- **Section one always fits one screen.** The hero is a column: the photograph
  takes `flex: 1` and absorbs whatever height is left once the fixed parts —
  11 above it, 71 below, a 180-tall text block and 74 of closing space, 336 in
  all — have been laid out. So the width and height constraints never fight;
  the page fills the width and the hero fills the height.
- `--hero-scale` only tightens below `--page-scale` when the viewport gets too
  short to hold the hero at full width. `675` is the shortest photograph that
  still keeps the nav, the search panel and the CTA clear of one another, so
  the two together are the least height section one can occupy.
- Because the hero's height is elastic, its overlays are anchored to the edge
  each belongs to: the nav to the top and both side margins, the CTA to the
  bottom centre, the search panel to its own centre at 46% of the media — all
  ratios read off the Figma frame. A `clamp()` on the panel keeps its largest
  state from ever climbing into the nav.

At the design's own proportions (a 1725 × 1073 viewport) `--k` is exactly 1 and
the geometry audit matches the Figma frame on all but one text width. There is
no horizontal overflow at any size, and section one needs no scrolling from
3440 × 1400 down to 1024 × 768. Below that the page scrolls rather than
clipping itself.

`container-type: inline-size` lets the page measure in `cqw`, which excludes
the scrollbar, so the gutters stay honest.

## The hero entrance

Section one has one finite, overlapping entrance sequence lasting about 1.7
seconds. The sunflower video and existing finder cycle remain paused during
that sequence while foreground groups establish the composition in this order:

1. brand and understated navigation;
2. the clipped primary headline;
3. the finder as one coordinated interface composition;
4. the customer proof and call to action.

Movement stays small and shares one custom deceleration curve. The headline is
revealed with clipping, while navigation and supporting content use short
settles and the finder combines a restrained scale with a shallow clip reveal.
The groups overlap rather than waiting for one another to finish.

The entrance classes, timer, listener and compositor hints are removed when
the sequence completes. At that boundary the original ambient hero push,
looping video and measured finder demo begin; none of them run behind or compete
with the entrance.

## Interactions

Only behaviour the design itself represents is implemented, in vanilla JS:

- the panel stays in its settled `results` state during the entrance, then its
  original measured search/suggestion/result cycle begins;
- touching or focusing the panel stops its demo and opens the complete `full`
  state so the controls remain available;
- the search field filters the result rows;
- the country control — which the file shows in both a "Global" and a country
  state — is a keyboard-accessible listbox over the countries in the design,
  and filters the results;
- links and buttons have hover and focus feedback.

`prefers-reduced-motion: reduce` skips both the entrance and the continuing
hero motion, rendering the complete panel and hero content immediately.

## Lower-page choreography

The feature and showcase sections reveal once as they enter the viewport. Each
feature behaves as one product scene: its media establishes the card, then the
title and supporting copy overlap into place. On desktop, paired cards use a
small second-card delay; on mobile, each card waits for its own scroll position.
Inside each feature, the interface assembles once in a content-specific order:
employee rows and compliance chips cascade, while the benefit and search panels
build from their glass shell into their details.

Showcase stories use an editorial sequence: headline first, paired image just
afterward. Observed targets are disconnected after revealing, so nothing
replays when scrolling back. Reduced-motion users receive every section in its
finished state immediately.
