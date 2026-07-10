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
# Generators keep inventing new appended "tell" clauses; add each variant here.
TELLS = [
    " even though the passage frames the issue in more conditional and context-dependent terms",
    " while treating a qualified contrast as if it were the passage's final conclusion",
    " by flattening the passage's tension into a single unqualified rule",
    " in a way that ignores the passage's repeated movement between concession and critique",
    " and therefore misses the author's distinction between usefulness and overreach",
    " rather than preserving the author's emphasis on context, limits, and judgment",
]

# Regex forms of the same "tell": generators keep appending a meta-critique
# clause to wrong-answer CHOICE text with topic-parameterized wording, so exact
# strings in TELLS miss them. These strip a trailing appended clause (leading
# whitespace through end of string) regardless of the topic noun it names.
TELL_PATTERNS = [
    r"\s+and would make the (?:essay|author).*$",
    r"\s+because it converts a conditional warning .*$",
    r"\s+because it treats one pressure .*$",
    r"\s+because it moves the issue .*$",
    r"\s+and overlooks the passage.s effort .*$",
    r"\s+rather than preserving the author.s emphasis .*$",
    r"\s+by flattening the passage.s tension .*$",
    r"\s+while treating a qualified contrast .*$",
    r"\s+in a way that ignores the passage.s .*$",
    r"\s+and therefore misses the author.s distinction .*$",
]

