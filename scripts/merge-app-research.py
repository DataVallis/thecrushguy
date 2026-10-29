#!/usr/bin/env python3
"""Merges docs/research/raw/batch-*.json into docs/research/APPS-SEED.csv (TASK-006).
Duplicates (same slug or same website host) are merged: the strictest status wins (excluded > hold > candidate),
reasons and notes are concatenated, empty fields are filled from the other rows, sources are unioned.
Run: python3 scripts/merge-app-research.py"""
import csv, glob, json, re
from urllib.parse import urlparse

RANK = {"excluded": 3, "hold": 2, "candidate": 1}
COLS = ["status", "slug", "name", "website_url", "tagline", "company_name", "company_country", "privacy_policy_url",
        "platforms", "nsfw_allowed", "has_free_plan", "starting_price", "currency", "chk_18plus_terms",
        "chk_privacy_policy", "chk_operator_identifiable", "chk_no_deepfake_feature", "affiliate_program",
        "exclusion_reason", "source_url", "source_field", "checked_at", "extra_sources", "notes", "found_by"]

def host(u):
    try:
        h = urlparse(u or "").netloc.lower()
        return h[4:] if h.startswith("www.") else h
    except Exception:
        return ""

def norm_slug(s):
    return re.sub(r"-ai$", "", s.strip().lower())

rows = []
for f in sorted(glob.glob("docs/research/raw/batch-*.json")):
    for r in json.load(open(f)):
        r["found_by"] = f.split("batch-")[1][:-5]
        # yes/no/unknown fields: keep only the leading word (agents sometimes added an explanation)
        if r.get("nsfw_allowed"):
            word = r["nsfw_allowed"].split()[0].strip(",;").lower()
            if word not in ("yes", "no", "unknown"):
                word = "unknown"
            if word != r["nsfw_allowed"]:
                r["notes"] = (r.get("notes", "") + f" nsfw detail: {r['nsfw_allowed']}").strip()
            r["nsfw_allowed"] = word
        rows.append(r)

groups = []
for r in rows:
    keys = {norm_slug(r["slug"])}
    h = host(r.get("website_url"))
    if h and "apps.apple.com" not in h and "play.google.com" not in h:
        keys.add(h)
    for g in groups:
        if g["keys"] & keys:
            g["rows"].append(r); g["keys"] |= keys; break
    else:
        groups.append({"keys": keys, "rows": [r]})

out = []
for g in groups:
    rs = sorted(g["rows"], key=lambda r: -RANK.get(r["status"], 0))
    m = dict(rs[0])
    for r in rs[1:]:
        for c in COLS:
            if not m.get(c) and r.get(c):
                m[c] = r[c]
    reasons = [r["exclusion_reason"] for r in rs if r.get("exclusion_reason")]
    m["exclusion_reason"] = " | ".join(dict.fromkeys(reasons))
    m["notes"] = " | ".join(dict.fromkeys(r["notes"] for r in rs if r.get("notes")))
    srcs = []
    for r in rs:
        for s in [r.get("source_url", "")] + (r.get("extra_sources") or "").split(" ; "):
            s = s.strip()
            if s and s != m["source_url"] and s not in srcs:
                srcs.append(s)
    m["extra_sources"] = " ; ".join(srcs)
    m["found_by"] = ";".join(dict.fromkeys(r["found_by"] for r in rs))
    m["slug"] = rs[0]["slug"].strip().lower()
    if not m.get("website_url") and ("play.google.com" in m.get("source_url", "") or "apps.apple.com" in m.get("source_url", "")):
        # No confirmed official website: link the official store listing instead (never a guessed domain).
        m["website_url"] = m.get("website_url") or m["source_url"]
    # 07-LEGAL §2.1: we only list services for adults. Terms that admit under-18 users → hold, never candidate.
    if m["status"] == "candidate" and any(r.get("chk_18plus_terms") == "no" for r in rs):
        m["status"] = "hold"
        reason = "Terms do not restrict the service to adults (18+) — 07-LEGAL §2.1 adults-only rule; owner decision"
        m["exclusion_reason"] = " | ".join(x for x in [m["exclusion_reason"], reason] if x)
    out.append(m)

out.sort(key=lambda r: (-RANK.get(r["status"], 0) * -1, r["slug"]))
with open("docs/research/APPS-SEED.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=COLS, extrasaction="ignore")
    w.writeheader()
    for r in out:
        w.writerow({c: r.get(c, "") for c in COLS})
from collections import Counter
print(len(rows), "rows ->", len(out), "apps", dict(Counter(r["status"] for r in out)))
print("missing source_url:", [r["slug"] for r in out if not r.get("source_url")])
