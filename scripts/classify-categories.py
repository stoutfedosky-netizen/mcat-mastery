#!/usr/bin/env python3
"""
Classify each question batch into an AAMC content category (e.g. 1A, 4E, 6A)
based on its section + topicArea label.

CARS has no content categories, so CARS batches are skipped.
A handful of P/S "research methods / statistics" batches map to the MCAT's
Scientific Inquiry & Reasoning Skills rather than a content category; those are
tagged null and surface in the review as UNCATEGORIZED.

Usage:
    python3 scripts/classify-categories.py            # writes scripts/batch-categories.json
    python3 scripts/classify-categories.py --review   # prints a human-readable table
"""
import json, glob, os, sys, re

BATCH_DIR = os.path.join(os.path.dirname(__file__), "..", "batches")

# Ordered rules per section: (regex tested against lowercased topicArea) -> category code.
# First match wins, so put more specific patterns first.
RULES = {
    "cp": [
        (r"chromatograph|spectroscop|separation|purification|electrophoresis|molecular (structure|identification)", "5C"),
        (r"nuclear|radioactiv|atomic structure|periodic|electronic structure|isotop", "4E"),
        (r"organic|functional group|stereochem|chirality|carbonyl|carboxylic|sn1|sn2|e1|e2|aromatic|reactivity|amino acid chem", "5D"),
        (r"optic|light|lens|mirror|refraction|diffraction|electromagnetic radiation", "4D"),
        (r"sound|wave|doppler|harmonic|pendulum|standing wave|interference", "4D"),
        (r"fluid|hemodynamic|poiseuille|bernoulli|buoyanc|viscosity|pressure|flow|solids", "4B"),
        (r"circuit|capacit|magnet|electrostat|electric field|bioelectric|electrochem|redox|galvanic|nernst|electrolysis|batter", "4C"),
        (r"acid|base|buffer|titration|ksp|solubilit|colligative|osmo|water & solution|solution", "5A"),
        (r"thermo|calorimet|hess|gas law|ideal gas|kinetic molecular|kinetic|equilibrium|le chatelier|arrhenius|catalysis|energy diagram|phase change|reaction rate|reaction energy|free energy", "5E"),
        (r"molecule|intermolecular|bond", "5B"),
        (r"motion|force|work|energy|equilibrium|kinematic|torque|rotational|projectile|circular|spring|biomechanic|mechanic|power", "4A"),
    ],
    "bb": [
        (r"protein (structure|purification|traffick|sorting)|amino acid|protein structure", "1A"),
        (r"gene expression|transcription|translation|molecular (genetics|biology)|biotechnolog|\bpcr\b|gel electrophoresis|blotting|gene editing|qpcr|genome techniqu|operon", "1B"),
        (r"mendelian|pedigree|population genetics|hardy-weinberg|heredity|genetic diversity|dna replication|dna repair|evolution|linkage|inheritance|chromatin|epigenetic|natural selection", "1C"),
        (r"enzyme|metabolism|bioenerget|glycolysis|tca|oxidative phosphoryl|electron transport|lipid metab|fatty acid|ketogenesis|gluconeogenesis|fed-fasting|fasting|insulin signaling|hepatic metab|mitochondri|metabolic", "1D"),
        (r"cell signaling|second messenger|kinase|gpcr|receptor|signal transduction|signal amplification", "2A"),
        (r"cytoskeleton|extracellular matrix|cell migration|organelle|membrane transport|membrane dynamic|membranes|cell biology|cell physiology|protein degradation", "2A"),
        (r"microbiolog|virus|viral|bacteri|prokaryote|antibiotic resistance", "2B"),
        (r"cell cycle|cell division|cancer|apoptosis|tumor|embryo|development|differentiation", "2C"),
        (r"nervous|neuro|synaptic|neurotransmit|endocrine|hormon|thyroid|adrenal|ion channel|sensory transduction", "3A"),
        (r"cardiovascular|cardiac|respiratory|renal|kidney|nephron|digestive|immun|hematolog|blood|oxygen transport|musculoskeletal|muscle|reproduct|homeostasis|gas exchange|acid-base|electrolyte|nitrogen|urea|physiolog|organ|ecology|host defense", "3B"),
    ],
    "ps": [
        # research methods / statistics -> not a content category
        (r"research method|research design|biostatist|statistic|data interpretation|measurement|validity|experimental design|scientific", None),
        (r"sensation|sensory|psychophysic|perception & sensation|pain|sensing the environment", "6A"),
        (r"perception|attention|cognition|memory|language|consciousness|sleep|decision (making|bias)|substance use|psychoactive|aging (&|,) cognitive|cognitive health", "6B"),
        (r"emotion|stress|coping|motivation|reward|well-being", "6C"),
        (r"psychological disorder|mental health|treatment|personality|biological bases|brain region|lateralization", "7A"),
        (r"development|life course|adolescen|life span|lifespan|caregiving|family structure", "7A"),
        (r"conformity|obedience|group dynamic|group process|social influence|social process|helping behavior|prosocial|aggression|altruism", "7B"),
        (r"learning|conditioning|reinforcement|habit|behavior change|addiction|attitudes|persuasion|media effect", "7C"),
        (r"self|identity|socialization", "8A"),
        (r"social cognition|social thinking|bias|attribution|stereotype|prejudice|discrimination|deviance|social control|norms|stigma", "8B"),
        (r"social interaction|social network|group", "8C"),
        (r"institution|medicalization|bureaucracy|medical sociology|culture|globalization|urbanization|social structure|demography|demographic", "9A"),
        (r"demographic|population|migration", "9B"),
        (r"inequalit|stratification|health disparit|health equity|social determinant|social class|mobility|epidemiolog|access|health behavior|health belief|prevention|illness behavior|social epidemiolog", "10A"),
    ],
}


def classify(section, topic_area):
    ta = (topic_area or "").lower()
    for pattern, code in RULES.get(section, []):
        if re.search(pattern, ta):
            return code
    return "UNMATCHED"


def main():
    review = "--review" in sys.argv
    results = {}
    unmatched = []
    uncategorized = []
    for f in sorted(glob.glob(os.path.join(BATCH_DIR, "B*.json"))):
        try:
            d = json.load(open(f))
        except Exception:
            continue
        if not isinstance(d, dict):
            continue
        section = d.get("section")
        if not section or section == "cars":
            continue
        batch = d.get("batch")
        ta = d.get("topicArea")
        code = classify(section, ta)
        results[batch] = {"section": section, "topicArea": ta, "category": code}
        if code == "UNMATCHED":
            unmatched.append((batch, section, ta))
        elif code is None:
            uncategorized.append((batch, section, ta))

    out_path = os.path.join(os.path.dirname(__file__), "batch-categories.json")
    with open(out_path, "w") as fh:
        json.dump(results, fh, indent=2)

    if review:
        by_code = {}
        for b, r in results.items():
            by_code.setdefault(str(r["category"]), []).append((b, r["topicArea"]))
        for code in sorted(by_code):
            print(f"\n=== {code} ({len(by_code[code])}) ===")
            for b, ta in sorted(by_code[code]):
                print(f"  {b}  {ta}")

    print(f"\nTotal classified: {len(results)}")
    print(f"UNMATCHED (need a rule): {len(unmatched)}")
    for b, s, ta in unmatched:
        print(f"  {b} [{s}] {ta}")
    print(f"UNCATEGORIZED (research/skills, tagged null): {len(uncategorized)}")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
