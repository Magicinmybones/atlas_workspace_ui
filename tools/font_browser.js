/* Browser side of the font audit.
 *
 * For every section-one text node this records what the page asked for, what
 * the engine actually resolved (via CDP, which reports the real platform font
 * per element), and how the resulting typesetting measures against Figma's own
 * layout of the same string.
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');

const FIGMA = JSON.parse(fs.readFileSync('font_figma.json', 'utf8'));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1725, height: 1073 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');

  await page.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () => document.getElementById('finder').dataset.state === 'results',
    null, { timeout: 15000 });
  await page.waitForTimeout(1700);

  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });

  const out = [];
  for (const spec of FIGMA) {
    const computed = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        family: cs.fontFamily,
        weight: cs.fontWeight,
        style: cs.fontStyle,
        size: parseFloat(cs.fontSize),
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        transform: cs.textTransform,
        synthesis: cs.fontSynthesis || cs.fontSynthesisWeight || '',
        variationSettings: cs.fontVariationSettings,
        boxW: r.width,
        boxH: r.height,
      };
    }, spec.selector);
    if (!computed) { out.push({ ...spec, error: 'element not found' }); continue; }

    // the font the engine actually used to paint this element
    let platform = [];
    try {
      const { nodeId } = await cdp.send('DOM.querySelector', {
        nodeId: root.nodeId, selector: spec.selector,
      });
      if (nodeId) {
        const res = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
        platform = res.fonts || [];
      }
    } catch (e) { platform = [{ familyName: 'unavailable: ' + e.message }]; }

    // typeset the same string with the same font and read it back
    const measured = await page.evaluate(({ text, size, weight, family }) => {
      const c = document.createElement('canvas').getContext('2d');
      c.font = `${weight} ${size}px ${family}`;
      const per = [...text].map(ch => ({ ch, adv: c.measureText(ch).width / size }));
      const m = c.measureText(text);
      return {
        advance: m.width,
        perGlyph: per,
        ascent: m.fontBoundingBoxAscent,
        descent: m.fontBoundingBoxDescent,
        actualAscent: m.actualBoundingBoxAscent,
      };
    }, { text: spec.text, size: computed.size, weight: computed.weight, family: computed.family });

    out.push({ ...spec, browser: computed, platform, measured });
  }

  /* ---- does the engine really vary the weight axis? -------------------- */
  const weightProbe = await page.evaluate(() => {
    const sample = 'Designer';
    const c = document.createElement('canvas').getContext('2d');
    const widthAt = (w) => { c.font = `${w} 100px Figtree`; return c.measureText(sample).width; };

    // ink coverage: rasterise and count non-transparent pixels
    const ink = (css) => {
      const cv = document.createElement('canvas');
      cv.width = 900; cv.height = 200;
      const x = cv.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 900, 200);
      x.fillStyle = '#000';
      x.font = css; x.textBaseline = 'alphabetic';
      x.fillText(sample, 10, 150);
      const d = x.getImageData(0, 0, 900, 200).data;
      let dark = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 128) dark++;
      return dark;
    };

    return {
      widths: { w300: widthAt(300), w400: widthAt(400), w500: widthAt(500), w700: widthAt(700) },
      ink: {
        w400: ink('400 100px Figtree'),
        w500: ink('500 100px Figtree'),
        w700: ink('700 100px Figtree'),
      },
      faces: [...document.fonts].map(f => ({
        family: f.family, weight: f.weight, style: f.style, status: f.status,
      })),
    };
  });

  fs.writeFileSync('font_browser.json', JSON.stringify({ nodes: out, weightProbe }, null, 1));
  console.log('nodes audited:', out.length);
  console.log('loaded faces :', JSON.stringify(weightProbe.faces));
  console.log('advance of "Designer" at 100px:', JSON.stringify(weightProbe.widths));
  console.log('ink pixels   :', JSON.stringify(weightProbe.ink));
  await browser.close();
})();
