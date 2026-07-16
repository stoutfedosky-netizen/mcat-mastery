#!/usr/bin/env node
/**
 * MCAT Mastery — Question Import Script
 *
 * Loads question batch JSON files into Supabase.
 *
 * Usage:
 *   npm run import-questions -- --file ./batches/B001_Fluids_Circulation.json
 *   npm run import-questions -- --dir ./batches/
 *
 * Flags:
 *   --replace-batch   After upserting, delete any questions already in the DB
 *                     for that batch id that are NOT in the file (so the DB
 *                     matches the file exactly). Questions that already have
 *                     student attempts can't be deleted and are kept + reported.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Whether the questions table has a content_category column. Probed once at
// startup so imports work whether or not sql/content-category-migration.sql has
// been run; if absent, the field is simply omitted from the upsert.
let HAS_CATEGORY_COLUMN = true;

// Batch -> AAMC content category map, produced by scripts/classify-categories.py.
// Used as a fallback when a batch file doesn't specify `contentCategory` itself.
let CATEGORY_MAP = {};
try {
  CATEGORY_MAP = JSON.parse(
    fs.readFileSync(path.join(__dirname, "batch-categories.json"), "utf-8")
  );
} catch {
  console.warn("  (no batch-categories.json found — content_category will be null unless set per-batch)");
}

function normalizeChoices(choices) {
  if (Array.isArray(choices)) return choices;
  if (choices && typeof choices === "object") {
    return Object.entries(choices).map(([label, text]) => ({ label, text }));
  }
  return [];
}

function validateBatch(batch, filePath) {
  const warnings = [];
  const errors = [];

  if (!batch.batch) errors.push("Missing batch ID");
  if (!batch.section) errors.push("Missing section");
  if (!batch.questions || !batch.questions.length) errors.push("No questions");

  for (let i = 0; i < (batch.questions || []).length; i++) {
    const q = batch.questions[i];
    const label = `Q[${i}] ${q.id || "(no id)"}`;

    if (!q.id) errors.push(`${label}: missing id`);
    if (!q.stem) errors.push(`${label}: missing stem`);
    if (!q.correct) errors.push(`${label}: missing correct answer`);
    if (!q.explanations || typeof q.explanations !== "object") {
      errors.push(`${label}: missing or invalid explanations`);
    }

    // Validate choices format
    const choices = normalizeChoices(q.choices);
    if (choices.length === 0) {
      errors.push(`${label}: missing or empty choices`);
    } else if (!Array.isArray(q.choices)) {
      warnings.push(`${label}: choices is an object, will auto-convert to array`);
    }
    for (const c of choices) {
      if (!c.label) errors.push(`${label}: choice missing label`);
      if (c.text === undefined || c.text === null) errors.push(`${label}: choice "${c.label}" missing text`);
    }

    // Validate CARS passage length
    if (batch.section === "cars" && q.passage) {
      const wordCount = q.passage.split(/\s+/).length;
      if (wordCount < 200) {
        errors.push(`${label}: CARS passage too short (${wordCount} words, minimum 200)`);
      } else if (wordCount < 400) {
        warnings.push(`${label}: CARS passage is short (${wordCount} words, recommend 500-600)`);
      }
    }
  }

  return { warnings, errors };
}

async function reconcileBatch(batchId, fileIds) {
  const keep = new Set(fileIds);
  const { data: existing, error } = await supabase
    .from("questions")
    .select("id")
    .eq("batch", batchId);
  if (error) {
    console.error(`  ⚠ replace-batch: could not list existing questions: ${error.message}`);
    return;
  }
  const stale = existing.map((r) => r.id).filter((id) => !keep.has(id));
  if (stale.length === 0) {
    console.log(`  ✓ replace-batch: no stale questions to remove`);
    return;
  }
  // Delete one at a time so questions with student attempts (blocked by the
  // question_attempts FK) are skipped instead of failing the whole delete.
  let removed = 0;
  const blocked = [];
  for (const id of stale) {
    const { error: delErr } = await supabase.from("questions").delete().eq("id", id);
    if (delErr) blocked.push(id);
    else removed++;
  }
  console.log(`  ✓ replace-batch: removed ${removed} stale question(s)`);
  if (blocked.length) {
    console.warn(
      `  ⚠ replace-batch: kept ${blocked.length} question(s) that have student attempts (cannot delete): ${blocked.join(", ")}`
    );
  }
}

async function importBatch(filePath, replaceBatch = false) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const batch = JSON.parse(raw);

  console.log(`\nImporting batch: ${batch.batch} — ${batch.topicArea}`);
  console.log(`  Section: ${batch.section}`);
  console.log(`  Questions: ${batch.questionCount}`);

  const { warnings, errors } = validateBatch(batch, filePath);
  warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
  if (errors.length > 0) {
    errors.forEach((e) => console.error(`  ✗ ${e}`));
    console.error(`  SKIPPED: ${errors.length} validation error(s)`);
    return false;
  }

  // CARS has no AAMC content categories. Force null so a CARS batch whose id
  // collides with a non-CARS batch in CATEGORY_MAP never inherits a category.
  const isCars = batch.section === "cars";
  const contentCategory = isCars
    ? null
    : batch.contentCategory || CATEGORY_MAP[batch.batch]?.category || null;

  const rows = batch.questions.map((q, idx) => ({
    id: q.id,
    section_id: batch.section,
    batch: batch.batch,
    topic: q.topic,
    ...(HAS_CATEGORY_COLUMN
      ? { content_category: isCars ? null : q.contentCategory || contentCategory }
      : {}),
    difficulty: q.difficulty,
    passage: q.passage || null,
    passage_image: q.passageImage || null,
    passage_image_caption: q.passageImageCaption || null,
    use_prev_passage: q.usePrevPassage || false,
    stem: q.stem,
    choices: normalizeChoices(q.choices),
    correct_answer: q.correct,
    explanations: q.explanations,
    sort_order: idx,
  }));

  const { data, error } = await supabase
    .from("questions")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error(`  ERROR: ${error.message}`);
    return false;
  }

  console.log(`  ✓ ${rows.length} questions imported successfully`);

  if (replaceBatch) {
    await reconcileBatch(batch.batch, rows.map((r) => r.id));
  }

  return true;
}

async function main() {
  const args = process.argv.slice(2);
  let files = [];
  let replaceBatch = false;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--replace-batch") {
      replaceBatch = true;
    } else if (args[i] === "--file" && args[i + 1]) {
      files.push(args[++i]);
    } else if (args[i] === "--dir" && args[i + 1]) {
      const dir = args[++i];
      const dirFiles = fs.readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => path.join(dir, f))
        .sort();
      files.push(...dirFiles);
    }
  }

  if (files.length === 0) {
    // Default: look for batch files in current directory and ./batches/
    const searchDirs = [".", "./batches"];
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const found = fs.readdirSync(dir)
          .filter((f) => f.match(/^B\d{3}_.*\.json$/))
          .map((f) => path.join(dir, f))
          .sort();
        files.push(...found);
      }
    }
  }

  if (files.length === 0) {
    console.log("No batch files found. Usage:");
    console.log("  npm run import-questions -- --file ./B001_Fluids.json");
    console.log("  npm run import-questions -- --dir ./batches/");
    process.exit(1);
  }

  console.log(`Found ${files.length} batch file(s) to import:`);
  files.forEach((f) => console.log(`  ${f}`));
  if (replaceBatch) {
    console.log("  Mode: --replace-batch (DB will be made to match each file)");
  }

  // Probe once for the optional content_category column.
  const probe = await supabase.from("questions").select("content_category").limit(1);
  HAS_CATEGORY_COLUMN = !probe.error;
  if (!HAS_CATEGORY_COLUMN) {
    console.log("  Note: content_category column not found — importing without it");
    console.log("        (category filter still works via the client-side map).");
  }

  let success = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const ok = await importBatch(file, replaceBatch);
      if (ok) success++;
      else failed++;
    } catch (err) {
      console.error(`  ERROR processing ${file}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total questions: ${success * 15} (approx)`);
}

main().catch(console.error);
