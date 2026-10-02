// Loads every scripted conversation in evals/conversations and checks it is well formed.
// Scoring against the tutor model is added together with the tutor chat.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { validateEvalCase } from "../src/lib/eval-case";

const DIR = path.resolve("evals/conversations");

async function main() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
  let failures = 0;
  const ids = new Set<string>();
  for (const file of files) {
    const data = JSON.parse(await readFile(path.join(DIR, file), "utf8"));
    const errors = validateEvalCase(data);
    if (ids.has(data.id)) errors.push(`duplicate id ${data.id}`);
    ids.add(data.id);
    if (errors.length) {
      failures++;
      console.error(`${file}: ${errors.join("; ")}`);
    }
  }
  console.log(`${files.length} eval conversations, ${failures} invalid.`);
  if (failures) process.exit(1);
}

main();
