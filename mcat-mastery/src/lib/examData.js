export const SECTIONS = [
  { id: "cp", name: "Chemical & Physical Foundations", abbr: "C/P", color: "#0891b2" },
  { id: "cars", name: "Critical Analysis & Reasoning", abbr: "CARS", color: "#7c3aed" },
  { id: "bb", name: "Biological & Biochemical Foundations", abbr: "B/B", color: "#059669" },
  { id: "ps", name: "Psychological, Social & Bio Foundations", abbr: "P/S", color: "#e11d48" },
];

export function normalizeChoices(choices) {
  if (Array.isArray(choices)) return choices;
  if (choices && typeof choices === "object") {
    return Object.entries(choices).map(([label, text]) => ({ label, text }));
  }
  return [];
}

export function mapQuestion(q) {
  return {
    id: q.id,
    passage: q.passage,
    passageImage: q.passage_image,
    passageImageCaption: q.passage_image_caption,
    usePrevPassage: q.use_prev_passage,
    stem: q.stem,
    choices: normalizeChoices(q.choices),
    correct: q.correct_answer,
    explanations: q.explanations,
    topic: q.topic,
    difficulty: q.difficulty,
    batch: q.batch,
    sectionId: q.section_id,
  };
}

// Groups questions by passage boundaries, shuffles the groups, and picks
// whole groups until the requested count is reached.
export function selectQuestions(allQuestions, count) {
  if (count >= allQuestions.length) return allQuestions;

  const groups = [];
  let current = [];
  for (const q of allQuestions) {
    if (q.passage) {
      if (current.length) groups.push(current);
      current = [q];
    } else if (current.length > 0 && q.batch === current[0].batch && q.section_id === current[0].section_id) {
      current.push(q);
    } else {
      if (current.length) groups.push(current);
      current = [q];
    }
  }
  if (current.length) groups.push(current);

  for (let i = groups.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [groups[i], groups[j]] = [groups[j], groups[i]];
  }

  const selected = [];
  for (const group of groups) {
    if (selected.length >= count) break;
    if (selected.length + group.length <= count) {
      selected.push(...group);
    }
  }

  return selected;
}

export function applyFilters(questions, { selectedTopics, statusFilter, seenQuestionIds, missedQuestionIds, flaggedQuestionIds }) {
  let filtered = questions;

  if (selectedTopics.length > 0) {
    const matchBatches = new Set();
    filtered.forEach((q) => {
      if (selectedTopics.includes(q.topic)) {
        matchBatches.add(`${q.section_id}|${q.batch}`);
      }
    });
    filtered = filtered.filter((q) => matchBatches.has(`${q.section_id}|${q.batch}`));
  }

  if (statusFilter !== "all") {
    let filterSet;
    if (statusFilter === "unseen") {
      filterSet = new Set(filtered.map((q) => q.id).filter((id) => !seenQuestionIds.has(id)));
    } else if (statusFilter === "incorrect") {
      filterSet = missedQuestionIds;
    } else {
      filterSet = flaggedQuestionIds;
    }

    const matchBatches = new Set();
    filtered.forEach((q) => {
      if (filterSet.has(q.id)) {
        matchBatches.add(`${q.section_id}|${q.batch}`);
      }
    });
    filtered = filtered.filter((q) => matchBatches.has(`${q.section_id}|${q.batch}`));
  }

  return filtered;
}
