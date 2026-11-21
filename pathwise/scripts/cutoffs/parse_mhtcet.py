#!/usr/bin/env python3
"""Parse MHT-CET CAP cut-off PDFs (CET Cell) into CSVs.

Usage: python parse_mhtcet.py <pdf_dir> <out_dir>
File names must look like  2024ENGG_CAP1_CutOff*.pdf  (year, track, round).
New year = drop the new PDFs in the folder and re-run; rows are keyed so re-loading never duplicates.
Values are located by x-position under each category header, so empty cells cannot shift columns.
"""
import csv, os, re, sys, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
def _read(n):
    f = os.path.join(HERE, n)
    return list(csv.DictReader(open(f, newline=""))) if os.path.exists(f) else []
ALIASES = {r["old_dte"]: r["new_dte"] for r in _read("code_aliases.csv")}      # institute code changed between years
CITY_OVERRIDES = {r["dte_code"]: r["city"] for r in _read("city_overrides.csv")}  # names with no ", City" suffix
FOOT_Y = 745
TITLE_Y = 75
COLLEGE = re.compile(r"^(\d{4,5})\s+-\s+(.+)$")
COURSE = re.compile(r"^(\d{9,10}[A-Z]{0,2})\s+-\s+(.+)$")
LEVELS = ("State Level", "Home University Seats", "Other Than Home University Seats", "Minority Seats", "Maharashtra State Seats")
RANK = re.compile(r"^\d+$")
PCT = re.compile(r"^\((\d+(?:\.\d+)?)\)$")


def level_code(t):
    """Short code for the seat-level heading printed above each table."""
    t = " ".join(t.split())
    if t.startswith("State Level"): return "STATE"
    if t.startswith("Minority"): return "MINORITY"
    if t.startswith("Maharashtra State Seats"): return "AI_STATE"
    a, b = (t.split("Seats Allotted to") + [""])[:2]
    seat = "OHU" if a.startswith("Other Than Home") else "HU" if a.startswith("Home University") else "OTHER"
    cand = "OHU" if "Other Than Home" in b else "HU" if "Home University" in b else "OTHER"
    return f"{seat}_SEATS_{cand}_CAND"


def group_lines(words, tol=3):
    words = sorted(words, key=lambda w: (w[1], w[0]))
    lines = []
    for w in words:
        if lines and abs(lines[-1][0] - w[1]) <= tol:
            lines[-1][1].append(w)
        else:
            lines.append([w[1], [w]])
    return [(y, sorted(ws, key=lambda w: w[0])) for y, ws in lines]


def text(ws):
    return " ".join(w[4] for w in ws).strip()


