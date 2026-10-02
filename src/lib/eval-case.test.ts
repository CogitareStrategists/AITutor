import { describe, expect, it } from "vitest";
import { validateEvalCase } from "./eval-case";

const valid = {
  id: "g6-ratios-001",
  grade: 6,
  board: "CBSE",
  chapter: "Ratio and Proportion",
  mood: "confused",
  turns: [{ role: "student", content: "Is 2:3 the same as 3:2?" }],
  expectations: ["Explains that order matters in a ratio"],
};

describe("validateEvalCase", () => {
  it("accepts a well-formed case", () => {
    expect(validateEvalCase(valid)).toEqual([]);
  });

  it("reports each problem", () => {
    expect(validateEvalCase({ ...valid, grade: 12, mood: "sleepy", turns: [] })).toEqual([
      "grade must be 4 to 10",
      "mood must be one of neutral, confused, frustrated, rushing, off_topic",
      "turns must be a non-empty array",
    ]);
  });
});
