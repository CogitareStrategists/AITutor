// Applies pending SQL files in db/migrations, in name order, each in its own transaction.
// Usage: npm run db:migrate            apply pending migrations
//        npm run db:migrate -- --check run pending migrations, then roll them back
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { splitStatements } from "../src/lib/sql-split";

const MIGRATIONS_DIR = path.resolve("db/migrations");
const CHECK_ROLLBACK = "migration check complete, rolling back";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const check = process.argv.includes("--check");
  const sql = neon(url);

  await sql.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const applied = new Set(
    (await sql.query("SELECT name FROM schema_migrations")).map((r) => r.name as string),
  );
  const pending = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql") && !applied.has(f))
    .sort();

  if (pending.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  for (const name of pending) {
    const statements = splitStatements(await readFile(path.join(MIGRATIONS_DIR, name), "utf8"));
    try {
      await sql.transaction((txn) => [
        ...statements.map((s) => txn.query(s)),
        txn.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]),
        // Raising an error is the only way to roll back a non-interactive HTTP transaction.
        ...(check ? [txn.query(`SELECT 1 / 0 AS "${CHECK_ROLLBACK}"`)] : []),
      ]);
      console.log(`Applied ${name} (${statements.length} statements)`);
    } catch (err) {
      if (check && String(err).includes("division by zero")) {
        console.log(`Checked ${name} (${statements.length} statements), rolled back`);
        continue;
      }
      throw new Error(`Migration ${name} failed: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
