#!/usr/bin/env python3
"""
Passage Meta-Language Remediation Script

Processes affected MCAT batch files to:
1. Extract instructional/reasoning-guidance sentences into a new passageHelp field
2. Strip explicit MCAT references and reword to flow naturally
3. Delete pure boilerplate padding
4. Handle B142 CARS edge case

Usage:
  python3 scripts/remediate-passages.py                    # dry run
  python3 scripts/remediate-passages.py --apply            # write changes
  python3 scripts/remediate-passages.py --file B301*.json  # single file
"""

import json
import os
import re
import sys
import glob
import copy
from pathlib import Path

BATCH_DIR = Path(__file__).resolve().parent.parent / "batches"

# ── Sentences to DELETE entirely (no educational value) ──────────────────────
DELETE_EXACT = {
    "The passage is designed to test integrated Chemical and Physical Foundations reasoning.",
    "This mirrors MCAT C/P reasoning because experimental context and core equations are intertwined.",
    "The same design principle applies to the additional measurements described in the passage.",
}

DELETE_PATTERNS = [
    re.compile(r"This style mirrors C/P reasoning on the MCAT[:\s].*?(?:\.|$)", re.I),
    re.compile(r"Researchers designed a passage-based MCAT-style experiment\b", re.I),
    re.compile(r"The investigators framed the study as an MCAT-style example\b.*?(?:\.\s|$)", re.I),
]

