// Splits a migration file into single statements, because Neon's HTTP driver runs one
// statement per query. Statements end with a semicolon at the end of a line; "--" comment
// lines are dropped. Semicolons inside string literals mid-line are left alone.
export function splitStatements(source: string): string[] {
  const statements: string[] = [];
  let current: string[] = [];
  for (const line of source.split("\n")) {
    if (line.trim().startsWith("--")) continue;
    current.push(line);
    if (line.trimEnd().endsWith(";")) {
      const statement = current.join("\n").trim().replace(/;$/, "");
      if (statement) statements.push(statement);
      current = [];
    }
  }
  const rest = current.join("\n").trim();
  if (rest) statements.push(rest);
  return statements;
}
