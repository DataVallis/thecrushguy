#!/usr/bin/env python3
"""
Regenerates every logo SVG in design/logo/svg (and the copies in public/) from code — never hand-edit the SVGs.

- Mascot: concept A "cool heart" (ADR-009), drawn from fixed vector shapes below.
- Wordmark + og tagline: outlined from Fraunces ExtraBold 800 (OFL, design/logo/fonts/), ADR-023.
  Outlined paths mean no font is needed to display the logo.

Usage: python3 design/logo/generate.py        (needs fontTools; with cairosvg + Pillow installed it also
       re-exports the PNGs that contain the wordmark: logo-horizontal*, logo-stacked, og-default)
"""
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent
FONT = TTFont(ROOT / "fonts" / "fraunces-latin-800-normal.woff")
INK, CORAL, BLUSH, WHITE = "#1B1530", "#FF4D6D", "#FFE4EA", "#FFFFFF"

HEART = "M50 90 C20 68 5 52 5 33 C5 18 16 7 30 7 C39 7 46 12 50 19 C54 12 61 7 70 7 C84 7 95 18 95 33 C95 52 80 68 50 90 Z"


def mascot(glasses=INK, simple=False):
    if simple:  # ≤ 48 px: one-bar glasses, no smile
        return f'<path d="{HEART}" fill="{CORAL}"/><rect x="14" y="30" width="72" height="17" rx="6" fill="{glasses}"/>'
    return (
        f'<path d="{HEART}" fill="{CORAL}"/>'
        f'<rect x="17" y="31" width="29" height="15" rx="6" fill="{glasses}"/>'
        f'<rect x="54" y="31" width="29" height="15" rx="6" fill="{glasses}"/>'
        f'<rect x="44" y="34" width="12" height="4" rx="2" fill="{glasses}"/>'
        f'<rect x="21" y="34" width="8" height="3" rx="1.5" fill="#FFFFFF" opacity="0.55"/>'
        f'<rect x="58" y="34" width="8" height="3" rx="1.5" fill="#FFFFFF" opacity="0.55"/>'
        f'<path d="M41 60 Q50 67 61 58" stroke="{glasses}" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
    )


def kerning():
    """Pair kerning from the font's legacy `kern` table or GPOS PairPos format 1 (enough for our few words)."""
    pairs = {}
    if "GPOS" not in FONT:
        return pairs
    for lookup in FONT["GPOS"].table.LookupList.Lookup:
        for st in lookup.SubTable:
            st = getattr(st, "ExtSubTable", st)
            if getattr(st, "LookupType", None) == 2 and st.Format == 1:
                cov = st.Coverage.glyphs
                for i, ps in enumerate(st.PairSet):
                    for rec in ps.PairValueRecord:
                        v = getattr(rec.Value1, "XAdvance", 0) if rec.Value1 else 0
                        if v:
                            pairs[(cov[i], rec.SecondGlyph)] = v
            elif getattr(st, "LookupType", None) == 2 and st.Format == 2:
                cd1, cd2 = st.ClassDef1.classDefs, st.ClassDef2.classDefs
                for g1 in st.Coverage.glyphs:
                    c1 = st.Class1Record[cd1.get(g1, 0)]
                    for g2 in FONT.getGlyphOrder():
                        rec = c1.Class2Record[cd2.get(g2, 0)]
                        v = getattr(rec.Value1, "XAdvance", 0) if rec.Value1 else 0
                        if v:
                            pairs.setdefault((g1, g2), v)
    return pairs


KERN = kerning()
CMAP = FONT.getBestCmap()
GLYPHS = FONT.getGlyphSet()
UPM = FONT["head"].unitsPerEm


def text_path(text, size, x=0.0, y=0.0, prev=None):
    """Outlines `text` with its baseline at (x, y). Returns (svg path data, advance width, last glyph)."""
    s = size / UPM
    pen = SVGPathPen(GLYPHS, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    cursor = 0.0
    for ch in text:
        g = CMAP[ord(ch)]
        if prev:
            cursor += KERN.get((prev, g), 0)
        GLYPHS[g].draw(TransformPen(pen, (s, 0, 0, -s, x + cursor * s, y)))
        cursor += GLYPHS[g].width
        prev = g
    return pen.getCommands(), cursor * s, prev


def wordmark(x, y, size, colors):
    """'the' + 'crush' + 'guy' as three paths (so 'crush' can be coral). Kerning continues across the joins."""
    parts, prev, cx = [], None, x
    for word, color in zip(("the", "crush", "guy"), colors):
        d, w, prev = text_path(word, size, cx, y, prev)
        parts.append(f'<path d="{d}" fill="{color}"/>')
        cx += w
    return "".join(parts), cx - x


def svg(w, h, body):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" width="{w:g}" height="{h:g}" '
        f'role="img" aria-label="The Crush Guy"><title>The Crush Guy</title>{body}</svg>\n'
    )


def measure(text, size):
    return text_path(text, size)[1]


