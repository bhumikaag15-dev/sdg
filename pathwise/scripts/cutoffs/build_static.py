#!/usr/bin/env python3
"""Build public/data/mhtcet.json (lazy-loaded by the predictor) from the parsed CSVs.
Only regular allotment rows (stage 'I') are included; the full data stays in the database.
Usage: python build_static.py <csv_dir> <out_json> [exam_id]"""
import csv, json, sys, collections

src, out = sys.argv[1], sys.argv[2]
exam = sys.argv[3] if len(sys.argv) > 3 else "MHT-CET"
rd = lambda n: list(csv.DictReader(open(f"{src}/{n}.csv", newline="")))
inst = {r["dte_code"]: [r["name"], r["city"]] for r in rd("institutes")}
courses = {r["choice_code"]: r for r in rd("courses")}
latest = {}
for r in rd("offerings"):
    latest[r["choice_code"]] = (int(r["year"]), r["status"], r["home_university"]) if int(r["year"]) >= latest.get(r["choice_code"], (0,))[0] else latest[r["choice_code"]]
cats = sorted({r["code"] for r in rd("category_codes")})
levels = sorted({r["code"] for r in rd("seat_levels")})
series = collections.defaultdict(lambda: collections.defaultdict(list))
years = set()
for r in csv.DictReader(open(f"{src}/cutoffs.csv", newline="")):
    if r["stage"] != "I" or r["exam"] != exam:
        continue
    y = int(r["year"]); years.add(y)
    series[r["choice_code"]][(levels.index(r["seat_level"]), cats.index(r["category"]))].append([y - 2000, int(r["cap_round"]), round(float(r["percentile"]), 2)])
data = {
    "exam": exam, "years": sorted(years), "cats": cats, "levels": levels,
    "colleges": inst,
    "courses": {c: [courses[c]["dte_code"], courses[c]["course_name"], latest[c][1], latest[c][2], latest[c][0]] for c in series},
    "cut": {c: [[l, k, [v for t in sorted(trip) for v in t]] for (l, k), trip in sorted(s.items())] for c, s in series.items()},
}
json.dump(data, open(out, "w"), separators=(",", ":"))
print(out, len(series), "courses,", sum(len(s) for s in series.values()), "series")
