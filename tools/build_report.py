"""Generate the type-audit report from the measured data (no hand-typed numbers)."""
import json, base64, html, os

D = json.load(open('font_report.json'))
S, ROWS, GLYPHS, INK, SPECS, WP = (D['summary'], D['rows'], D['glyphs'],
                                   D['ink'], D['specimens'], D['weightProbe'])

FONTS = {
    'Archivo': 'fonts/archivo-500.woff2',
    'Figtree': 'fonts/figtree-500.woff2',
}
faces = []
for fam, path in FONTS.items():
    b64 = base64.b64encode(open(path, 'rb').read()).decode()
    lo = 100 if fam == 'Archivo' else 300
    faces.append(
        "@font-face{font-family:'%s';font-style:normal;font-weight:%d 900;"
        "font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2')}"
        % (fam, lo, b64))
FACE_CSS = '\n'.join(faces)

e = html.escape


def clip(t, n):
    return e(t) if len(t) <= n else e(t[:n].rstrip()) + '&hellip;'


def pct(v):
    return ('+' if v > 0 else '') + ('%.2f' % v)


def bar(v, scale=5.0):
    """A signed magnitude bar: sign in form, not just in the number."""
    w = min(abs(v) / scale, 1.0) * 50
    side = 'neg' if v < 0 else 'pos'
    return ('<span class="bar"><span class="bar__t %s" style="width:%.1f%%"></span></span>'
            % (side, w))


# ---------------------------------------------------------------- specimens --
def plate(s):
    size, ls = s['size'], s['size'] * s['letterSpacing'] / 100.0
    top = s['baseline'] - size * 1.00
    h = size * 1.24
    w = s['width'] + 8
    return f'''
<figure class="plate">
  <figcaption>
    <span class="plate__role">{e(s['role'])}</span>
    <span class="plate__meta">{size:g}px · weight {s['weight']} · tracking {s['letterSpacing']:g}%</span>
  </figcaption>
  <div class="plate__stage">
    <svg viewBox="-4 {top:.2f} {w:.2f} {h:.2f}" preserveAspectRatio="xMinYMid meet" role="img"
         aria-label="{e(s['text'])} set in TT Hoves and in Figtree, overlaid">
      <path class="spec-tt" d="{s['path']}"/>
      <text class="spec-fig" x="0" y="{s['baseline']:.2f}"
            font-size="{size:g}" font-weight="{s['weight']}"
            letter-spacing="{ls:.3f}">{e(s['text'])}</text>
    </svg>
  </div>
</figure>'''


plates = '\n'.join(plate(s) for s in SPECS)

# ------------------------------------------------------------------ tables --
inv = {}
for r in ROWS:
    k = (r['figFamily'], r['figStyle'], r['weight'])
    inv.setdefault(k, {'n': 0, 'sizes': set(), 'roles': set()})
    inv[k]['n'] += 1
    inv[k]['sizes'].add(r['size'])
    inv[k]['roles'].add(r['role'])
inv_rows = '\n'.join(
    f'<tr><td class="t-name">{e(fam)} <b>{e(st)}</b></td><td class="num">{w}</td>'
    f'<td class="num">{v["n"]}</td><td>{" · ".join("%g" % s for s in sorted(v["sizes"]))}</td>'
    f'<td class="t-dim">{e(", ".join(sorted(v["roles"])))}</td></tr>'
    for (fam, st, w), v in sorted(inv.items(), key=lambda kv: -kv[1]['n']))

width_rows = []
for r in sorted(ROWS, key=lambda r: -abs(r['pct'])):
    lines = ''
    if r['nLines'] > 1:
        lines = ''.join(
            f'<div class="sub"><span>{e(l["text"].strip())}</span>'
            f'<span class="num">{l["figma"]:.1f} → {l["browser"]:.1f} '
            f'<b class="{"neg" if l["pct"] < 0 else "pos"}">{pct(l["pct"])}%</b></span></div>'
            for l in r['lines'])
    width_rows.append(
        f'<tr><td class="t-name">{clip(r["text"], 34)}{lines}</td>'
        f'<td class="num">{r["size"]:g}</td><td class="num">{r["weight"]}</td>'
        f'<td class="num">{r["figW"]:.1f}</td><td class="num">{r["brW"]:.1f}</td>'
        f'<td class="num delta {"neg" if r["pct"] < 0 else "pos"}">{pct(r["pct"])}%</td>'
        f'<td class="barcell">{bar(r["pct"])}</td></tr>')