# Size the wordmark so the ascender of "h" is 72 px tall, as in the approved concept (baseline 100, top 28).
H_TOP = GLYPHS[CMAP[ord("h")]]
_bounds_pen = __import__("fontTools.pens.boundsPen", fromlist=["BoundsPen"]).BoundsPen(GLYPHS)
H_TOP.draw(_bounds_pen)
WM_SIZE = 72 * UPM / _bounds_pen.bounds[3]


def descent(size):
    """Depth below the baseline of the deepest descender in the wordmark (g, y) at `size`."""
    lows = []
    for ch in "gy":
        bp = __import__("fontTools.pens.boundsPen", fromlist=["BoundsPen"]).BoundsPen(GLYPHS)
        GLYPHS[CMAP[ord(ch)]].draw(bp)
        lows.append(-bp.bounds[1])
    return max(lows) * size / UPM


def horizontal(word_colors, glasses=INK):
    wm, width = wordmark(125, 100, WM_SIZE, word_colors)
    # Height keeps the full descender of g/y plus a little air.
    return svg(round(125 + width + 8), round(100 + descent(WM_SIZE) + 6), f'<g transform="translate(0 10)">{mascot(glasses)}</g>{wm}')


def main():
    out = {}
    out["icon.svg"] = svg(100, 96, f"<g>{mascot()}</g>")
    out["icon-simple.svg"] = svg(100, 96, f"<g>{mascot(simple=True)}</g>")
    out["app-icon-blush.svg"] = svg(512, 512, f'<rect width="512" height="512" fill="{BLUSH}"/><g transform="translate(76 86) scale(3.6)">{mascot()}</g>')
    out["app-icon-ink.svg"] = svg(512, 512, f'<rect width="512" height="512" fill="{INK}"/><g transform="translate(76 86) scale(3.6)">{mascot()}</g>')
    out["logo-horizontal.svg"] = horizontal((INK, CORAL, INK))
    out["logo-horizontal-on-dark.svg"] = horizontal((WHITE, CORAL, WHITE))
    out["logo-horizontal-mono-ink.svg"] = horizontal((INK, INK, INK), glasses=WHITE)
    out["logo-horizontal-mono-white.svg"] = horizontal((WHITE, WHITE, WHITE))

    # Stacked: mascot 1.6× on top, wordmark centred below.
    wm_w = measure("thecrushguy", WM_SIZE)
    stack_w = round(wm_w + 8)
    wm, _ = wordmark(4, 240, WM_SIZE, (INK, CORAL, INK))
    out["logo-stacked.svg"] = svg(stack_w, round(240 + descent(WM_SIZE) + 6), f'<g transform="translate({(stack_w - 160) / 2:g} 0) scale(1.6)">{mascot()}</g>{wm}')

    # Default social image 1200×630.
    og_wm_size = WM_SIZE * 1.3
    og_wm_w = measure("thecrushguy", og_wm_size)
    wm, _ = wordmark((1200 - og_wm_w) / 2, 400, og_wm_size, (INK, CORAL, INK))
    tagline = "I tried every AI crush, so you don't have to."
    tl_size = 40
    tl_d, tl_w, _ = text_path(tagline, tl_size, (1200 - measure(tagline, tl_size)) / 2, 520)
    out["og-default.svg"] = svg(
        1200,
        630,
        f'<rect width="1200" height="630" fill="{BLUSH}"/><g transform="translate(490 60) scale(2.2)">{mascot()}</g>'
        f'{wm}<path d="{tl_d}" fill="{INK}" opacity="0.75"/>',
    )

    for name, content in out.items():
        (ROOT / "svg" / name).write_text(content)
    (ROOT.parent.parent / "public" / "logo.svg").write_text(out["logo-horizontal.svg"])
    export_pngs()
    print(f"wrote {len(out)} SVGs (wordmark size {WM_SIZE:.1f}px, {len(KERN)} kern pairs)")


def export_pngs():
    """Wordmark PNGs. Icon-only PNGs (favicon, app icons) don't change with the font and are left alone."""
    try:
        import io

        import cairosvg
        from PIL import Image
    except ImportError:
        print("cairosvg/Pillow not installed — SVGs written, PNG exports skipped")
        return

    def png(name, width, bg=None):
        raw = cairosvg.svg2png(url=str(ROOT / "svg" / f"{name}.svg"), output_width=width)
        im = Image.open(io.BytesIO(raw)).convert("RGBA")
        if bg:
            base = Image.new("RGBA", im.size, bg)
            base.alpha_composite(im)
            im = base.convert("RGB")
        return im

    png("logo-horizontal", 1200).save(ROOT / "png" / "logo-horizontal-1200.png", optimize=True)
    png("logo-horizontal-on-dark", 1200, INK).save(ROOT / "png" / "logo-horizontal-on-dark-1200.png", optimize=True)
    png("logo-stacked", 800).save(ROOT / "png" / "logo-stacked-800.png", optimize=True)
    og = png("og-default", 1200, BLUSH)
    og.save(ROOT / "png" / "og-default.png", optimize=True)
    og.save(ROOT.parent.parent / "public" / "og-default.png", optimize=True)


if __name__ == "__main__":
    main()