class Parser:
    def __init__(self, year, rnd, track, writer, meta):
        self.year, self.rnd, self.track, self.w, self.meta = year, rnd, track, writer, meta
        self.college = self.course = None  # dicts
        self.status = ""
        self.level = ""
        self.header = None  # list of [cat, x0, center]
        self.header_y = None
        self.section = []  # data lines
        self.overflow = False
        self.last_stages = []
        self.mode = None
        self.rows = 0
        self.flags = collections.Counter()

    # -- emit ---------------------------------------------------------
    def flush(self):
        sec, self.section = self.section, []
        if not sec or not self.header or not self.course:
            return
        words = [w for _, ws in sec for w in ws]
        minx = (min(h[1] for h in self.header) - 25) if self.overflow else 55
        ranks = [w for w in words if RANK.match(w[4]) and w[0] >= minx]
        pcts = [w for w in words if PCT.match(w[4])]
        labels = [w for w in words if w[0] < 60 and w[4] != "Stage" and not RANK.match(w[4]) and not PCT.match(w[4])]
        row_ys = []
        for r in sorted(ranks, key=lambda w: w[1]):
            if not row_ys or abs(row_ys[-1] - r[1]) > 3:
                row_ys.append(r[1])
        stages = []
        for i, ry in enumerate(row_ys):
            lo = ry - 3
            hi = row_ys[i + 1] - 3 if i + 1 < len(row_ys) else 1e9
            if self.overflow:
                stage = "CONT"  # overflow row printed without a stage label; kept separate, excluded from predictions
            else:
                stage = " ".join(w[4] for w in sorted(labels, key=lambda w: (w[1], w[0])) if lo <= w[1] < hi) or "I"
            stages.append(stage)
            for r in (r for r in ranks if abs(r[1] - ry) <= 3):
                p = [x for x in pcts if abs(x[0] - r[0]) <= 6 and r[1] < x[1] <= r[1] + 14]
                if not p:
                    self.flags["rank_without_pct"] += 1
                    continue
                cx = (r[0] + r[2]) / 2
                cat, d = min(((h[0], abs(h[2] - cx)) for h in self.header), key=lambda t: t[1])
                if d > 30:
                    self.flags["far_column"] += 1
                if stage == "CONT":
                    self.flags["dropped_unlabelled_overflow"] += 1
                    continue
                self.w.writerow([self.year, self.rnd, self.track, self.course["code"], level_code(self.level), stage, cat, int(r[4]), float(PCT.match(p[0][4]).group(1))])
                self.rows += 1
        if not self.overflow:
            self.last_stages = stages

    def start_course(self, code, name):
        self.flush()
        digits = re.match(r"\d+", code).group(0)
        c = digits.zfill(10) + code[len(digits):]
        c = ALIASES.get(c[:5], c[:5]) + c[5:]
        self.course = {"code": c, "name": name, "college": c[:5]}
        self.status = ""
        self.header = None
        self.overflow = False
        self.last_stages = []
        self.mode = "course"
        self.meta["offer"][(self.year, c)] = {"status": "", "home": ""}
        self.meta["course"][c] = self.course
        if c[:5] not in self.meta["inst"] and self.college:
            pass

    def page(self, p):
        h = p.rect.height
        self.header_y = None
        cont_ok = True
        for y, ws in group_lines(p.get_text("words")):
            t = text(ws)
            if y < TITLE_Y:
                if "Cut Off List" in t and not self.meta.get("title"):
                    self.meta["title"] = t[t.index("Cut Off List"):]
                continue
            if y > h * 0.88 or t.startswith("Legends") or t.startswith("*"):
                if "Cut Off Indicates" in t:
                    self.meta["notes"].add(t)
                continue
            m = COURSE.match(t)
            if m:
                self.start_course(m.group(1), m.group(2)); cont_ok = False; continue
            m = COLLEGE.match(t)
            if m and not COURSE.match(t):
                self.flush()
                _c = m.group(1).zfill(5)
                self.college = {"code": ALIASES.get(_c, _c), "name": m.group(2)}
                self.meta["inst"][self.college["code"]] = (self.year, self.college["name"])
                self.mode = "college"; self.header = None; cont_ok = False; continue
            if t.startswith("Status:"):
                self.flush()
                self.status = t[len("Status:"):].strip(); self.mode = "status"; cont_ok = False
                if self.course:
                    m2 = re.search(r"Home University\s*:\s*(.+)$", self.status)
                    self.meta["offer"][(self.year, self.course["code"])] = {"status": re.sub(r"\s*Home University\s*:.*$", "", self.status).strip(), "home": m2.group(1).strip() if m2 else ""}
                continue
            if any(t.startswith(l) for l in LEVELS):
                self.flush(); self.level = t; self.header = None; self.mode = "level"; cont_ok = False; continue
            if any(w[4] == "Stage" for w in ws) and self.mode in ("level", "status", "course", "header"):
                self.flush()
                cats = [w for w in ws if w[4] != "Stage" and w[0] >= 60]
                self.header = [[w[4], w[0], (w[0] + w[2]) / 2] for w in cats]
                self.header_y = y; self.mode = "header"; self.overflow = False; cont_ok = False; continue
            digits = any(RANK.match(w[4]) or PCT.match(w[4]) for w in ws)
            if self.mode == "header" and not digits and (self.header_y is None or y > self.header_y + 12) and self.header and all(re.fullmatch(r"[A-Z][A-Z0-9]{2,}", w[4]) for w in ws):
                self.flush()  # overflow columns: table too wide, remaining columns continue in a second header row
                self.header = [[w[4], w[0], (w[0] + w[2]) / 2] for w in ws]
                self.header_y = y; self.overflow = True; continue
            if self.mode == "header" and not digits and self.header_y is not None and y <= self.header_y + 12 and all(re.fullmatch(r"[A-Z]{1,4}", w[4]) for w in ws):
                for w in ws:  # wrapped header code, e.g. PWDROBC / S
                    tgt = min(self.header, key=lambda hh: abs(hh[1] - w[0]))
                    tgt[0] += w[4]
                continue
            if self.mode == "header" or (self.mode is None and cont_ok and self.header):
                self.section.append((y, ws)); continue
            if self.mode == "course" and self.course:
                self.course["name"] += " " + t
            elif self.mode == "college" and self.college:
                self.college["name"] += " " + t
                self.meta["inst"][self.college["code"]] = (self.year, self.college["name"])
            elif self.mode == "status":
                self.status += " " + t
            elif self.mode == "level":
                self.level += " " + t
            if self.course:
                m2 = re.search(r"Home University\s*:\s*(.+)$", self.status)
                self.meta["offer"][(self.year, self.course["code"])] = {"status": re.sub(r"\s*Home University\s*:.*$", "", self.status).strip(), "home": m2.group(1).strip() if m2 else ""}
        # keep section open across page break (continuation); flushed on next structural line
        if self.mode == "header" and self.section:
            pass

    def finish(self):
        self.flush()
        if self.course:
            m2 = re.search(r"Home University\s*:\s*(.+)$", self.status)
            self.meta["offer"][(self.year, self.course["code"])] = {"status": re.sub(r"\s*Home University\s*:.*$", "", self.status).strip(), "home": m2.group(1).strip() if m2 else ""}


