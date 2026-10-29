#!/usr/bin/env python3
"""
Mascot illustrations (TASK-019): the logo's "cool heart" (ADR-009) with simple props, drawn from code like the logo
— flat shapes in the CGP palette, no people, no vendor imagery (design/CGP.md §7). Output: public/illustrations/*.svg
Usage: python3 design/illustrations/generate.py
"""
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "public" / "illustrations"
INK, CORAL, CORAL_STRONG, BLUSH, PAPER, LAVENDER, WHITE = (
    "#1B1530", "#FF4D6D", "#C81E45", "#FFE4EA", "#FFF8F9", "#F3F0FA", "#FFFFFF")
GOLD = "#F5B83D"

HEART = "M50 90 C20 68 5 52 5 33 C5 18 16 7 30 7 C39 7 46 12 50 19 C54 12 61 7 70 7 C84 7 95 18 95 33 C95 52 80 68 50 90 Z"


def mascot(x, y, s=1.0, smile=True, arms=None):
    """The heart at (x, y) scaled by s (base 100x100). arms: list of (sx, sy, ex, ey) in base coordinates."""
    parts = [
        f'<path d="{HEART}" fill="{CORAL}"/>',
        f'<rect x="17" y="31" width="29" height="15" rx="6" fill="{INK}"/>',
        f'<rect x="54" y="31" width="29" height="15" rx="6" fill="{INK}"/>',
        f'<rect x="44" y="34" width="12" height="4" rx="2" fill="{INK}"/>',
        f'<rect x="21" y="34" width="8" height="3" rx="1.5" fill="{WHITE}" opacity="0.55"/>',
        f'<rect x="58" y="34" width="8" height="3" rx="1.5" fill="{WHITE}" opacity="0.55"/>',
    ]
    if smile:
        parts.append(f'<path d="M41 60 Q50 67 61 58" stroke="{INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>')
    for sx, sy, ex, ey in arms or []:
        parts.append(
            f'<path d="M{sx} {sy} Q{(sx + ex) / 2} {min(sy, ey) - 6} {ex} {ey}" stroke="{INK}" stroke-width="4" '
            f'fill="none" stroke-linecap="round"/><circle cx="{ex}" cy="{ey}" r="4.5" fill="{INK}"/>'
        )
    # little legs
    parts.append(f'<path d="M42 84 L38 98 M58 84 L62 98" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
    return f'<g transform="translate({x} {y}) scale({s})">{"".join(parts)}</g>'


def small_heart(x, y, s, color=CORAL, opacity=1.0):
    return f'<path d="{HEART}" transform="translate({x} {y}) scale({s})" fill="{color}" opacity="{opacity}"/>'


def sparkle(x, y, r, color=GOLD):
    return (f'<path d="M{x} {y - r} L{x + r * 0.28} {y - r * 0.28} L{x + r} {y} L{x + r * 0.28} {y + r * 0.28} '
            f'L{x} {y + r} L{x - r * 0.28} {y + r * 0.28} L{x - r} {y} L{x - r * 0.28} {y - r * 0.28} Z" fill="{color}"/>')


def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')


def bubble(x, y, w, h, color, tail="left", lines=2, line_color=None):
    lc = line_color or (INK if color != INK else WHITE)
    t = (f'M{x + 14} {y + h} l-6 12 l16 -12 Z' if tail == "left" else f'M{x + w - 14} {y + h} l6 12 l-16 -12 Z')
    ls = "".join(
        f'<rect x="{x + 12}" y="{y + 12 + i * 12}" width="{(w - 24) * (0.9 if i == 0 else 0.6)}" height="6" rx="3" '
        f'fill="{lc}" opacity="0.35"/>' for i in range(lines))
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{color}"/><path d="{t}" fill="{color}"/>{ls}'


SCENES = {}

# Hero: mascot holding a phone full of chat bubbles, hearts floating up.
SCENES["hero"] = svg(320, 280, "".join([
    f'<circle cx="160" cy="150" r="118" fill="{CORAL}" opacity="0.14"/>',
    # phone
    f'<g transform="rotate(-8 205 140)"><rect x="160" y="40" width="96" height="176" rx="18" fill="{INK}"/>'
    f'<rect x="167" y="54" width="82" height="148" rx="10" fill="{PAPER}"/>'
    f'{bubble(174, 64, 56, 30, BLUSH)}{bubble(188, 104, 54, 30, CORAL, tail="right", line_color=WHITE)}'
    f'{bubble(174, 146, 60, 30, LAVENDER)}</g>',
    mascot(40, 92, 1.45, arms=[(88, 52, 112, 30)]),
    small_heart(250, 20, 0.22), small_heart(278, 56, 0.14, CORAL_STRONG), small_heart(226, 2, 0.12, CORAL, 0.7),
    sparkle(40, 60, 9), sparkle(286, 200, 7),
]), "The Crush Guy mascot chatting on a phone")

# Filters / features — square scenes.
SCENES["free"] = svg(160, 160, "".join([
    f'<circle cx="80" cy="84" r="70" fill="{BLUSH}"/>',
    f'<rect x="88" y="78" width="56" height="48" rx="6" fill="{CORAL}"/><rect x="84" y="68" width="64" height="16" rx="5" fill="{CORAL_STRONG}"/>'
    f'<rect x="111" y="68" width="10" height="58" fill="{GOLD}"/>'
    f'<path d="M116 68 C104 50 92 58 104 66 M116 68 C128 50 140 58 128 66" stroke="{GOLD}" stroke-width="5" fill="none" stroke-linecap="round"/>',
    mascot(8, 42, 0.92, arms=[(88, 56, 92, 74)]),
    sparkle(140, 34, 8),
]), "Mascot with a gift: free plan")

SCENES["voice"] = svg(160, 160, "".join([
    f'<circle cx="80" cy="84" r="70" fill="{LAVENDER}"/>',
    f'<rect x="110" y="44" width="22" height="38" rx="11" fill="{INK}"/><rect x="119" y="82" width="4" height="22" fill="{INK}"/>'
    f'<rect x="108" y="102" width="26" height="5" rx="2.5" fill="{INK}"/>',
    "".join(f'<path d="M{142 + i * 7} {50 - i * 2} Q{150 + i * 9} 63 {142 + i * 7} {76 + i * 2}" stroke="{CORAL}" stroke-width="4" fill="none" stroke-linecap="round" opacity="{1 - i * 0.3}"/>' for i in range(2)),
    mascot(6, 46, 0.9, arms=[(88, 56, 110, 66)]),
]), "Mascot with a microphone: voice")

SCENES["pictures"] = svg(160, 160, "".join([
    f'<circle cx="80" cy="84" r="70" fill="{BLUSH}"/>',
    f'<g transform="rotate(10 120 80)"><rect x="92" y="42" width="58" height="68" rx="4" fill="{WHITE}" stroke="{INK}" stroke-width="3"/>'
    f'<rect x="99" y="49" width="44" height="40" fill="{LAVENDER}"/><circle cx="112" cy="62" r="6" fill="{GOLD}"/>'
    f'<path d="M99 89 L114 72 L124 82 L132 74 L143 89 Z" fill="{CORAL}"/></g>',
    mascot(4, 48, 0.88, arms=[(88, 56, 98, 76)]),
    sparkle(30, 30, 7),
]), "Mascot holding a photo: pictures")

SCENES["memory"] = svg(160, 160, "".join([
    f'<circle cx="80" cy="84" r="70" fill="{LAVENDER}"/>',
    f'<circle cx="104" cy="54" r="5" fill="{WHITE}" stroke="{INK}" stroke-width="2.5"/><circle cx="114" cy="42" r="7" fill="{WHITE}" stroke="{INK}" stroke-width="2.5"/>'
    f'<rect x="112" y="10" width="42" height="30" rx="12" fill="{WHITE}" stroke="{INK}" stroke-width="2.5"/>',
    small_heart(122, 15, 0.22),
    mascot(10, 52, 0.9, arms=[(12, 56, 2, 40)]),
]), "Mascot remembering: long-term memory")

SCENES["cheap"] = svg(160, 160, "".join([
    f'<circle cx="80" cy="84" r="70" fill="{BLUSH}"/>',
    f'<circle cx="124" cy="80" r="24" fill="{GOLD}"/><circle cx="124" cy="80" r="18" fill="none" stroke="#C98A12" stroke-width="3"/>'
    f'<text x="124" y="89" font-family="Georgia, serif" font-size="24" font-weight="700" fill="#8A5A00" text-anchor="middle">$</text>',
    mascot(6, 46, 0.9, arms=[(88, 56, 102, 76)]),
    sparkle(146, 40, 7),
]), "Mascot with a coin: cheap plans")

SCENES["privacy"] = svg(160, 160, "".join([
    f'<circle cx="80" cy="84" r="70" fill="{LAVENDER}"/>',
    f'<path d="M108 74 v-12 a16 16 0 0 1 32 0 v12" stroke="{INK}" stroke-width="6" fill="none"/>'
    f'<rect x="100" y="72" width="48" height="40" rx="8" fill="{CORAL_STRONG}"/><circle cx="124" cy="88" r="5" fill="{WHITE}"/>'
    f'<rect x="122" y="90" width="4" height="10" rx="2" fill="{WHITE}"/>',
    mascot(4, 48, 0.88, arms=[(88, 56, 100, 84)]),
]), "Mascot with a padlock: privacy")

SCENES["search"] = svg(200, 160, "".join([
    f'<circle cx="100" cy="84" r="70" fill="{BLUSH}"/>',
    f'<circle cx="150" cy="62" r="20" fill="{WHITE}" stroke="{INK}" stroke-width="6"/><path d="M135 77 L118 96" stroke="{INK}" stroke-width="8" stroke-linecap="round"/>',
    mascot(30, 46, 0.9, arms=[(88, 56, 118, 92)]),
    small_heart(10, 20, 0.16, CORAL, 0.6), sparkle(184, 120, 7),
]), "Mascot searching with a magnifier")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, body in SCENES.items():
        (OUT / f"{name}.svg").write_text(body, encoding="utf-8")
    print(f"wrote {len(SCENES)} illustrations to {OUT}")


if __name__ == "__main__":
    main()
