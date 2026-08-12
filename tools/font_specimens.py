"""Recover real TT Hoves letterforms from the design file.

Every text node in the .fig carries `derivedTextData.glyphs` — the outline of
each glyph as Figma drew it with the licensed font, plus its position. Rebuilding
those outlines gives a true specimen of the typeface the design was set in,
which can be placed against the browser's substitute for comparison.
"""
import json, struct

doc = json.load(open('doc.json'))
BLOBS = doc['blobs']
NODES = {'%d:%d' % (n['guid']['sessionID'], n['guid']['localID']): n
         for n in doc['nodeChanges']}

CMD = {0: ('Z', 0), 1: ('M', 2), 2: ('L', 2), 3: ('Q', 4), 4: ('C', 6)}


def decode(idx):
    b = bytes(BLOBS[idx]['bytes'])
    p, out = 0, []
    while p < len(b):
        name, n = CMD[b[p]]
        p += 1
        v = struct.unpack('<%df' % n, b[p:p + 4 * n]) if n else ()
        p += 4 * n
        out.append((name, v))
    return out


def outlines(nid, first_line_only=True):
    """Return (path data, baselineY, advance width) in the node's own px space."""
    n = NODES[nid]
    dtd = n['derivedTextData']
    base = dtd['baselines'][0]
    y_cut = base['position']['y'] + 1 if first_line_only else 1e9
    parts, maxx = [], 0.0
    for g in dtd['glyphs']:
        gx, gy = g['position']['x'], g['position']['y']
        if gy > y_cut:
            continue
        s = g['fontSize']            # outlines are in em units
        for name, v in decode(g['commandsBlob']):
            # a path has to open with a moveto; the glyph streams carry stray
            # closes around each contour, and SVG discards the whole path if
            # one of those lands first
            if name == 'Z' and (not parts or parts[-1] == 'Z'):
                continue
            pts = [(gx + v[i] * s, gy - v[i + 1] * s) for i in range(0, len(v), 2)]
            for px, _ in pts:
                maxx = max(maxx, px)
            parts.append(name + ' '.join(' %.2f %.2f' % p for p in pts))
    return ' '.join(parts), base['position']['y'], base['width']


SPECIMENS = [
    ('2:44', 'headline',      100.0, 500),
    ('2:26', 'brand',          34.08, 500),
    ('2:63', 'search field',   26.0, 500),
    ('2:117', 'result count',  20.0, 500),
    ('2:45', 'lede',           25.0, 400),
    ('2:90', 'result meta',    16.0, 400),
]

if __name__ == '__main__':
    out = []
    for nid, role, size, weight in SPECIMENS:
        d, baseline, width = outlines(nid)
        n = NODES[nid]
        text = n['textData']['characters']
        if len(n['derivedTextData']['baselines']) > 1:
            end = n['derivedTextData']['baselines'][0]['endCharacter']
            text = text[:end]
        out.append({
            'id': nid, 'role': role, 'text': text, 'size': size, 'weight': weight,
            'letterSpacing': n['letterSpacing']['value'],
            'path': d, 'baseline': round(baseline, 3), 'width': round(width, 3),
        })
        print('%-14s %-24s size %6.2f  weight %d  width %7.2f  path %d chars'
              % (role, text[:24], size, weight, width, len(d)))
    json.dump(out, open('font_specimens.json', 'w'), indent=1)
