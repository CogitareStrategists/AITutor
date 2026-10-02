import { describe, expect, it } from "vitest";
import { checkAnswer, type Answer } from "./check-answer";

const simplest: Answer = { kind: "ratio", value: "2:3", form: "simplest" };
const wrong = [
  { answer: "3:2", misconception: "order_reversed" },
  { answer: "2:5", misconception: "part_whole" },
];

describe("checkAnswer for ratios", () => {
  it("accepts the ways a student may write the same simplest ratio", () => {
    for (const input of ["2:3", "2 : 3", "2 ∶ 3", "2 to 3", "2/3", "\\frac{2}{3}"]) {
      expect(checkAnswer(simplest, input), input).toEqual({ status: "correct" });
    }
  });

  it("flags an equivalent ratio that is not simplified", () => {
    expect(checkAnswer(simplest, "12:18", wrong)).toEqual({ status: "incorrect", misconception: "not_simplest" });
    expect(checkAnswer(simplest, "1:1.5", wrong)).toEqual({ status: "incorrect", misconception: "not_simplest" });
  });

  it("names the misconception behind a listed wrong answer, in any equivalent form", () => {
    expect(checkAnswer(simplest, "3:2", wrong)).toEqual({ status: "incorrect", misconception: "order_reversed" });
    expect(checkAnswer(simplest, "18 : 12", wrong)).toEqual({ status: "incorrect", misconception: "order_reversed" });
    expect(checkAnswer(simplest, "12:30", wrong)).toEqual({ status: "incorrect", misconception: "part_whole" });
    expect(checkAnswer(simplest, "5:7", wrong)).toEqual({ status: "incorrect" });
  });

  it("accepts any equivalent ratio when the question allows it", () => {
    const answer: Answer = { kind: "ratio", value: "2:3", form: "equivalent" };
    expect(checkAnswer(answer, "4:6")).toEqual({ status: "correct" });
    expect(checkAnswer(answer, "1 : 1.5")).toEqual({ status: "correct" });
  });

  it("does not count unreadable input as an attempt", () => {
    for (const input of ["", "two to three", "2:3:4", "0:3", "2:"]) {
      expect(checkAnswer(simplest, input), input).toEqual({ status: "unreadable" });
    }
  });
});

describe("checkAnswer for numbers", () => {
  const rupees: Answer = { kind: "number", value: "96", units: ["₹", "Rs.", "Rs", "rupees"] };

  it("accepts the value with or without its units", () => {
    for (const input of ["96", "₹ 96", "₹96", "Rs. 96", "Rs 96", "96 rupees", "96.0", "192/2"]) {
      expect(checkAnswer(rupees, input), input).toEqual({ status: "correct" });
    }
  });

  it("names a listed misconception and rejects other values", () => {
    const likely = [{ answer: "37.5", misconception: "unitary_inverse" }];
    expect(checkAnswer(rupees, "37 1/2", likely)).toEqual({ status: "incorrect", misconception: "unitary_inverse" });
    expect(checkAnswer(rupees, "95", likely)).toEqual({ status: "incorrect" });
    expect(checkAnswer(rupees, "96 km", likely)).toEqual({ status: "unreadable" });
  });
});

describe("checkAnswer for choices", () => {
  const tf: Answer = { kind: "choice", options: ["True", "False"], correct: 1 };

  it("accepts the option index or its label", () => {
    expect(checkAnswer(tf, "1")).toEqual({ status: "correct" });
    expect(checkAnswer(tf, "false")).toEqual({ status: "correct" });
    expect(checkAnswer(tf, "0")).toEqual({ status: "incorrect" });
    expect(checkAnswer(tf, "maybe")).toEqual({ status: "unreadable" });
  });
});
