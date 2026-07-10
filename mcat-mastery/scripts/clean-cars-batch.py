#!/usr/bin/env python3
"""
Clean CARS batch JSON into the app's canonical schema before import.

Fixes the recurring defects seen in externally generated CARS packages:
  1. Hoist per-choice `explanation` fields into a top-level `explanations`
     object keyed by choice label (the importer/app require this shape).
  2. Strip the distractor "tell" clause that some generations append to wrong
     answers, e.g. "... even though the passage frames the issue in more
     conditional and context-dependent terms" (a giveaway when it lands only
     on wrong answers). Add new giveaway phrases to TELLS as they appear.
  3. Normalize `difficulty` to Easy | Medium | Hard.
  4. Derive a CARS question-type `topic` from the stem when one is missing.

It does NOT rewrite generic/boilerplate distractor explanations — those need
passage-specific reasoning a human (or a fresh SME pass) must write. Instead it
REPORTS which questions still carry boilerplate so they can be revised by hand.

Usage:
  python3 scripts/clean-cars-batch.py --dir ~/Downloads/SomeCARSset
  python3 scripts/clean-cars-batch.py --dir ~/Downloads/SomeCARSset --out ~/Downloads/SomeCARSset/converted
  python3 scripts/clean-cars-batch.py --file ./B501_x.json --in-place
"""
import argparse, glob, json, os, re

# Giveaway clauses that should never appear in choice text. Extend as needed.
TELLS = [
    " even though the passage frames the issue in more conditional and context-dependent terms",
]

# Substrings that mark a non-specific, boilerplate explanation worth flagging.
BOILERPLATE = [
    "This option is tempting because it uses language related",
    "The passage does not support the move made here",
]

CANON_ORDER = ["id", "passage", "usePrevPassage", "stem", "choices", "correct",
               "explanations", "topic", "difficulty", "passageImage",
               "passageImageCaption"]


def norm_difficulty(d):
    if not d:
        return d
    return {"easy": "Easy", "medium": "Medium", "hard": "Hard"}.get(str(d).strip().lower(), d)


def derive_topic(stem):
    s = (stem or "").lower()
    if "most nearly" in s:
        return "Key Phrase Meaning"
    if "strengthen" in s:
        return "Strengthening the Argument"
    if "weaken" in s:
        return "Weakening the Argument"
    if "primary function" in s or "primarily serve" in s:
        if "example" in s or "reference to" in s or "discussion of" in s:
            return "Function of a Reference"
        if "paragraph" in s:
            return "Function of a Paragraph"
        return "Function of a Reference"
    if "disagree" in s:
        return "Author Disagreement"
    if "scenario" in s or "illustrat" in s or "exemplif" in s:
        return "Application"
    if "central argument" in s or "main idea" in s or "central thesis" in s or "main claim" in s:
        return "Main Idea"
    if "attitude" in s or "overall stance" in s or "stance toward" in s:
        return "Author's Attitude"
    if "tone" in s:
        return "Author's Tone"
    if "most likely agree" in s or "aligns" in s or "qualified agreement" in s or "perspective" in s:
        return "Author's Position"
    if ("would the author most likely" in s or "based on the passage" in s
            or "most likely view" in s or "least likely" in s or "consistent with" in s):
        return "Application"
    return "Inference"


def normalize_choices(ch):
    """Return choices as an object {label: text}, dropping any per-choice extras."""
    if isinstance(ch, dict):
        return {k: (v if isinstance(v, str) else v.get("text", "")) for k, v in ch.items()}
    out = {}
    for c in ch or []:
        out[c["label"]] = c["text"]
    return out


def clean_batch(d):
    stats = {"tells": 0, "hoisted": 0, "topics": 0, "difficulty": 0, "boilerplate_qs": []}
    for q in d.get("questions", []):
        # 1. hoist explanations if nested in choices
        if not isinstance(q.get("explanations"), dict):
            if isinstance(q.get("choices"), list) and q["choices"] and "explanation" in q["choices"][0]:
                q["explanations"] = {c["label"]: c.get("explanation", "") for c in q["choices"]}
                stats["hoisted"] += 1
        # normalize choices to {label: text}
        q["choices"] = normalize_choices(q.get("choices"))
        # 2. strip tells from choice text
        for lab, txt in list(q["choices"].items()):
            new = txt
            for t in TELLS:
                if t in new:
                    new = new.replace(t, "")
                    stats["tells"] += 1
            q["choices"][lab] = new.rstrip()
        # 3. difficulty
        nd = norm_difficulty(q.get("difficulty"))
        if nd != q.get("difficulty"):
            stats["difficulty"] += 1
        q["difficulty"] = nd
        # 4. topic
        if not q.get("topic"):
            q["topic"] = derive_topic(q.get("stem"))
            stats["topics"] += 1
        # flag boilerplate distractor explanations (report only)
        exps = q.get("explanations", {})
        if any(any(b in (exps.get(l) or "") for b in BOILERPLATE)
               for l in exps if l != q.get("correct")):
            stats["boilerplate_qs"].append(q.get("id"))
        # reorder keys canonically
        extras = {k: v for k, v in q.items() if k not in CANON_ORDER}
        newq = {k: q[k] for k in CANON_ORDER if k in q}
        newq.update(extras)
        q.clear(); q.update(newq)
    return stats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir")
    ap.add_argument("--file")
    ap.add_argument("--out", help="output dir (default: <dir>/converted)")
    ap.add_argument("--in-place", action="store_true")
    args = ap.parse_args()

    files = []
    if args.file:
        files = [args.file]
        base_dir = os.path.dirname(args.file)
    elif args.dir:
        files = sorted(glob.glob(os.path.join(args.dir, "B*.json")))
        base_dir = args.dir
    else:
        ap.error("pass --dir or --file")

    out_dir = None if args.in_place else (args.out or os.path.join(base_dir, "converted"))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    total = {"tells": 0, "hoisted": 0, "topics": 0, "difficulty": 0}
    flagged = []
    for f in files:
        d = json.load(open(f))
        if d.get("section") != "cars":
            print(f"  skip {os.path.basename(f)} (section={d.get('section')!r}, not cars)")
            continue
        s = clean_batch(d)
        for k in total:
            total[k] += s[k]
        flagged += s["boilerplate_qs"]
        dest = f if args.in_place else os.path.join(out_dir, os.path.basename(f))
        with open(dest, "w") as fh:
            json.dump(d, fh, indent=2, ensure_ascii=False)
        print(f"  {os.path.basename(f)}: tells-stripped={s['tells']} hoisted={s['hoisted']} "
              f"topics-added={s['topics']} difficulty-normalized={s['difficulty']}")

    print(f"\nTotals: {total}")
    if flagged:
        print(f"\n⚠ {len(flagged)} question(s) still have BOILERPLATE distractor explanations "
              f"(rewrite by hand for passage-specific reasoning):")
        for qid in flagged:
            print(f"    {qid}")
    else:
        print("\nNo boilerplate distractor explanations detected.")
    print(f"\nOutput: {'in place' if args.in_place else out_dir}")


if __name__ == "__main__":
    main()
