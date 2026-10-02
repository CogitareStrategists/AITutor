import { describe, expect, it } from "vitest";
import { equals, parseNumber, rational } from "./rational";

const r = (num: number, den: number) => rational(BigInt(num), BigInt(den));
const half = r(1, 2);

describe("parseNumber", () => {
  it("reads equivalent forms as the same value", () => {
    for (const text of ["0.5", "1/2", "2/4", ".5", "\\frac{1}{2}", "\\dfrac{2}{4}", " 1 / 2 "]) {
      expect(equals(parseNumber(text)!, half), text).toBe(true);
    }
  });

  it("reads mixed numbers, negatives and grouped digits", () => {
    expect(parseNumber("2 1/2")).toEqual(r(5, 2));
    expect(parseNumber("-3")).toEqual(r(-3, 1));
    expect(parseNumber("1,20,000")).toEqual(r(120000, 1));
    expect(parseNumber("1.5/0.5")).toEqual(r(3, 1));
  });

  it("rejects text that is not a number", () => {
    for (const text of ["", "abc", "1/0", "1/2/3", "2 : 3", "12a", "."]) {
      expect(parseNumber(text), text).toBeNull();
    }
  });
});
