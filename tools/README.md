# Type audit tooling

Regenerates `docs/type-audit.html` — the comparison between the fonts the
Figma file specifies for section one and the fonts the browser actually
renders. Nothing in the report is typed by hand; every figure comes from
these scripts.

Run in order, from a directory holding `doc.json` (the decoded `canvas.fig`)
and `fonts/` (the candidate woff2 files), with the site served locally:

| | |
| --- | --- |
| `font_figma.py` | pulls each section-one text node's font, size, tracking and Figma's own typesetting of it |
| `font_specimens.py` | recovers the real TT Hoves glyph outlines the design file stores |
| `font_browser.js` | reads the computed style and the platform font per element (via CDP) and measures the same strings |
| `font_ink.js` | rasterises both faces and counts ink coverage, cap height and line breaks |
| `font_weight.js` | proves whether the variable weight axis is applied or synthesised |
| `font_report_data.py` | consolidates everything into `font_report.json` |
| `build_report.py` | writes `docs/type-audit.html` |
