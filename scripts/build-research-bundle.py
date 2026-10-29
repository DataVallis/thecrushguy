#!/usr/bin/env python3
"""Build src/data/research-bundle.json (TASK-016): the seed CSV + sourced facts, shipped with the app so the
owner can import everything with one click in /admin/research.

Facts come from docs/research/raw/facts/*.json (FACTS-BRIEF format). Added here:
- `no_deepfake_feature` from APPS-SEED.csv (chk_no_deepfake_feature + its source),
- `hold` for apps that must not get a review page yet (seed status not candidate, or a conflict listed in HOLDS).
"""
import csv
import io
import json
import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "docs/research/APPS-SEED.csv"
OUT = ROOT / "src/data/research-bundle.json"

# Conflicts found during fact research that need an owner decision (07-LEGAL §2).
HOLDS = {
    "polybuzz": "FAQ mentions a 'Teen Mode' / age-graded modes although the terms say 18+ — adults-only rule; owner decision",
    "moemate": "Terms only require the minimum age of the user's jurisdiction, not 18+ — adults-only rule",
    "dream-ai-companion": "Google Play rates it 12+ while the App Store says 18+ — adults-only rule; owner decision",
    "voxta": "Terms found do not state an 18+ requirement — adults-only rule",
}

seed_rows = list(csv.DictReader(SEED.open(encoding="utf-8")))
seed = {r["slug"]: r for r in seed_rows}
RAW = ROOT / "docs/research/raw/facts"
# Targeted deepfake-feature checks (deepfake-*.json) override the seed's value when they found a sourced answer.
deepfake = {}
for f in sorted(RAW.glob("deepfake-*.json")):
    for x in json.loads(f.read_text(encoding="utf-8")):
        d = x.get("no_deepfake_feature", {})
        if d.get("v") in ("yes", "no") and str(d.get("src", "")).startswith("http"):
            deepfake[x["slug"]] = d
facts = []
for f in sorted(RAW.glob("facts-*.json")):
    for x in json.loads(f.read_text(encoding="utf-8")):
        s = seed.get(x["slug"])
        if s:
            x["no_deepfake_feature"] = deepfake.get(x["slug"]) or {
                "v": s.get("chk_no_deepfake_feature", "unknown"),
                "src": s.get("source_url", ""),
            }
        if x["no_deepfake_feature"]["v"] == "no":
            x["hold"] = "advertises creating content of real people (deepfake rule, 07-LEGAL §2.2)"
        elif not s or s["status"] != "candidate":
            x["hold"] = f"seed status is {s['status'] if s else 'missing'}"
        elif x["slug"] in HOLDS:
            x["hold"] = HOLDS[x["slug"]]
        facts.append(x)

buf = io.StringIO()
w = csv.DictWriter(buf, fieldnames=list(seed_rows[0].keys()), lineterminator="\n")
w.writeheader()
w.writerows(seed_rows)
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(
    json.dumps({"generated_at": datetime.date.today().isoformat(), "seed_csv": buf.getvalue(), "facts": facts},
               ensure_ascii=False, indent=1) + "\n",
    encoding="utf-8",
)
print(f"{len(seed_rows)} seed rows, {len(facts)} fact records, {sum(1 for x in facts if 'hold' in x)} held")
