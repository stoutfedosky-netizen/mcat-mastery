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

async function importBatch(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const batch = JSON.parse(raw);

  console.log(`\nImporting batch: ${batch.batch} — ${batch.topicArea}`);
  console.log(`  Section: ${batch.section}`);
  console.log(`  Questions: ${batch.questionCount}`);

  const rows = batch.questions.map((q, idx) => ({
    id: q.id,
    section_id: batch.section,
    batch: batch.batch,
    topic: q.topic,
    difficulty: q.difficulty,
    passage: q.passage || null,
    passage_image: q.passageImage || null,
    passage_image_caption: q.passageImageCaption || null,
    use_prev_passage: q.usePrevPassage || false,
    stem: q.stem,
    choices: q.choices,
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
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  let files = [];

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
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

  let success = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const ok = await importBatch(file);
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
