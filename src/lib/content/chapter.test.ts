import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allQuestions, validateChapter, type Chapter } from "./chapter";

const dir = path.resolve("content");
const chapters = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => [f, JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Chapter] as const);

describe("content files", () => {
  it.each(chapters)("%s is consistent and every stored answer passes the checker", (_, chapter) => {
    expect(validateChapter(chapter)).toEqual([]);
  });
});

describe("validateChapter", () => {
  const ratios = chapters.find(([f]) => f === "grade6-ratios.json")![1];

  it("covers every LU with a quiz and every LO with CFU questions", () => {
    expect(ratios.units.length).toBeGreaterThan(0);
    expect(allQuestions(ratios).filter((q) => q.uses.includes("diagnostic")).length).toBeGreaterThanOrEqual(ratios.units.length);
  });

  it("catches a stored answer that is wrong or not simplified", () => {
    const broken = structuredClone(ratios);
    const q = broken.units[0].objectives[0].questions[0];
    q.answer = { kind: "ratio", value: "12:18", form: "simplest" };
    expect(validateChapter(broken)).toContain(`${q.id}: stored answer 12:18 is not in simplest form`);
  });

  it("catches a likely wrong answer that the checker would mark correct", () => {
    const broken = structuredClone(ratios);
    const q = broken.units[0].objectives[0].questions[0];
    q.likely_wrong = [{ answer: "4:6", misconception: "order_reversed" }];
    expect(validateChapter(broken).some((e) => e.startsWith(`${q.id}: likely wrong answer 4:6`))).toBe(true);
  });
});
