#!/usr/bin/env python3
"""Build docs/research/keywords.csv from the TASK-005 raw research (docs/research/raw/kw/).

Evidence only — no volumes are invented. A keyword is in the universe because it is one of our 30 head terms
(checked with WebSearch) or because Google Autocomplete suggested it (real queries, URL recorded).
Volumes are added later from Google Ads Keyword Planner exports (scripts/kw-import-volumes.py); existing volume
columns are preserved when this script is re-run.
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "docs/research/raw/kw"
OUT = ROOT / "docs/research/keywords.csv"
COLS = [
    "keyword", "locale", "cluster", "intent", "page_type", "target", "target_status", "status", "reason",
    "evidence", "evidence_url", "checked_at", "volume", "ads_competition", "volume_source", "volume_date",
]

# Brands we may cover (seed universe, not excluded). Lower-case match → slug.
BRANDS = {
    "candy ai": "candy-ai", "candy": "candy-ai", "nomi ai": "nomi-ai", "nomi": "nomi-ai", "kindroid": "kindroid",
    "replika": "replika", "janitor ai": "janitor-ai", "spicychat": "spicychat-ai", "ourdream": "ourdream-ai",
    "eva ai": "eva-ai", "girlfriendgpt": "girlfriendgpt", "secrets ai": "secrets-ai", "flipped chat": "flipped-chat",
    "chai": "chai", "talkie": "talkie", "polybuzz": "polybuzz", "joyland ai": "joyland-ai", "paradot": "paradot",
    "anima ai": "anima-ai", "romantic ai": "romantic-ai", "tolan": "tolan", "character ai": "character-ai",
}
# Never targeted (07-LEGAL §2: adults only; no age-gate evasion; no piracy; off-topic noise).
EXCLUDE = [
    (r"\bkids?\b|\bchild|enfant|\bteen", "minors — adults-only rule (07-LEGAL §2.1)"),
    (r"without age verification|age verification", "age-verification evasion intent — never targeted"),
    (r"\bmod\b|mod apk|premium free|apk mod", "piracy intent"),
    (r"with my photo|mit eigenem bild|my photo", "real-person image intent — deepfake rule (07-LEGAL §2.2)"),
    (r"image generator|image prompts|video generator|\bart\b|image editor|\bmodel\b|prompts?\b|\bai partner generator|romantic ai (generator|video|stories)|anima ai (generator|image)|generator perchance|\bgen\b", "image generation — not a companion app"),
    (r"movie|meme|band|meaning|\bjob|peridot|ian lucas|iannone|somerhalder|scents|signalis|tripp trapp|monifactory|"
     r"\bomi\b|\bdake\b|1930|now\.gg|internet|copilot|microsoft|ello|zoom|of god|partnership|github|inventor|"
     r"pronunciation|chatgpt|grok|openai|chine|pieces|wiki|dailymotion|shorts|seniors|senioren|sprachübungen|"
     r"robot|hologram|device|razer|\bpal\b|\blab\b|vst\b|xt\b|instagram|without makeup|till the end", "off-topic / not our audience"),
]
NAV = r"\b(login|down|not working|not loading|gone|website|\.com|discord|subreddit|reddit|commands|rulebook|codes?|coupon|promo|gift|proxy|rooms|flow|continue)\b"


def classify(kw: str, locale: str) -> dict:
    k = kw.lower().strip()
    for pat, reason in EXCLUDE:
        if re.search(pat, k):
            return {"status": "exclude", "reason": reason, "cluster": "", "intent": "", "page_type": "", "target": ""}
    brand = next((s for b, s in sorted(BRANDS.items(), key=lambda x: -len(x[0])) if re.search(rf"\b{re.escape(b)}\b", k)), "")
    r = {"status": "include", "reason": "", "target": ""}
    if locale != "en":
        r.update(cluster="locale", intent="commercial", page_type="localized category", target=f"/{locale}/…")
    elif re.search(r"\bvs\b", k) and brand:
        pair = [s for b, s in BRANDS.items() if re.search(rf"\b{re.escape(b)}\b", k)]
        r.update(cluster="versus", intent="commercial", page_type="comparison", target=" vs ".join(sorted(set(pair))))
    elif re.search(r"alternative|apps like|sites like|other apps like", k):
        r.update(cluster="alternatives", intent="commercial", page_type="alternatives", target=brand or "")
    elif brand and re.search(r"\b(safe|private|legit|worth|free|cost|pricing|review|good|cancel)\b", k):
        r.update(cluster="brand", intent="commercial-investigation", page_type="app review (section)", target=brand)
    elif brand and re.search(NAV, k):
        r.update(cluster="brand-navigational", intent="navigational", page_type="app review (low value)", target=brand)
    elif brand:
        r.update(cluster="brand", intent="commercial-investigation", page_type="app review", target=brand)
    elif re.search(r"^(are|is|how|what|why)\b|real thing|legal|taking over|popular|vs real|safe|privacy", k):
        r.update(cluster="informational", intent="informational", page_type="guide", target="")
    elif re.search(r"free|no sign up|no account|sin registro|without in app|android|iphone|ios|google play|apk|download|"
                   r"voice|picture|photo|memory|no filter|uncensored|nsfw|unlimited|no ads|telegram|anime", k):
        r.update(cluster="modifier", intent="commercial", page_type="best-of list", target="")
    elif re.search(r"reddit", k):
        r.update(cluster="forum-intent", intent="commercial-investigation", page_type="category (cite community)", target="")
    else:
        r.update(cluster="head", intent="commercial", page_type="category list", target="")
    return r


SEED = {r["slug"]: r["status"] for r in csv.DictReader((ROOT / "docs/research/APPS-SEED.csv").open(encoding="utf-8"))}


def main() -> None:
    prev = {}
    if OUT.exists():
        prev = {(r["locale"], r["keyword"]): r for r in csv.DictReader(OUT.open(encoding="utf-8"))}
    rows: dict[tuple[str, str], dict] = {}

    def add(kw: str, locale: str, evidence: str, url: str, checked: str) -> None:
        key = (locale, kw.strip().lower())
        if not key[1] or key in rows:
            return
        row = {c: "" for c in COLS}
        row.update(keyword=key[1], locale=locale, evidence=evidence, evidence_url=url, checked_at=checked)
        row.update(classify(key[1], locale))
        slugs = [t for t in row["target"].split(" vs ") if t and not t.startswith("/")]
        row["target_status"] = " / ".join(SEED.get(t, "not in seed") for t in slugs)
        old = prev.get(key)
        if old:
            for c in ("volume", "ads_competition", "volume_source", "volume_date"):
                row[c] = old.get(c, "")
        rows[key] = row

    for f in ("serp-1.json", "serp-2.json"):
        for k in json.loads((RAW / f).read_text()):
            add(k["keyword"], "en", "head term (WebSearch SERP checked)", f"docs/research/raw/kw/{f}", k["checked_at"])
    for s in json.loads((RAW / "autocomplete.json").read_text()):
        for sug in s["suggestions"]:
            add(sug, s["hl"], f"Google Autocomplete for '{s['seed'].strip()}'", s["source"], s["checked_at"])

    order = {"head": 0, "modifier": 1, "alternatives": 2, "versus": 3, "brand": 4, "informational": 5,
             "forum-intent": 6, "brand-navigational": 7, "locale": 8, "": 9}
    out = sorted(rows.values(), key=lambda r: (r["status"] != "include", order[r["cluster"]], r["locale"], r["keyword"]))
    with OUT.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLS)
        w.writeheader()
        w.writerows(out)
    inc = [r for r in out if r["status"] == "include"]
    from collections import Counter
    print(len(out), "keywords;", len(inc), "included;", Counter(r["cluster"] for r in inc))


if __name__ == "__main__":
    main()
