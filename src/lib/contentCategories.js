// Canonical AAMC MCAT content categories (e.g. 1A, 4E, 6A).
// CARS is a skills section and has no content categories, so it is omitted here.
// Each category belongs to one exam section (matching SECTIONS ids in examData.js).

export const CONTENT_CATEGORIES = [
  // Biological & Biochemical Foundations (bb)
  { code: "1A", section: "bb", name: "Structure & function of proteins and amino acids" },
  { code: "1B", section: "bb", name: "Transmission of genetic information (gene to protein)" },
  { code: "1C", section: "bb", name: "Heredity & genetic diversity" },
  { code: "1D", section: "bb", name: "Bioenergetics & fuel molecule metabolism" },
  { code: "2A", section: "bb", name: "Cell & tissue structure; cell biology" },
  { code: "2B", section: "bb", name: "Prokaryotes & viruses" },
  { code: "2C", section: "bb", name: "Cell division, differentiation & development" },
  { code: "3A", section: "bb", name: "Nervous & endocrine systems" },
  { code: "3B", section: "bb", name: "Circulatory, immune, respiratory & other organ systems" },

  // Chemical & Physical Foundations (cp)
  { code: "4A", section: "cp", name: "Translational motion, forces, work, energy, equilibrium" },
  { code: "4B", section: "cp", name: "Fluids, gas exchange & circulation" },
  { code: "4C", section: "cp", name: "Electrochemistry & electrical circuits" },
  { code: "4D", section: "cp", name: "Light & sound" },
  { code: "4E", section: "cp", name: "Atoms, nuclear decay, electronic structure & bonds" },
  { code: "5A", section: "cp", name: "Water, solutions, acid-base & solubility" },
  { code: "5B", section: "cp", name: "Nature of molecules & intermolecular interactions" },
  { code: "5C", section: "cp", name: "Separation & purification methods" },
  { code: "5D", section: "cp", name: "Structure, function & reactivity of organic molecules" },
  { code: "5E", section: "cp", name: "Chemical thermodynamics & kinetics" },

  // Psychological, Social & Biological Foundations (ps)
  { code: "6A", section: "ps", name: "Sensing the environment" },
  { code: "6B", section: "ps", name: "Making sense of the environment (cognition, memory)" },
  { code: "6C", section: "ps", name: "Responding to the world (emotion, stress)" },
  { code: "7A", section: "ps", name: "Individual influences on behavior" },
  { code: "7B", section: "ps", name: "Social processes that influence behavior" },
  { code: "7C", section: "ps", name: "Attitude & behavior change; learning" },
  { code: "8A", section: "ps", name: "Self-identity" },
  { code: "8B", section: "ps", name: "Social thinking (attribution, bias, stereotypes)" },
  { code: "8C", section: "ps", name: "Social interactions" },
  { code: "9A", section: "ps", name: "Social structure & institutions" },
  { code: "9B", section: "ps", name: "Demographic characteristics & processes" },
  { code: "10A", section: "ps", name: "Social inequality" },
];

// Fast lookup: code -> category object.
export const CATEGORY_BY_CODE = CONTENT_CATEGORIES.reduce((acc, c) => {
  acc[c.code] = c;
  return acc;
}, {});

// Valid codes for import-time validation.
export const VALID_CATEGORY_CODES = new Set(CONTENT_CATEGORIES.map((c) => c.code));

export function categoriesForSection(sectionId) {
  return CONTENT_CATEGORIES.filter((c) => c.section === sectionId);
}
