// Validates every chapter in content/ and, with --load, upserts them into the database.
// Usage: npm run content                    validate only (no database needed)
//        npm run content -- --load          validate, then load into DATABASE_URL
//        npm run content -- --load --check  load inside a transaction, then roll back
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { allQuestions, validateChapter, type Chapter } from "../src/lib/content/chapter";
import { chapterStatements } from "../src/lib/content/load";

const DIR = path.resolve("content");
const CHECK_ROLLBACK = "content check complete, rolling back";

async function main() {
  const load = process.argv.includes("--load");
  const check = process.argv.includes("--check");
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
  const chapters: Chapter[] = [];
  let failures = 0;

  for (const file of files) {
    const chapter = JSON.parse(await readFile(path.join(DIR, file), "utf8")) as Chapter;
    const errors = validateChapter(chapter);
    if (errors.length) {
      failures++;
      console.error(`${file}:\n  ${errors.join("\n  ")}`);
    } else {
      console.log(`${file}: ${chapter.units.length} units, ${allQuestions(chapter).length} questions`);
    }
    chapters.push(chapter);
  }
  if (failures) throw new Error(`${failures} of ${files.length} content files are invalid`);
  if (!load) return;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = neon(url);
  for (const chapter of chapters) {
    try {
      await sql.transaction((txn) => [
        ...chapterStatements(chapter).map((s) => txn.query(s.text, s.params)),
        // Raising an error is the only way to roll back a non-interactive HTTP transaction.
        ...(check ? [txn.query(`SELECT 1 / 0 AS "${CHECK_ROLLBACK}"`)] : []),
      ]);
      console.log(`Loaded ${chapter.id}`);
    } catch (err) {
      if (check && String(err).includes("division by zero")) {
        console.log(`Checked ${chapter.id}, rolled back`);
        continue;
      }
      throw new Error(`Loading ${chapter.id} failed: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
