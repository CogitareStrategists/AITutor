import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { splitStatements } from "./sql-split";

describe("splitStatements", () => {
  it("splits on semicolons at line ends and drops comment lines", () => {
    expect(splitStatements("-- note\nCREATE TABLE a (x int);\n\nSELECT 1;\n")).toEqual([
      "CREATE TABLE a (x int)",
      "SELECT 1",
    ]);
  });

  it("keeps multi-line string values inside one statement", () => {
    const sql = "INSERT INTO t VALUES ('{\n  \"a\": 1\n}');";
    expect(splitStatements(sql)).toEqual(["INSERT INTO t VALUES ('{\n  \"a\": 1\n}')"]);
  });

  it("parses the foundations migration into the expected statements", () => {
    const statements = splitStatements(readFileSync("db/migrations/0001_foundations.sql", "utf8"));
    expect(statements.map((s) => s.split(/\s+/).slice(0, 3).join(" "))).toEqual([
      "CREATE TABLE settings",
      "CREATE TABLE students",
      "CREATE TABLE model_usage",
      "CREATE INDEX model_usage_student_month_idx",
      "CREATE VIEW student_monthly_cost",
      "INSERT INTO settings",
    ]);
  });
});