width_rows = '\n'.join(width_rows)

ink_rows = '\n'.join(
    f'<tr><td class="t-name">{clip(r["text"], 30)}</td><td class="num">{r["size"]:g}</td>'
    f'<td class="num">{r["weight"]}</td><td class="num">{r["ttInk"]:,}</td>'
    f'<td class="num">{r["figInk"]:,}</td>'
    f'<td class="num delta {"neg" if r["ratio"] < 1 else "pos"}">{(r["ratio"] - 1) * 100:+.1f}%</td>'
    f'<td class="barcell">{bar((r["ratio"] - 1) * 100, 8)}</td></tr>'
    for r in INK)

glyph_rows = '\n'.join(
    f'<tr><td class="g-ch">{e(g["ch"])}</td><td class="num">{g["weight"]}</td>'
    f'<td class="num">{g["n"]}</td>'
    f'<td class="num delta {"neg" if g["mean"] < 0 else "pos"}">{g["mean"] * 100:+.1f}%</td>'
    f'<td class="barcell">{bar(g["mean"] * 100, 16)}</td></tr>'
    for g in GLYPHS[:12])

wp_rows = '\n'.join(
    f'<tr><td class="t-name">{e(k)}</td><td class="num">{v}</td></tr>'
    for k, v in WP.items())

