#!/usr/bin/env python3
"""Merge Google Ads Keyword Planner exports into docs/research/keywords.csv (TASK-005).

Usage:
  python3 scripts/kw-import-volumes.py <locale> <export.csv> [<export2.csv> ...]
    locale  = the locale the export was made for (en, de, fr, es, it, pt) — must match keywords.csv `locale`

Keyword Planner → "Discover new keywords" or "Get search volume and forecasts" → Download keyword ideas (.csv).
The export is UTF-16, tab separated, with two title lines before the header — handled here.
Only keywords already in keywords.csv are updated; new ideas from the export are appended to
docs/research/raw/kw/planner-ideas-<locale>.csv for a human to triage (never auto-added).

Planner "Competition" is *paid ads* competition, not SEO difficulty — stored as `ads_competition`.
Volumes are Google's rounded ranges/averages; we record them exactly as exported with source + date.
"""
import csv
import datetime
import io
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KW = ROOT / "docs/research/keywords.csv"


def read_export(path: Path) -> list[dict]:
    raw = path.read_bytes()
    for enc in ("utf-16", "utf-8-sig", "utf-8"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise SystemExit(f"{path}: unknown encoding")
    lines = text.splitlines()
    start = next(
        (i for i, l in enumerate(lines) if l.split("\t")[0].strip() == "Keyword" or l.startswith("Keyword,")),
        None,
    )
    if start is None:
        raise SystemExit(f"{path}: no 'Keyword' header row found — is this a Keyword Planner export?")
    delim = "\t" if "\t" in lines[start] else ","
    return list(csv.DictReader(io.StringIO("\n".join(lines[start:])), delimiter=delim))


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    locale, files = sys.argv[1], [Path(p) for p in sys.argv[2:]]
    rows = list(csv.DictReader(KW.open(encoding="utf-8")))
    cols = list(rows[0].keys())
    index = {(r["locale"], r["keyword"].strip().lower()): r for r in rows}
    today = datetime.date.today().isoformat()
    updated, ideas = 0, []
    for f in files:
        for e in read_export(f):
            kw = (e.get("Keyword") or "").strip().lower()
            vol = (e.get("Avg. monthly searches") or "").strip()
            if not kw:
                continue
            row = index.get((locale, kw))
            if row is None:
                ideas.append({"keyword": kw, "volume": vol, "ads_competition": e.get("Competition", "")})
                continue
            row["volume"] = vol
            row["ads_competition"] = (e.get("Competition") or "").strip()
            row["volume_source"] = f"Google Ads Keyword Planner export ({f.name})"
            row["volume_date"] = today
            updated += 1
    with KW.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    if ideas:
        out = ROOT / f"docs/research/raw/kw/planner-ideas-{locale}.csv"
        with out.open("w", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=["keyword", "volume", "ads_competition"])
            w.writeheader()
            w.writerows(ideas)
    print(f"updated {updated} keywords; {len(ideas)} new ideas for triage")


if __name__ == "__main__":
    main()
