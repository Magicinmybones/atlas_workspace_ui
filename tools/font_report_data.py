"""Consolidate every measurement into one dataset for the audit report."""
import json, collections

figma = json.load(open('font_figma.json'))
browser = json.load(open('font_browser.json'))
ink = json.load(open('font_ink.json'))
specimens = json.load(open('font_specimens.json'))
BY_ID = {n['id']: n for n in browser['nodes']}

doc = json.load(open('doc.json'))
NODES = {'%d:%d' % (n['guid']['sessionID'], n['guid']['localID']): n
         for n in doc['nodeChanges']}

RENDERED_LINES = ink['lines']

rows = []
for f in figma:
    b = BY_ID[f['id']]
    br, me = b['browser'], b['measured']
    node = NODES[f['id']]
    baselines = node['derivedTextData']['baselines']
    chars = node['textData']['characters']

    if f['lines'] > 1:
        sel = f['selector']
        got = RENDERED_LINES.get(sel, [])
        lines = []
        for i, bl in enumerate(baselines):
            seg = chars[bl['firstCharacter']:bl['endCharacter']]
            g = got[i] if i < len(got) else None
            lines.append({'text': seg, 'figma': round(bl['width'], 2),
                          'browser': g,
                          'delta': round(g - bl['width'], 2) if g else None,
                          'pct': round((g - bl['width']) / bl['width'] * 100, 2) if g else None})
        fig_w = sum(l['figma'] for l in lines)
        br_w = sum(l['browser'] for l in lines if l['browser'])
    else:
        lines = None
        ls_px = float(br['letterSpacing'].replace('px', '')) if br['letterSpacing'].endswith('px') else 0
        fig_w = f['layoutW']
        br_w = me['advance'] + ls_px * len(f['text'])

    rows.append({
        'id': f['id'], 'role': f['role'], 'text': f['text'], 'selector': f['selector'],
        'figFamily': f['family'], 'figStyle': f['style'], 'weight': f['cssWeight'],
        'size': f['size'],
        'figLS': f['letterSpacing']['value'], 'brLS': br['letterSpacing'],
        'figLH': f['lineHeight'], 'brLH': br['lineHeight'],
        'brFamily': br['family'].split(',')[0].replace("'", ''),
        'brWeight': int(br['weight']),
        'platform': (b['platform'] or [{}])[0].get('familyName'),
        'nLines': f['lines'],
        'lines': lines,
        'figW': round(fig_w, 2), 'brW': round(br_w, 2),
        'delta': round(br_w - fig_w, 2),
        'pct': round((br_w - fig_w) / fig_w * 100, 2),
        'per': [{'ch': g['ch'], 'fig': g['adv'], 'br': me['perGlyph'][i]['adv'],
                 'd': round(me['perGlyph'][i]['adv'] - g['adv'], 5)}
                for i, g in enumerate(f['advances']) if i < len(me['perGlyph'])],
    })

# per-glyph aggregate
agg = collections.defaultdict(list)
for r in rows:
    for g in r['per']:
        agg[(r['weight'], g['ch'])].append(g['d'])
glyphs = sorted(
    ({'weight': w, 'ch': ch, 'n': len(v), 'mean': round(sum(v) / len(v), 5)}
     for (w, ch), v in agg.items() if ch.strip()),
    key=lambda g: -abs(g['mean']))

inkrows = []
for r in ink['out']:
    inkrows.append({
        'role': r['role'], 'text': r['text'], 'size': r['size'], 'weight': r['weight'],
        'ttInk': r['tt']['ink'], 'figInk': r['fig']['ink'],
        'ratio': round(r['inkRatio'], 4),
        'ttH': r['ttHeight'], 'figH': r['figHeight'],
    })

med = [r for r in inkrows if r['weight'] == 500]
reg = [r for r in inkrows if r['weight'] == 400]

summary = {
    'nodes': len(rows),
    'families': sorted({(r['figFamily'], r['figStyle'], r['weight']) for r in rows}),
    'sizes500': sorted({r['size'] for r in rows if r['weight'] == 500}),
    'sizes400': sorted({r['size'] for r in rows if r['weight'] == 400}),
    'singleLineAbsPct': sorted(abs(r['pct']) for r in rows if r['nLines'] == 1),
    'inkMedium': round(sum(r['ratio'] for r in med) / len(med), 4),
    'inkRegular': round(sum(r['ratio'] for r in reg) / len(reg), 4),
    'ttAscent': 0.940, 'ttNaturalLH': 1.178,
    'figAscent': 0.950, 'figNaturalLH': 1.200,
}
s = summary['singleLineAbsPct']
summary['medianPct'] = round(s[len(s) // 2], 2)
summary['meanPct'] = round(sum(s) / len(s), 2)
summary['worstPct'] = round(max(s), 2)
summary['contrastLoss'] = round(1 - summary['inkMedium'] / summary['inkRegular'], 4)

json.dump({'summary': summary, 'rows': rows, 'glyphs': glyphs,
           'ink': inkrows, 'specimens': specimens,
           'weightProbe': json.load(open('font_weight.json'))},
          open('font_report.json', 'w'), indent=1)

print('nodes            ', summary['nodes'])
print('sizes  medium    ', summary['sizes500'])
print('sizes  regular   ', summary['sizes400'])
print('width  mean/med/worst  %.2f%% / %.2f%% / %.2f%%' %
      (summary['meanPct'], summary['medianPct'], summary['worstPct']))
print('ink    medium    %.3f  (Figtree vs TT Hoves)' % summary['inkMedium'])
print('ink    regular   %.3f' % summary['inkRegular'])
print('contrast compressed by %.1f%%' % (summary['contrastLoss'] * 100))
print('\nmulti-line:')
for r in rows:
    if r['nLines'] > 1:
        for l in r['lines']:
            print('   %-38r figma %7.2f  browser %7.2f  %+6.2f (%+.2f%%)'
                  % (l['text'][:38], l['figma'], l['browser'], l['delta'], l['pct']))
