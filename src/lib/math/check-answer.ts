import { equals, integerGcd, isInteger, ONE, parseNumber, ZERO, type Rational } from "./rational";

// How a question's correct answer is stored in the problem bank.
export type Answer =
  // A single value. Equivalent forms (0.5, 1/2, 2/4) are accepted. `units` lists words or
  // symbols the student may write before or after the number, such as "₹" or "km".
  | { kind: "number"; value: string; units?: string[] }
  // A two-term ratio written "a:b". "simplest" needs whole-number terms with no common factor;
  // "equivalent" accepts any ratio with the same value, such as 4:6 for 2:3.
  | { kind: "ratio"; value: string; form: "simplest" | "equivalent" }
  // MCQ or true/false. The student's answer is the index of the chosen option.
  | { kind: "choice"; options: string[]; correct: number };

// A wrong answer students commonly give, tagged with the misconception behind it.
export type LikelyWrong = { answer: string; misconception: string };

// Raised for a simplest-form question answered with an equivalent ratio that is not simplified.
export const NOT_SIMPLEST = "not_simplest";

export type CheckResult =
  | { status: "correct" }
  | { status: "incorrect"; misconception?: string }
  // The input could not be read as the kind of answer the question needs; not counted as an attempt.
  | { status: "unreadable" };

type RatioValue = { a: Rational; b: Rational };

export function parseRatio(input: string): RatioValue | null {
  const text = input.trim().replace(/∶/g, ":");
  let parts = text.split(":");
  if (parts.length === 1) parts = text.split(/\s+to\s+/i);
  const frac = /^\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}$/.exec(text);
  if (parts.length === 1) parts = frac ? [frac[1], frac[2]] : text.split("/");
  if (parts.length !== 2) return null;
  const a = parseNumber(parts[0]);
  const b = parseNumber(parts[1]);
  if (!a || !b || a.num <= ZERO || b.num <= ZERO) return null;
  return { a, b };
}

function sameRatio(x: RatioValue, y: RatioValue): boolean {
  return equals(
    { num: x.a.num * x.b.den, den: x.a.den * x.b.num },
    { num: y.a.num * y.b.den, den: y.a.den * y.b.num },
  );
}

export function isSimplest(r: RatioValue): boolean {
  return isInteger(r.a) && isInteger(r.b) && integerGcd(r.a.num, r.b.num) === ONE;
}

function stripUnits(input: string, units: string[] = []): string {
  let text = input.trim();
  for (const unit of [...units].sort((a, b) => b.length - a.length)) {
    const u = unit.toLowerCase();
    if (text.toLowerCase().startsWith(u)) text = text.slice(u.length).trim();
    if (text.toLowerCase().endsWith(u)) text = text.slice(0, -u.length).trim();
  }
  return text;
}

function parseChoice(input: string, options: string[]): number | null {
  const text = input.trim();
  const i = options.findIndex((o) => o.trim().toLowerCase() === text.toLowerCase());
  if (i >= 0) return i;
  return /^\d+$/.test(text) && Number(text) < options.length ? Number(text) : null;
}

// Parses a response in the shape the answer needs, or returns null.
function parse(answer: Answer, input: string): RatioValue | Rational | number | null {
  switch (answer.kind) {
    case "number":
      return parseNumber(stripUnits(input, answer.units));
    case "ratio":
      return parseRatio(input);
    case "choice":
      return parseChoice(input, answer.options);
  }
}

function same(answer: Answer, x: RatioValue | Rational | number, y: RatioValue | Rational | number): boolean {
  switch (answer.kind) {
    case "number":
      return equals(x as Rational, y as Rational);
    case "ratio":
      return sameRatio(x as RatioValue, y as RatioValue);
    case "choice":
      return x === y;
  }
}

// Checks a student's response against the stored answer by value, then names the
// misconception behind a wrong answer when it matches one the bank lists.
export function checkAnswer(answer: Answer, input: string, likelyWrong: LikelyWrong[] = []): CheckResult {
  const response = parse(answer, input);
  if (response === null) return { status: "unreadable" };

  const expected = answer.kind === "choice" ? answer.correct : parse(answer, answer.value);
  if (expected === null) throw new Error(`Stored answer cannot be parsed: ${JSON.stringify(answer)}`);

  if (same(answer, response, expected)) {
    if (answer.kind === "ratio" && answer.form === "simplest" && !isSimplest(response as RatioValue)) {
      return { status: "incorrect", misconception: NOT_SIMPLEST };
    }
    return { status: "correct" };
  }

  for (const wrong of likelyWrong) {
    const value = parse(answer, wrong.answer);
    if (value !== null && same(answer, response, value)) {
      return { status: "incorrect", misconception: wrong.misconception };
    }
  }
  return { status: "incorrect" };
}
