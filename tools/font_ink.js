/* Rasterise the same string twice — once from the TT Hoves outlines the design
 * file carries, once from the Figtree face the page actually loads — and
 * measure them against each other: how much ink each lays down, how tall the
 * capitals and lowercase run, and where the line breaks fall. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');

const SPECS = JSON.parse(fs.readFileSync('font_specimens.json', 'utf8'));
const FIGMA = JSON.parse(fs.readFileSync('font_figma.json', 'utf8'));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1725, height: 1073 } });
  await page.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const result = await page.evaluate(({ specs, figma }) => {
    const PAD = 40;

    /** ink + vertical extent of a rendered raster */
    function analyse(draw, w, h) {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const c = cv.getContext('2d');
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#000';
      draw(c);
      const d = c.getImageData(0, 0, w, h).data;
      let ink = 0, top = h, bottom = -1, left = w, right = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const a = 255 - d[(y * w + x) * 4];      // darkness 0..255
          if (a > 8) {
            ink += a / 255;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
      }
      return { ink: Math.round(ink), top, bottom, left, right };
    }

    const out = [];
    for (const s of specs) {
      const w = Math.ceil(s.width) + PAD * 2;
      const h = Math.ceil(s.size * 1.6) + PAD * 2;
      const baseline = PAD + s.size;

      // (a) TT Hoves, straight from the design file's own outlines
      const tt = analyse((c) => {
        c.save();
        c.translate(PAD, baseline - s.baseline);
        c.fill(new Path2D(s.path));
        c.restore();
      }, w, h);

      // (b) Figtree, as the page loads it
      const fig = analyse((c) => {
        c.font = `${s.weight} ${s.size}px Figtree`;
        c.textBaseline = 'alphabetic';
        c.letterSpacing = (s.size * s.letterSpacing / 100) + 'px';
        c.fillText(s.text, PAD, baseline);
      }, w, h);

      out.push({
        role: s.role, text: s.text, size: s.size, weight: s.weight,
        tt, fig,
        inkRatio: fig.ink / tt.ink,
        ttHeight: tt.bottom - tt.top, figHeight: fig.bottom - fig.top,
        ttWidth: tt.right - tt.left, figWidth: fig.right - fig.left,
      });
    }

    /* cap height and x-height, measured off single letters */
    function extent(draw, size) {
      const w = Math.ceil(size * 2) + 40, h = Math.ceil(size * 2.4) + 40;
      const a = analyse(draw, w, h);
      return a.bottom - a.top + 1;
    }
    const probe = {};
    for (const [glyph, label] of [['H', 'cap'], ['x', 'xheight'], ['o', 'round']]) {
      for (const wt of [400, 500]) {
        probe[label + wt] = extent((c) => {
          c.font = `${wt} 200px Figtree`; c.textBaseline = 'alphabetic';
          c.fillText(glyph, 20, 240);
        }, 200);
      }
    }

    /* where the two multi-line strings break, and how wide each line is */
    const lines = {};
    for (const sel of ['.hero__title', '.hero__lede']) {
      const el = document.querySelector(sel);
      const r = document.createRange();
      r.selectNodeContents(el);
      const rects = [...r.getClientRects()].map(x => Math.round(x.width * 100) / 100);
      lines[sel] = rects;
    }

    /* what Figma laid those same strings out as */
    const figmaLines = {};
    for (const f of figma) {
      if (f.lines > 1) figmaLines[f.selector] = f.text;
    }

    return { out, probe, lines, figmaLines };
  }, { specs: SPECS, figma: FIGMA });

  fs.writeFileSync('font_ink.json', JSON.stringify(result, null, 1));

  console.log('%-14s %-24s %5s %4s %8s %8s %7s   %6s %6s',
    'role', 'text', 'size', 'wt', 'TT ink', 'Fig ink', 'ratio', 'TT h', 'Fig h');
  for (const r of result.out) {
    console.log('%-14s %-24s %5.5s %4d %8d %8d %6.3f    %5d %6d',
      r.role, r.text.slice(0, 24), r.size, r.weight, r.tt.ink, r.fig.ink,
      r.inkRatio, r.ttHeight, r.figHeight);
  }
  console.log('\nFigtree vertical probe (200px em):', JSON.stringify(result.probe));
  console.log('rendered line widths:', JSON.stringify(result.lines));
  await browser.close();
})();