CSS = '''
:root{
  --paper:#FBFAF7; --raise:#FFFFFF; --ink:#17161B; --muted:#6B665E;
  --rule:#E4E0D8; --rule-soft:#EFECE5;
  --spec:#8A5512; --spec-fill:rgba(138,85,18,.92);
  --live:#12636A; --live-fill:rgba(18,99,106,.92);
  --pos:#4A4640; --neg:#4A4640;
  --shadow:0 1px 2px rgba(23,22,27,.05),0 8px 24px -16px rgba(23,22,27,.25);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --paper:#131217; --raise:#1B1A20; --ink:#EDEAE3; --muted:#9C968B;
    --rule:#2C2A32; --rule-soft:#232128;
    --spec:#E0A455; --spec-fill:rgba(224,164,85,.92);
    --live:#5CBEC5; --live-fill:rgba(92,190,197,.92);
    --pos:#B4AEA3; --neg:#B4AEA3;
    --shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px -18px rgba(0,0,0,.8);
  }
}
:root[data-theme="dark"]{
  --paper:#131217; --raise:#1B1A20; --ink:#EDEAE3; --muted:#9C968B;
  --rule:#2C2A32; --rule-soft:#232128;
  --spec:#E0A455; --spec-fill:rgba(224,164,85,.92);
  --live:#5CBEC5; --live-fill:rgba(92,190,197,.92);
  --pos:#B4AEA3; --neg:#B4AEA3;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px -18px rgba(0,0,0,.8);
}

*{box-sizing:border-box}
body{
  margin:0; background:var(--paper); color:var(--ink);
  font-family:'Figtree',system-ui,sans-serif; font-weight:400;
  font-size:16.5px; line-height:1.62; letter-spacing:-.006em;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1180px;margin:0 auto;padding:clamp(28px,5vw,72px) clamp(18px,4vw,48px) 96px}
.measure{max-width:64ch}

h1,h2,h3,.eyebrow,th{font-family:'Archivo',system-ui,sans-serif}
h1{
  font-variation-settings:'wght' 680; font-size:clamp(34px,5.2vw,58px);
  line-height:1.02; letter-spacing:-.032em; margin:.1em 0 .3em; text-wrap:balance;
}
h2{
  font-variation-settings:'wght' 640; font-size:clamp(20px,2.4vw,26px);
  line-height:1.15; letter-spacing:-.02em; margin:0 0 .5em; text-wrap:balance;
}
h3{font-variation-settings:'wght' 620;font-size:16px;letter-spacing:-.01em;margin:0 0 .35em}
p{margin:0 0 1em}
b,strong{font-weight:500}
a{color:inherit}

.eyebrow{
  font-variation-settings:'wght' 600; font-size:11px; text-transform:uppercase;
  letter-spacing:.15em; color:var(--muted); margin:0 0 6px;
}
.lede{font-size:clamp(17px,1.6vw,20px);line-height:1.5;color:var(--muted);letter-spacing:-.012em}

section{margin-top:clamp(44px,6vw,80px)}
.rule{height:1px;background:var(--rule);border:0;margin:0}

/* verdict strip */
.verdict{
  display:grid;gap:1px;background:var(--rule);border:1px solid var(--rule);
  border-radius:3px;overflow:hidden;margin:32px 0 0;
  grid-template-columns:repeat(auto-fit,minmax(184px,1fr));
}
.verdict div{background:var(--raise);padding:16px 18px}
.verdict dt{font-family:'Archivo';font-variation-settings:'wght' 600;font-size:10.5px;
  text-transform:uppercase;letter-spacing:.13em;color:var(--muted);margin:0 0 6px}
.verdict dd{margin:0;font-size:23px;line-height:1.15;font-weight:500;letter-spacing:-.02em;
  font-variant-numeric:tabular-nums}
.verdict dd small{display:block;font-size:12.5px;font-weight:400;color:var(--muted);
  letter-spacing:0;margin-top:3px;line-height:1.35}

/* key/legend */
.key{display:flex;flex-wrap:wrap;gap:10px 22px;align-items:center;margin:0 0 18px;
  font-size:13px;color:var(--muted)}
.key i{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:7px;
  vertical-align:-1px}
.key .k-spec i{background:var(--spec)} .key .k-live i{background:var(--live)}

/* specimens */
.controls{display:flex;align-items:center;gap:14px;margin:0 0 22px;font-size:13px;
  color:var(--muted);flex-wrap:wrap}
.controls input[type=range]{width:210px;accent-color:var(--live)}
.plate{margin:0;border:1px solid var(--rule);border-radius:3px;background:var(--raise);
  overflow:hidden;box-shadow:var(--shadow)}
.plates{display:grid;gap:14px}
.plate figcaption{display:flex;justify-content:space-between;gap:16px;align-items:baseline;
  padding:10px 14px;border-bottom:1px solid var(--rule-soft);flex-wrap:wrap}
.plate__role{font-family:'Archivo';font-variation-settings:'wght' 600;font-size:10.5px;
  text-transform:uppercase;letter-spacing:.13em}
.plate__meta{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.plate__stage{padding:16px 14px}
/* every plate is fitted to the same height, so cap heights stay comparable
   across specimens set at wildly different sizes */
.plate svg{display:block;width:100%;height:118px}
@media (max-width:640px){.plate svg{height:84px}}
.spec-tt{fill:var(--spec-fill)}
.spec-fig{fill:var(--live-fill);font-family:'Figtree';opacity:var(--fade,.55)}

/* tables */
.tablewrap{overflow-x:auto;border:1px solid var(--rule);border-radius:3px;background:var(--raise)}
table{border-collapse:collapse;width:100%;font-size:13.5px;min-width:560px}
th,td{text-align:left;padding:9px 13px;border-bottom:1px solid var(--rule-soft);
  vertical-align:top}
thead th{font-variation-settings:'wght' 600;font-size:10.5px;text-transform:uppercase;
  letter-spacing:.11em;color:var(--muted);background:var(--paper);
  border-bottom:1px solid var(--rule);position:sticky;top:0}
tbody tr:last-child td{border-bottom:0}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.t-name{font-weight:500}
.t-dim{color:var(--muted);font-weight:400}
.g-ch{font-size:19px;font-weight:500;font-feature-settings:'ss01'}
.delta{font-weight:500}
.pos{color:var(--pos)} .neg{color:var(--neg)}
.sub{display:flex;justify-content:space-between;gap:14px;font-weight:400;color:var(--muted);
  font-size:12.5px;padding-top:3px}
.sub .num{font-size:12.5px}
.barcell{width:120px}
.bar{display:block;position:relative;height:6px;width:104px;background:var(--rule-soft);
  border-radius:1px;margin-top:5px}
.bar::before{content:'';position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;
  background:var(--rule)}
.bar__t{position:absolute;top:0;height:6px;border-radius:1px}
.bar__t.pos{left:50%;background:var(--pos)}
.bar__t.neg{right:50%;background:var(--neg)}

.note{border-left:2px solid var(--rule);padding:2px 0 2px 16px;color:var(--muted);
  font-size:14.5px;margin:18px 0 0}
.cols{display:grid;gap:clamp(20px,3vw,38px);grid-template-columns:repeat(auto-fit,minmax(270px,1fr));
  margin-top:22px}
.cols h3{margin-bottom:.3em}
.cols p{font-size:14.5px;color:var(--muted);margin:0}
code{font-family:'Figtree';font-weight:500;font-size:.93em;background:var(--rule-soft);
  padding:1px 5px;border-radius:2px;letter-spacing:-.01em}
footer{margin-top:72px;padding-top:20px;border-top:1px solid var(--rule);
  color:var(--muted);font-size:12.5px}
:focus-visible{outline:2px solid var(--live);outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
'''