# ── Sentences to MOVE to passageHelp ────────────────────────────────────────
HELP_PATTERNS = [
    # Self-referential "the passage" used in instructional way
    re.compile(r"The passage (therefore requires|is therefore intended to support|intentionally does not|was designed so that|therefore treats|requires separating|requires interpreting|therefore values|refuses to choose)\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "A student evaluating/interpreting/who coordinates the passage"
    re.compile(r"A student (evaluating|interpreting|who coordinates) the passage\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "Students should/must/interpreting"
    re.compile(r"Students (should therefore|interpreting the passage|who read only for)\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # Reasoning guidance: "A strong/correct/careful answer/interpretation"
    re.compile(r"(?:A (?:strong|correct|careful|competing) (?:answer|interpretation|reader)|The strongest (?:answer|interpretation))\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The interpretive problem was to"
    re.compile(r"The interpretive problem was to\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "Taken together, the results required students"
    re.compile(r"Taken together, the results required students\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The experimental design required students"
    re.compile(r"The experimental design required students\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The calculation is intentionally"
    re.compile(r"The calculation is intentionally\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "Several answer choices in the associated questions"
    re.compile(r"Several answer choices in the associated questions\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The answer choices were written to test"
    re.compile(r"The answer choices were written to test\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "Answers that merely" (repeat/name/restate)
    re.compile(r"Answers that merely\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The strongest answer to a passage-based question"
    re.compile(r"The strongest answer to a passage-based question\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "In this passage, the most defensible interpretation"
    re.compile(r"In this passage, the most defensible interpretation\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The most defensible reading is"
    re.compile(r"The most defensible reading is\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "This is the type of reasoning expected"
    re.compile(r"This is the type of reasoning expected\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "This is the intended MCAT-style reasoning demand"
    re.compile(r"This is the intended (?:MCAT-style )?reasoning demand\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "In interpreting the study, the reader should"
    re.compile(r"In interpreting the study, the reader should\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The data were designed to separate"
    re.compile(r"The data were designed to separate\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "Several alternative explanations were plausible"
    re.compile(r"Several alternative explanations were plausible\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # Passage self-reference about figure
    re.compile(r"They also warned that treating the figure as a simple proof\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The passage is therefore intended"
    re.compile(r"The passage is therefore intended\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "However, the passage does not claim"
    re.compile(r"However, the passage does not claim\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "Several quantitative details were reported so that students"
    re.compile(r"Several quantitative details were reported so that students\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The researchers concluded that the data supported a specific model, but they noted that the passage"
    re.compile(r"The researchers concluded that the data supported a specific model, but they noted that the passage\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "A student who memorizes a phrase"
    re.compile(r"A student who memorizes a phrase\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "A student who coordinates the passage"
    re.compile(r"A student who coordinates the passage\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # Soft instructional framing about constructs
    re.compile(r"This distinction was important: a psychological construct\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "A careful reader must therefore combine"
    re.compile(r"A careful reader must therefore combine\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The passage intentionally does not restate"
    re.compile(r"The passage intentionally does not restate\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "Students interpreting the passage should therefore"
    re.compile(r"Students interpreting the passage should therefore\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The passage was designed so that students"
    re.compile(r"The passage was designed so that students\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "It should explain the direction of the measured change"
    re.compile(r"It should explain the direction of the measured change\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "These controls matter because MCAT/section-name" (has useful reasoning guidance)
    re.compile(r"These controls matter because\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "A careful MCAT-style interpretation asks"
    re.compile(r"A careful (?:MCAT-style )?interpretation asks\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The investigators emphasized that a correct MCAT-style interpretation"
    re.compile(r"The investigators emphasized that a correct\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The passage is not primarily asking"
    re.compile(r"The passage is not primarily asking\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "Controls such as equal loading"
    re.compile(r"Controls such as equal loading\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "The investigators emphasized that these baseline variables"
    re.compile(r"The investigators emphasized that these baseline variables\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "A change in a pathway readout"
    re.compile(r"A change in a pathway readout\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    # "A competing interpretation"
    re.compile(r"A competing interpretation\b.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
]

# ── MCAT reference rewording rules ──────────────────────────────────────────
MCAT_REWRITES = [
    # Specific multi-word phrases first (order matters)
    (re.compile(r"\ba passage-based MCAT-style experiment\b", re.I), "an experiment"),
    (re.compile(r"\bpassage-based MCAT-style experiment\b", re.I), "experiment"),
    (re.compile(r"\ba correct MCAT-style interpretation\b", re.I), "a correct interpretation"),
    (re.compile(r"\ban MCAT-style interpretation\b", re.I), "an interpretation"),
    (re.compile(r"\bMCAT-style experiment\b", re.I), "experiment"),
    (re.compile(r"\bMCAT-style reasoning\b", re.I), "analytical reasoning"),
    (re.compile(r"\bMCAT-style interpretation\b", re.I), "interpretation"),
    (re.compile(r"\bMCAT-style example\b", re.I), "an example"),
    (re.compile(r"\bMCAT C/P reasoning\b", re.I), "analytical reasoning"),
    (re.compile(r"\bMCAT-style\b", re.I), ""),
    (re.compile(r"\bon the MCAT\b", re.I), ""),
    (re.compile(r"\bfor the MCAT\b", re.I), ""),
    (re.compile(r"\bMCAT\b"), ""),
    # Exam section names
    (re.compile(r"\bChemical and Physical Foundations\b"), "the physical sciences"),
    (re.compile(r"\bBiological and Biochemical Foundations\b"), "the biological sciences"),
    (re.compile(r"\bpassage-based Bio/Biochem questions\b", re.I), "passage-based questions"),
    (re.compile(r"\bBio/Biochem\b"), "biology and biochemistry"),
    (re.compile(r"\bChem/Phys\b"), "chemistry and physics"),
    (re.compile(r"\bPsych/Soc\b"), "psychology and sociology"),
    (re.compile(r"\bC/P reasoning\b"), "analytical reasoning"),
    (re.compile(r"\bB/B reasoning\b"), "analytical reasoning"),
    (re.compile(r"\bP/S reasoning\b"), "analytical reasoning"),
]

# Fix articles left dangling after rewrites ("a experiment" -> "an experiment")
ARTICLE_FIX = re.compile(r'\ba (experiment|interpretation|example|analytical)\b', re.I)

# ── Delete patterns (sentences with zero educational value) ─────────────────
DELETE_SENTENCE_PATTERNS = [
    re.compile(r"This style mirrors C/P reasoning on the MCAT.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    re.compile(r"This mirrors MCAT C/P reasoning because.*?(?:\.\s|\.\"?\s*$)", re.I | re.S),
    re.compile(r"The passage is designed to test integrated Chemical and Physical Foundations reasoning\.", re.I),
    re.compile(r"The same design principle applies to the additional measurements described in the passage\.", re.I),
]

# ── B142 CARS specific fix ──────────────────────────────────────────────────
B142_REWRITES = [
    (re.compile(r"strategies for eliminating distractors rather than evaluating arguments"), "strategies for selecting answers rather than evaluating arguments"),
    (re.compile(r"reverse-engineered from answer keys"), "reverse-engineered from expected results"),
]


def split_into_sentences(text):
    """Split text into sentences, preserving whitespace context."""
    parts = re.split(r'(?<=[.!?])\s+', text)
    return [p.strip() for p in parts if p.strip()]


def extract_help_and_clean(passage):
    """
    Process a passage:
    1. Extract sentences matching HELP_PATTERNS into help_text
    2. Delete sentences matching DELETE patterns
    3. Apply MCAT rewrites to remaining text
    Returns (cleaned_passage, help_text_or_None)
    """
    if not passage:
        return passage, None

    help_sentences = []
    working = passage

    # First pass: extract help-worthy sentences
    for pattern in HELP_PATTERNS:
        matches = list(pattern.finditer(working))
        for m in reversed(matches):
            sentence = m.group(0).strip()
            if sentence:
                # Clean MCAT language from the help text too
                clean_sentence = sentence
                for pat, repl in MCAT_REWRITES:
                    clean_sentence = pat.sub(repl, clean_sentence)
                clean_sentence = re.sub(r'\s{2,}', ' ', clean_sentence).strip()
                if clean_sentence:
                    help_sentences.append(clean_sentence)
            working = working[:m.start()] + working[m.end():]

    # Second pass: delete boilerplate
    for pattern in DELETE_SENTENCE_PATTERNS:
        working = pattern.sub('', working)

    # Also delete exact matches
    for exact in DELETE_EXACT:
        working = working.replace(exact, '')

    # Third pass: apply MCAT rewrites to remaining passage text
    for pattern, replacement in MCAT_REWRITES:
        working = pattern.sub(replacement, working)

    # Fix dangling articles after rewrites
    working = ARTICLE_FIX.sub(lambda m: f'an {m.group(1)}', working)

    # Clean up whitespace artifacts
    working = re.sub(r'\n{3,}', '\n\n', working)
    working = re.sub(r'  +', ' ', working)
    working = re.sub(r' \n', '\n', working)
    working = re.sub(r'\n ', '\n', working)
    working = working.strip()

    # Build help text (deduplicate, reverse to maintain passage order)
    help_sentences.reverse()
    seen = set()
    unique_help = []
    for s in help_sentences:
        normalized = re.sub(r'\s+', ' ', s.lower().strip())
        if normalized not in seen:
            seen.add(normalized)
            unique_help.append(s)

    help_text = '\n\n'.join(unique_help) if unique_help else None

    return working, help_text


def process_b142(passage):
    """Special handling for B142 CARS: fix 'distractors' and 'answer keys'."""
    result = passage
    for pattern, replacement in B142_REWRITES:
        result = pattern.sub(replacement, result)
    return result


def has_meta_language(passage):
    """Check if a passage contains any meta-language that needs remediation."""
    if not passage:
        return False
    checks = [
        r'\bMCAT\b',
        r'\bpassage-based MCAT',
        r'answer choice',
        r'\bdistractor\b',
        r'the passage (therefore requires|is therefore intended|intentionally does not|was designed)',
        r'students (should therefore|interpreting the passage|who read only for|must decide)',
        r'(strong|correct|careful) (answer|interpretation)',
        r'The interpretive problem was',
        r'the results required students',
        r'The experimental design required students',
        r'The calculation is intentionally',
        r'answer choices in the associated questions',
        r'passage-based question',
        r'Chemical and Physical Foundations',
        r'Biological and Biochemical Foundations',
        r'Bio/Biochem',
        r'Chem/Phys',
        r'\bC/P reasoning\b',
        r'This style mirrors',
        r'This mirrors MCAT',
        r'MCAT-style',
        r'reasoning demand',
        r'passage is designed to test',
        r'Researchers designed a passage-based',
        r'buzzword',
        r'tempting misconception',
        r'tempting alternative',
        r'vocabulary recall',
        r'The data were designed to separate',
        r'the reader should',
        r'This distinction was important: a psychological construct',
        r'A careful reader must therefore',
        r'They also warned that treating the figure as a simple proof',
        r'Several quantitative details were reported so that students',
        r'These controls matter because',
        r'A student evaluating the passage',
        r'A student who memorizes',
        r'A student who coordinates',
        r'The passage does not claim',
        r'The passage is not primarily asking',
        r'Controls such as equal loading',
        r'The investigators emphasized that these baseline',
        r'The investigators emphasized that a correct',
        r'A change in a pathway readout',
        r'A competing interpretation may sound',
        r'The researchers concluded.*the passage evidence',
        r'The investigators framed the study',
        r'The passage therefore requires',
        r'Answers that merely',
        r'The answer choices were written',
        r'It should explain the direction',
    ]
    for check in checks:
        if re.search(check, passage, re.I):
            return True
    return False


def process_file(filepath, dry_run=True):
    """Process a single batch file. Returns (changed, stats_dict)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    batch_id = data.get('batch', '')
    section = data.get('section', '')
    changed = False
    stats = {
        'file': os.path.basename(filepath),
        'batch': batch_id,
        'section': section,
        'passages_cleaned': 0,
        'help_sections_created': 0,
        'mcat_refs_removed': 0,
        'sentences_moved_to_help': 0,
        'sentences_deleted': 0,
    }

    for q in data.get('questions', []):
        passage = q.get('passage', '')
        if not passage:
            continue

        # B142 CARS special case
        if batch_id == 'B142' and section == 'cars':
            new_passage = process_b142(passage)
            if new_passage != passage:
                q['passage'] = new_passage
                changed = True
                stats['passages_cleaned'] += 1
                stats['mcat_refs_removed'] += 1
            continue

        # Check if this passage needs remediation
        if not has_meta_language(passage):
            continue

        original_passage = passage
        cleaned_passage, help_text = extract_help_and_clean(passage)

        if cleaned_passage != original_passage or help_text:
            changed = True
            stats['passages_cleaned'] += 1

            if help_text:
                q['passageHelp'] = help_text
                stats['help_sections_created'] += 1
                stats['sentences_moved_to_help'] += help_text.count('\n\n') + 1

            # Count MCAT removals
            mcat_original = len(re.findall(r'\bMCAT\b', original_passage))
            mcat_cleaned = len(re.findall(r'\bMCAT\b', cleaned_passage))
            stats['mcat_refs_removed'] += mcat_original - mcat_cleaned

            q['passage'] = cleaned_passage

    if changed and not dry_run:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')

    return changed, stats


def main():
    args = sys.argv[1:]
    dry_run = '--apply' not in args
    file_pattern = None

    for i, arg in enumerate(args):
        if arg == '--file' and i + 1 < len(args):
            file_pattern = args[i + 1]

    if file_pattern:
        files = sorted(glob.glob(str(BATCH_DIR / file_pattern)))
    else:
        files = sorted(glob.glob(str(BATCH_DIR / 'B*.json')))

    if not files:
        print(f"No files found in {BATCH_DIR}")
        sys.exit(1)

    mode = "DRY RUN" if dry_run else "APPLYING CHANGES"
    print(f"\n{'='*60}")
    print(f"  Passage Meta-Language Remediation — {mode}")
    print(f"  Scanning {len(files)} files in {BATCH_DIR}")
    print(f"{'='*60}\n")

    total_stats = {
        'files_changed': 0,
        'passages_cleaned': 0,
        'help_sections_created': 0,
        'mcat_refs_removed': 0,
        'sentences_moved_to_help': 0,
    }

    changed_files = []

    for filepath in files:
        changed, stats = process_file(filepath, dry_run=dry_run)
        if changed:
            total_stats['files_changed'] += 1
            total_stats['passages_cleaned'] += stats['passages_cleaned']
            total_stats['help_sections_created'] += stats['help_sections_created']
            total_stats['mcat_refs_removed'] += stats['mcat_refs_removed']
            total_stats['sentences_moved_to_help'] += stats['sentences_moved_to_help']
            changed_files.append(stats)
            print(f"  {'[WOULD CHANGE]' if dry_run else '[CHANGED]'} {stats['file']}"
                  f"  passages={stats['passages_cleaned']}"
                  f"  help={stats['help_sections_created']}"
                  f"  mcat_removed={stats['mcat_refs_removed']}")

    print(f"\n{'='*60}")
    print(f"  Summary")
    print(f"{'='*60}")
    print(f"  Files changed:          {total_stats['files_changed']}")
    print(f"  Passages cleaned:       {total_stats['passages_cleaned']}")
    print(f"  Help sections created:  {total_stats['help_sections_created']}")
    print(f"  MCAT refs removed:      {total_stats['mcat_refs_removed']}")
    print(f"  Sentences to help:      {total_stats['sentences_moved_to_help']}")

    if dry_run:
        print(f"\n  This was a DRY RUN. Run with --apply to write changes.")
    else:
        print(f"\n  Changes written. Re-import affected batches with:")
        print(f"  npm run import-questions -- --dir ./batches/")

    # Post-check: verify no passage still contains MCAT
    if not dry_run:
        print(f"\n  Running post-check...")
        remaining = 0
        for filepath in files:
            with open(filepath, 'r') as f:
                data = json.load(f)
            for q in data.get('questions', []):
                p = q.get('passage', '')
                if p and re.search(r'\bMCAT\b', p):
                    remaining += 1
                    print(f"    STILL HAS MCAT: {os.path.basename(filepath)} Q={q['id']}")
        if remaining == 0:
            print(f"    ✓ No remaining MCAT references in any passage")
        else:
            print(f"    ⚠ {remaining} passages still contain MCAT references")


if __name__ == '__main__':
    main()