# Substrings that mark a non-specific, boilerplate explanation worth flagging.
BOILERPLATE = [
    "This option is tempting because it uses language related",
    "The passage does not support the move made here",
    "This answer borrows language from the passage but turns it in the wrong direction",
    "This answer misreads a caution as a program of rejection",
    "This answer is too absolute for the passage's argument",
    "the author is concerned with the conditions under which the practice remains honest",
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


def passage_slop(passage, topic_area):
    """Flag machine-padding tells in a passage: a paragraph repeated verbatim,
    or the passage naming itself by its own title."""
    flags = []
    p = passage or ""
    if topic_area and topic_area in p:
        flags.append("names itself by title")
    # any 80+ char span that appears more than once
    for seg in re.split(r"(?<=[.?!])\s+", p):
        seg = seg.strip()
        if len(seg) >= 80 and p.count(seg) > 1:
            flags.append("repeats a sentence verbatim")
            break
    return flags


def clean_batch(d):
    stats = {"tells": 0, "hoisted": 0, "topics": 0, "difficulty": 0, "boilerplate_qs": [],
             "recycled": None, "lettermismatch_qs": [], "passage_slop": [], "meta_expl_qs": [],
             "distractors": []}
    wrong_texts = []  # first sentence of every distractor, across the batch
    ps = passage_slop(d.get("questions", [{}])[0].get("passage"), d.get("topicArea"))
    if ps:
        stats["passage_slop"] = ps
    for q in d.get("questions", []):
        # 1. hoist explanations if nested in choices
        if not isinstance(q.get("explanations"), dict):
            if isinstance(q.get("choices"), list) and q["choices"] and "explanation" in q["choices"][0]:
                q["explanations"] = {c["label"]: c.get("explanation", "") for c in q["choices"]}
                stats["hoisted"] += 1
        # normalize choices to {label: text}
        q["choices"] = normalize_choices(q.get("choices"))
        # 2. strip tells from choice text (literal phrases + parameterized patterns)
        for lab, txt in list(q["choices"].items()):
            new = txt
            for t in TELLS:
                if t in new:
                    new = new.replace(t, "")
                    stats["tells"] += 1
            for pat in TELL_PATTERNS:
                new2 = re.sub(pat, "", new)
                if new2 != new:
                    stats["tells"] += 1
                    new = new2
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
        correct = q.get("correct")
        if any(any(b in (exps.get(l) or "") for b in BOILERPLATE)
               for l in exps if l != correct):
            stats["boilerplate_qs"].append(q.get("id"))
        # flag explanations that reference a different choice letter than their own
        # (a sign the letters were shuffled without updating the text)
        for lab, ex in exps.items():
            refs = set(re.findall(r"[Cc]hoice ([A-D])\b", ex or ""))
            if refs and lab not in refs:
                stats["lettermismatch_qs"].append(q.get("id"))
                break
        # meta/test language leaking into explanations
        META = ("CARS-style", "CARS answer", "public judgment", "the test", "test-taker")
        if any(m in (exps.get(l) or "") for l in exps for m in META):
            stats["meta_expl_qs"].append(q.get("id"))
        # collect distractor fingerprints for recycling detection (+ cross-batch)
        for lab, txt in q["choices"].items():
            if lab != correct:
                wrong_texts.append(txt.split(". ")[0][:60])
                stats["distractors"].append(txt.strip())
        # reorder keys canonically
        extras = {k: v for k, v in q.items() if k not in CANON_ORDER}
        newq = {k: q[k] for k in CANON_ORDER if k in q}
        newq.update(extras)
        q.clear(); q.update(newq)
    # recycled distractors: few distinct wrong answers across the whole batch
    if wrong_texts:
        stats["recycled"] = (len(set(wrong_texts)), len(wrong_texts))
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
    recycled_batches = []
    mismatch = []
    passage_slop_batches = []
    meta_qs = []
    distractor_batches = {}  # distractor text -> set of batches it appears in
    for f in files:
        d = json.load(open(f))
        if d.get("section") != "cars":
            print(f"  skip {os.path.basename(f)} (section={d.get('section')!r}, not cars)")
            continue
        s = clean_batch(d)
        for k in total:
            total[k] += s[k]
        flagged += s["boilerplate_qs"]
        mismatch += s["lettermismatch_qs"]
        meta_qs += s["meta_expl_qs"]
        if s["passage_slop"]:
            passage_slop_batches.append((d.get("batch"), s["passage_slop"]))
        for dt in s["distractors"]:
            distractor_batches.setdefault(dt, set()).add(d.get("batch"))
        # recycled distractors: a healthy 7-question CARS batch has ~21 distinct
        # distractors; anything under ~14 means wrong answers are being reused.
        distinct, tot = s["recycled"] or (0, 0)
        recycled = distinct < max(4, tot * 0.6)
        if recycled:
            recycled_batches.append((d.get("batch"), distinct, tot))
        dest = f if args.in_place else os.path.join(out_dir, os.path.basename(f))
        with open(dest, "w") as fh:
            json.dump(d, fh, indent=2, ensure_ascii=False)
        flag = "  ⚠ RECYCLED DISTRACTORS" if recycled else ""
        print(f"  {os.path.basename(f)}: tells-stripped={s['tells']} hoisted={s['hoisted']} "
              f"topics-added={s['topics']} difficulty-normalized={s['difficulty']} "
              f"distinct-distractors={distinct}/{tot}{flag}")

    # cross-batch template reuse: same distractor text in 3+ different batches
    cross = {t: bs for t, bs in distractor_batches.items() if len(bs) >= 3}

    print(f"\nTotals: {total}")
    if passage_slop_batches:
        print(f"\n⛔ {len(passage_slop_batches)} passage(s) show machine-padding slop "
              f"(self-titling or a paragraph repeated verbatim — regenerate the passage):")
        for b, fl in passage_slop_batches:
            print(f"    {b}: {', '.join(fl)}")
    if cross:
        print(f"\n⛔ {len(cross)} distractor string(s) are REUSED VERBATIM across 3+ batches "
              f"(template questions with the topic word swapped — regenerate the questions):")
        for t, bs in sorted(cross.items(), key=lambda x: -len(x[1]))[:8]:
            print(f"    [{len(bs)} batches] {t[:70]}")
    if meta_qs:
        print(f"\n⚠ {len(meta_qs)} question(s) leak meta/test language into explanations "
              f"(e.g. 'CARS-style', 'public judgment'):")
        for qid in meta_qs:
            print(f"    {qid}")
    if recycled_batches:
        print(f"\n⛔ {len(recycled_batches)} batch(es) REUSE the same distractors across questions "
              f"(questions become trivially answerable — regenerate, do not import):")
        for b, dcount, tot in recycled_batches:
            print(f"    {b}: only {dcount} distinct distractors across {tot} slots")
    if mismatch:
        print(f"\n⚠ {len(mismatch)} question(s) have explanations that reference the WRONG choice "
              f"letter (letters shuffled without updating text):")
        for qid in mismatch:
            print(f"    {qid}")
    if flagged:
        print(f"\n⚠ {len(flagged)} question(s) have BOILERPLATE distractor explanations "
              f"(rewrite by hand for passage-specific reasoning):")
        for qid in flagged:
            print(f"    {qid}")
    if not (recycled_batches or mismatch or flagged or passage_slop_batches or cross or meta_qs):
        print("\nNo passage slop, template reuse, recycled distractors, letter "
              "mismatches, meta-language, or boilerplate detected.")
    print(f"\nOutput: {'in place' if args.in_place else out_dir}")


if __name__ == "__main__":
    main()