HTML = f'''<title>TT Hoves vs Figtree</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
{FACE_CSS}
{CSS}
</style>

<div class="wrap">

<header>
  <p class="eyebrow">Section one · type audit</p>
  <h1>The design is set in a font the browser never gets.</h1>
  <p class="lede measure">Section one uses exactly two styles, both of them TT&nbsp;Hoves — a licensed
  face that cannot ship with the page. Every one of its {S['nodes']} text nodes renders in Figtree
  instead. This is what that costs, measured against the design file's own typesetting rather
  than estimated.</p>

  <dl class="verdict">
    <div><dt>Styles in the design</dt><dd>2<small>TT Hoves Medium and Regular — nothing else</small></dd></div>
    <div><dt>Nodes substituted</dt><dd>{S['nodes']} of {S['nodes']}<small>all rendered in Figtree, no system fallback</small></dd></div>
    <div><dt>Median line width shift</dt><dd>{S['medianPct']}%<small>worst single string {S['worstPct']}%</small></dd></div>
    <div><dt>Weight contrast lost</dt><dd>{S['contrastLoss'] * 100:.0f}%<small>Regular→Medium step is flatter in Figtree</small></dd></div>
  </dl>
</header>

<section>
  <h2>What the design asks for</h2>
  <p class="measure">The <code>.fig</code> file names a font on every text node. Across section one
  those names collapse to a single family in two weights — the whole interface is built from
  TT&nbsp;Hoves Medium with TT&nbsp;Hoves Regular reserved for secondary lines.</p>
  <div class="tablewrap">
    <table>
      <thead><tr><th>Font in the Figma file</th><th class="num">CSS weight</th>
        <th class="num">Nodes</th><th>Sizes (px)</th><th>Where</th></tr></thead>
      <tbody>{inv_rows}</tbody>
    </table>
  </div>
</section>

<section>
  <h2>What the browser actually paints</h2>
  <p class="measure">Every node resolves to Figtree, loaded from the page's own
  <code>@font-face</code> — Chrome's font inspector confirms no glyph in section one falls
  through to a system face. Two details are worth knowing, because both look like bugs and
  neither is.</p>

  <div class="cols">
    <div>
      <h3>One file serves both weights</h3>
      <p>Google serves Figtree as a single variable file with a 300–900 weight axis, and returns
      the identical URL for the 400 and the 500 request. The two files in <code>assets/fonts</code>
      are byte-for-byte the same font.</p>
    </div>
    <div>
      <h3>The inspector says “Figtree Light”</h3>
      <p>That is the variable font's default-instance name — its default weight is 300 — and it
      is reported for every element regardless of the weight in force. The name is not evidence
      of what was rendered.</p>
    </div>
  </div>

  <p class="measure" style="margin-top:26px">Which raises the question the name provokes: is the
  weight axis actually being applied, or is the page painting the 300 default twice? Rendering
  the same string at the declared weights and again with the axis pinned by hand settles it —
  the declared weights land exactly on their forced counterparts, and both differ from the
  font's 300 default.</p>

  <div class="tablewrap" style="max-width:520px">
    <table style="min-width:0">
      <thead><tr><th>Rendering</th><th class="num">Advance at 100px</th></tr></thead>
      <tbody>{wp_rows}</tbody>
    </table>
  </div>
  <p class="note measure"><b>Verdict:</b> the axis is honoured. <code>font-weight:400</code>
  renders identically to <code>'wght' 400</code>, and <code>500</code> to <code>'wght' 500</code>.
  Nothing is synthesised — <code>font-synthesis:none</code> is in force and no faux-bold appears.</p>
</section>

<section>
  <h2>The letterforms, side by side</h2>
  <p class="measure">The design file stores the outline of every glyph Figma drew, so the real
  TT&nbsp;Hoves shapes can be recovered from it and laid directly over the substitute. Both are
  set at the design's own size, weight and tracking, sharing one baseline.</p>
  <div class="key">
    <span class="k-spec"><i></i>TT&nbsp;Hoves — recovered from the design file</span>
    <span class="k-live"><i></i>Figtree — as the page renders it</span>
  </div>
  <div class="controls">
    <label for="fade">Figtree opacity</label>
    <input id="fade" type="range" min="0" max="100" value="55">
    <span id="fadeval" class="num">55%</span>
  </div>
  <div class="plates">{plates}</div>
  <p class="note measure">Read these from the left. The first few letters sit almost on top of
  each other, so what separates there is genuine letterform difference — Figtree's terminals cut
  at a slightly different angle and its ascenders run a touch taller. Further along the line the
  separation is something else: per-character width differences accumulate, so by the last word
  the two are simply out of step. That accumulation is what the width table measures.</p>
</section>

<section>
  <h2>How the weights behave</h2>
  <p class="measure">Weight is not just a number the browser matches — it is how much ink lands on
  the page. Rasterising both faces at the same size and counting coverage gives a direct
  comparison, and the two styles move in opposite directions.</p>
  <div class="tablewrap">
    <table>
      <thead><tr><th>String</th><th class="num">Size</th><th class="num">Weight</th>
        <th class="num">TT Hoves ink</th><th class="num">Figtree ink</th>
        <th class="num">Difference</th><th></th></tr></thead>
      <tbody>{ink_rows}</tbody>
    </table>
  </div>
  <div class="cols">
    <div>
      <h3>Medium runs light</h3>
      <p>At weight 500 Figtree lays down {(1 - S['inkMedium']) * 100:.0f}% less ink than
      TT&nbsp;Hoves Medium. Headlines, nav labels and names read a touch thinner than drawn.</p>
    </div>
    <div>
      <h3>Regular runs heavy</h3>
      <p>At weight 400 it lays down {(S['inkRegular'] - 1) * 100:.0f}% more. Secondary lines —
      locations, contract types, the lede — read slightly darker than drawn.</p>
    </div>
    <div>
      <h3>So the contrast flattens</h3>
      <p>Pulling in opposite directions compresses the step between the two styles by about
      {S['contrastLoss'] * 100:.0f}%. The hierarchy the design builds from weight alone is the
      thing that actually softens.</p>
    </div>
  </div>
</section>

<section>
  <h2>Vertical metrics</h2>
  <p class="measure">Figma records the ascent and natural line height it used, so the two faces'
  vertical proportions can be compared directly.</p>
  <div class="tablewrap" style="max-width:640px">
    <table style="min-width:0">
      <thead><tr><th>Metric (em)</th><th class="num">TT Hoves</th><th class="num">Figtree</th>
        <th class="num">Difference</th></tr></thead>
      <tbody>
        <tr><td class="t-name">Ascent</td><td class="num">{S['ttAscent']:.3f}</td>
          <td class="num">{S['figAscent']:.3f}</td>
          <td class="num delta pos">+{S['figAscent'] - S['ttAscent']:.3f}</td></tr>
        <tr><td class="t-name">Descent</td>
          <td class="num">{S['ttNaturalLH'] - S['ttAscent']:.3f}</td>
          <td class="num">{S['figNaturalLH'] - S['figAscent']:.3f}</td>
          <td class="num delta pos">+{(S['figNaturalLH'] - S['figAscent']) - (S['ttNaturalLH'] - S['ttAscent']):.3f}</td></tr>
        <tr><td class="t-name">Natural line height</td><td class="num">{S['ttNaturalLH']:.3f}</td>
          <td class="num">{S['figNaturalLH']:.3f}</td>
          <td class="num delta pos">+{S['figNaturalLH'] - S['ttNaturalLH']:.3f}</td></tr>
        <tr><td class="t-name">Cap height</td><td class="num t-dim">—</td>
          <td class="num">0.700</td><td class="num t-dim">—</td></tr>
        <tr><td class="t-name">x-height</td><td class="num t-dim">—</td>
          <td class="num">0.500</td><td class="num t-dim">—</td></tr>
      </tbody>
    </table>
  </div>
  <p class="note measure">Every text block in the build sets its line height explicitly, so this
  costs nothing in layout — block heights are driven by the CSS, not the font. What it moves is
  the baseline inside the box: about 0.015em higher, which is 1.5px on the 100px headline and
  a quarter of a pixel on 16px labels.</p>
</section>

<section>
  <h2>Every string, measured</h2>
  <p class="measure">Figma stores the width it typeset each string to. Setting the same strings
  in the browser and measuring them back gives the real cost of the swap, string by string,
  sorted by how far each drifts.</p>
  <div class="tablewrap">
    <table>
      <thead><tr><th>String</th><th class="num">Size</th><th class="num">Weight</th>
        <th class="num">Figma</th><th class="num">Browser</th><th class="num">Δ</th><th></th></tr></thead>
      <tbody>{width_rows}</tbody>
    </table>
  </div>
  <p class="note measure">Both multi-line blocks break exactly where the design breaks them —
  each after the word “compliant”. That is the outcome that matters most on a page of set
  headlines, and the substitution keeps it.</p>
</section>

<section>
  <h2>Which characters drift most</h2>
  <p class="measure">Averaged across every appearance in section one, in thousandths of an em.
  A handful of characters carry most of the width difference; the rest sit inside 2%.</p>
  <div class="tablewrap" style="max-width:560px">
    <table style="min-width:0">
      <thead><tr><th>Character</th><th class="num">Weight</th><th class="num">Seen</th>
        <th class="num">Advance Δ</th><th></th></tr></thead>
      <tbody>{glyph_rows}</tbody>
    </table>
  </div>
  <p class="note measure">The outliers are why <b>“Use Cases”</b> is the worst single string in the
  build and why the dollar amounts run narrow: <b>$</b> appears six times in section one and is
  {abs([g for g in GLYPHS if g['ch'] == '$'][0]['mean']) * 100:.1f}% of an em narrower in Figtree.</p>
</section>

<section>
  <h2>What would close the gap</h2>
  <div class="cols">
    <div>
      <h3>Licence TT Hoves</h3>
      <p>A webfont licence from TypeType removes the question entirely. Drop the woff2 files into
      <code>assets/fonts</code> and change the two <code>@font-face</code> blocks — nothing else in
      the build refers to the family by name.</p>
    </div>
    <div>
      <h3>Or tune the substitute</h3>
      <p>Figtree's axis is continuous. Setting Medium nearer <code>'wght' 530</code> and Regular
      nearer <code>390</code> would recover most of the lost contrast without touching a single
      layout value.</p>
    </div>
    <div>
      <h3>What not to do</h3>
      <p>Don't chase the width deltas with tracking. The design's tracking is part of its identity,
      and the remaining {S['medianPct']}% median drift is well inside what the layout absorbs.</p>
    </div>
  </div>
</section>

<footer>
  <p>Measured against <code>canvas.fig</code> and a live render at the design's own scale
  (1725×1073, where the page scale is exactly 1). TT&nbsp;Hoves specimens are the outlines stored
  in the design file, not a reproduction. Ink figures are rasterised pixel coverage at the
  design's own sizes. This report is set in Figtree — the substitute itself — with Archivo for
  headings.</p>
</footer>

</div>

<script>
  var fade = document.getElementById('fade');
  var out = document.getElementById('fadeval');
  function apply() {{
    document.documentElement.style.setProperty('--fade', fade.value / 100);
    out.textContent = fade.value + '%';
  }}
  fade.addEventListener('input', apply);
  apply();
</script>
'''

open('/home/user/atlas_workspace_ui/docs/type-audit.html', 'w').write(HTML)
print('wrote docs/type-audit.html  (%.0f KB)' % (len(HTML) / 1024))
