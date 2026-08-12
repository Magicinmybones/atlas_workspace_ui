"""Extract the typography of every section-one text node from the Figma file.

`derivedTextData` is Figma's own layout of each string, produced with the real
TT Hoves: per-glyph advances in em units, the baseline position, and the font's
natural line height and ascent. That is the ground truth this audit measures
the browser against.
"""
import json

doc = json.load(open('doc.json'))
NODES = {'%d:%d' % (n['guid']['sessionID'], n['guid']['localID']): n
         for n in doc['nodeChanges']}

# Figma node -> the element in the built page that reproduces it.
# The two credit labels on the artboard ("case ui/ux", "kris anfalova") are
# presentation furniture, not part of the website, so they are not listed.
SECTION_ONE = [
    ('2:26',  'brand',        '.brand__name'),
    ('2:35',  'nav item',     '.nav__link:nth-child(1)'),
    ('2:37',  'nav item',     '.nav__link:nth-child(2)'),
    ('2:39',  'nav item',     '.nav__link:nth-child(3)'),
    ('2:41',  'nav item',     '.nav__link:nth-child(4)'),
    ('2:43',  'nav button',   '.nav__cta'),
    ('2:63',  'search field', '#demo-hint'),
    ('2:71',  'country',      '.country__label'),
    ('2:75',  'role',         '.role:nth-child(1)'),
    ('2:78',  'role',         '.role:nth-child(2)'),
    ('2:81',  'role',         '.role:nth-child(3)'),
    ('2:89',  'result name',  '.expert:nth-child(1) .expert__name'),
    ('2:90',  'result meta',  '.expert:nth-child(1) .expert__meta'),
    ('2:92',  'result rate',  '.expert:nth-child(1) .expert__rate'),
    ('2:93',  'result type',  '.expert:nth-child(1) .expert__type'),
    ('2:100', 'result name',  '.expert:nth-child(2) .expert__name'),
    ('2:101', 'result meta',  '.expert:nth-child(2) .expert__meta'),
    ('2:103', 'result rate',  '.expert:nth-child(2) .expert__rate'),
    ('2:104', 'result type',  '.expert:nth-child(2) .expert__type'),
    ('2:111', 'result name',  '.expert:nth-child(3) .expert__name'),
    ('2:112', 'result meta',  '.expert:nth-child(3) .expert__meta'),
    ('2:114', 'result rate',  '.expert:nth-child(3) .expert__rate'),
    ('2:115', 'result type',  '.expert:nth-child(3) .expert__type'),
    ('2:117', 'result count', '.finder__count'),
    ('2:48',  'cta',          '.cta__label'),
    ('2:44',  'headline',     '.hero__title'),
    ('2:45',  'lede',         '.hero__lede'),
]

CSS_WEIGHT = {'Regular': 400, 'Medium': 500}


def spec(nid, role, selector):
    n = NODES[nid]
    td, dtd = n['textData'], n['derivedTextData']
    font = n['fontName']
    lh, ls = n['lineHeight'], n['letterSpacing']
    base = dtd['baselines'][0]
    return {
        'id': nid,
        'role': role,
        'selector': selector,
        'text': td['characters'],
        'family': font['family'],
        'style': font['style'],
        'postscript': font.get('postscript'),
        'cssWeight': CSS_WEIGHT.get(font['style']),
        'size': round(n['fontSize'], 3),
        'lineHeight': {'value': round(lh['value'], 4), 'units': lh['units']},
        'letterSpacing': {'value': round(ls['value'], 4), 'units': ls['units']},
        'case': n.get('textCase'),
        'autoResize': n.get('textAutoResize'),
        'boxW': round(n['size']['x'], 3),
        'boxH': round(n['size']['y'], 3),
        # Figma's own typesetting, produced with the real TT Hoves
        'layoutW': round(base['width'], 3),
        'baselineY': round(base['position']['y'], 3),
        'naturalLineHeight': round(base['lineHeight'], 3),
        'lineAscent': round(base['lineAscent'], 3),
        'lines': len(dtd['baselines']),
        # per-glyph advances, in em units
        'advances': [{'ch': td['characters'][g['firstCharacter']],
                      'adv': round(g['advance'], 6),
                      'blob': g['commandsBlob']}
                     for g in dtd['glyphs'] if g['firstCharacter'] < len(td['characters'])],
    }


if __name__ == '__main__':
    out = [spec(*row) for row in SECTION_ONE]
    json.dump(out, open('font_figma.json', 'w'), indent=1)

    fams = {}
    for s in out:
        fams.setdefault((s['family'], s['style'], s['cssWeight']), []).append(s['size'])
    print('Fonts used in section one (Figma):')
    for (fam, style, w), sizes in sorted(fams.items()):
        print('  %-10s %-8s css weight %s   %2d nodes   sizes %s'
              % (fam, style, w, len(sizes), sorted(set(sizes))))
    print('\n%d text nodes extracted -> font_figma.json' % len(out))
