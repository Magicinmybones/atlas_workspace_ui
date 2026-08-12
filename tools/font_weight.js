/* Is the weight the page asks for the weight it gets?
 *
 * Figtree ships as one variable file (wght 300-900) and the page declares it
 * twice, at 400 and at 500. That leaves three possibilities worth telling
 * apart, and only real DOM rendering can: the engine varies the axis properly,
 * it ignores the descriptor and paints the file's 300 default twice, or it
 * fakes the heavier weight by smearing the glyphs.
 *
 * Each sample is rendered as a real element and screenshotted, so
 * `font-synthesis: none` is in force exactly as it is on the page.
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');

const SAMPLE = 'Designer Handbook 1234';

const CASES = [
  ['declared-400', "font-weight:400"],
  ['declared-500', "font-weight:500"],
  ['axis-300', "font-weight:400;font-variation-settings:'wght' 300"],
  ['axis-400', "font-weight:400;font-variation-settings:'wght' 400"],
  ['axis-500', "font-weight:400;font-variation-settings:'wght' 500"],
  ['axis-600', "font-weight:400;font-variation-settings:'wght' 600"],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await page.evaluate(({ sample, cases }) => {
    const host = document.createElement('div');
    host.id = 'probe';
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;padding:20px;';
    host.innerHTML = cases.map(([id, css]) =>
      `<div id="p-${id}" style="font-family:Figtree;font-size:60px;line-height:1.4;` +
      `letter-spacing:-0.02em;color:#000;white-space:pre;${css}">${sample}</div>`).join('');
    document.body.appendChild(host);
  }, { sample: SAMPLE, cases: CASES });

  const out = {};
  for (const [id] of CASES) {
    const el = await page.$(`#p-${id}`);
    const box = await el.boundingBox();
    const buf = await el.screenshot();
    out[id] = { width: Math.round(box.width * 100) / 100, png: buf };
  }

  // ink coverage straight off the rendered pixels
  const ink = await page.evaluate(async (ids) => {
    const res = {};
    for (const id of ids) {
      const el = document.getElementById('p-' + id);
      const r = el.getBoundingClientRect();
      res[id] = { w: Math.round(r.width * 100) / 100 };
    }
    return res;
  }, CASES.map(c => c[0]));

  // count dark pixels per sample from the screenshots
  fs.mkdirSync('weightshots', { recursive: true });
  for (const [id] of CASES) fs.writeFileSync(`weightshots/${id}.png`, out[id].png);

  console.log('sample:', JSON.stringify(SAMPLE));
  console.log('%s', 'case            advance width');
  for (const [id] of CASES) console.log(id.padEnd(16), out[id].width);
  fs.writeFileSync('font_weight.json', JSON.stringify(
    Object.fromEntries(CASES.map(([id]) => [id, out[id].width])), null, 1));
  await browser.close();
})();