def main(src, out):
    os.makedirs(out, exist_ok=True)
    meta = {"inst": {}, "course": {}, "offer": {}, "notes": set(), "files": []}
    cf = open(os.path.join(out, "cutoffs.csv"), "w", newline="")
    cw = csv.writer(cf)
    cw.writerow(["exam", "year", "cap_round", "track", "choice_code", "seat_level", "stage", "category", "merit_rank", "percentile"])
    wrapper = type("W", (), {"writerow": lambda s, r: cw.writerow(["MHT-CET"] + r)})()
    for f in sorted(glob.glob(os.path.join(src, "**", "*.pdf"), recursive=True)):
        m = re.match(r"(\d{4})ENGG_CAP(\d)_CutOff", os.path.basename(f))
        if not m or "Diploma" in f:
            print("skip", os.path.basename(f)); continue
        year, rnd = int(m.group(1)), int(m.group(2))
        fm = {"title": "", "notes": set(), "inst": meta["inst"], "course": meta["course"], "offer": meta["offer"]}
        P = Parser(year, rnd, "ENGG", wrapper, fm)
        d = pymupdf.open(f)
        for p in d:
            P.page(p)
        P.finish()
        meta["files"].append((year, rnd, "ENGG", os.path.basename(f), fm["title"], " | ".join(sorted(fm["notes"]))))
        print(os.path.basename(f), len(d), "pages", P.rows, "rows", dict(P.flags))
    cf.close()
    with open(os.path.join(out, "institutes.csv"), "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["dte_code", "name", "city", "last_year"])
        for k, (y, n) in sorted(meta["inst"].items()):
            n = re.sub(r"\s+", " ", n).strip()
            w.writerow([k, n, CITY_OVERRIDES.get(k) or (n.rsplit(",", 1)[-1].strip() if "," in n else ""), y])
    with open(os.path.join(out, "courses.csv"), "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["choice_code", "dte_code", "course_name"])
        for k, c in sorted(meta["course"].items()): w.writerow([k, c["college"], re.sub(r"\s+", " ", c["name"]).strip()])
    with open(os.path.join(out, "offerings.csv"), "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["year", "choice_code", "status", "home_university"])
        for (y, c), o in sorted(meta["offer"].items()): w.writerow([y, c, re.sub(r"\s+", " ", o["status"]).strip(), re.sub(r"\s+", " ", o["home"]).strip()])
    from categories import decode
    cats = sorted({r[7] for r in csv.reader(open(os.path.join(out, "cutoffs.csv"))) if r[7] != "category"})
    with open(os.path.join(out, "category_codes.csv"), "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["code", "kind", "gender", "base", "scope"])
        for c in cats:
            d = decode(c); w.writerow([c, d["kind"], d["gender"], d["base"] or "", d["scope"] or ""])
    with open(os.path.join(out, "seat_levels.csv"), "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["code", "description"])
        for r in [("STATE", "State level seats"), ("HU_SEATS_HU_CAND", "Home University seats allotted to Home University candidates"),
                  ("OHU_SEATS_OHU_CAND", "Other Than Home University seats allotted to Other Than Home University candidates"),
                  ("OHU_SEATS_HU_CAND", "Other Than Home University seats allotted to Home University candidates"),
                  ("HU_SEATS_OHU_CAND", "Home University seats allotted to Other Than Home University candidates"),
                  ("MINORITY", "Minority seats allotted to Maharashtra State candidature candidates"),
                  ("AI_STATE", "Maharashtra State seats allotted to All India candidates")]: w.writerow(r)
    with open(os.path.join(out, "sources.csv"), "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["year", "cap_round", "track", "file_name", "title", "rank_basis_notes"])
        for r in meta["files"]: w.writerow(r)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
