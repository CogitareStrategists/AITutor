// Exact rational numbers on BigInt, so answers are compared by value and never by string match
// or floating point. 0.5, 1/2, 2/4 and \frac{1}{2} all parse to the same value.
export type Rational = { num: bigint; den: bigint };

// BigInt() rather than 0n-style literals: the project compiles to ES2017.
export const ZERO = BigInt(0);
export const ONE = BigInt(1);
const TEN = BigInt(10);

function gcd(a: bigint, b: bigint): bigint {
  a = a < ZERO ? -a : a;
  b = b < ZERO ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}

export function rational(num: bigint, den: bigint = ONE): Rational {
  if (den === ZERO) throw new Error("denominator is zero");
  if (den < ZERO) [num, den] = [-num, -den];
  const g = gcd(num, den) || ONE;
  return { num: num / g, den: den / g };
}

export function equals(a: Rational, b: Rational): boolean {
  return a.num * b.den === b.num * a.den;
}

export function divide(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den, a.den * b.num);
}

export function isInteger(r: Rational): boolean {
  return r.den === ONE;
}

export function integerGcd(a: bigint, b: bigint): bigint {
  return gcd(a, b);
}

const DECIMAL = /^([+-]?)(\d*)(?:\.(\d+))?$/;

function parseDecimal(text: string): Rational | null {
  const m = DECIMAL.exec(text);
  if (!m || (!m[2] && !m[3])) return null;
  const frac = m[3] ?? "";
  const value = rational(BigInt((m[2] || "0") + frac), TEN ** BigInt(frac.length));
  return m[1] === "-" ? rational(-value.num, value.den) : value;
}

// Accepts integers, decimals, fractions (a/b or \frac{a}{b}) and mixed numbers (2 1/2).
// Digit-grouping commas (1,200 or 1,20,000) are ignored. Returns null for anything else.
export function parseNumber(input: string): Rational | null {
  let text = input
    .trim()
    .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)")
    .replace(/(\d),(?=\d)/g, "$1")
    .replace(/\s+/g, " ");
  if (/^\(.*\)$/.test(text) && !text.includes("/")) text = text.slice(1, -1).trim();

  const mixed = /^([+-]?)(\d+) \(?(\d+)\)?\/\(?(\d+)\)?$/.exec(text);
  if (mixed) {
    const [, sign, whole, n, d] = mixed;
    if (BigInt(d) === ZERO) return null;
    const value = rational(BigInt(whole) * BigInt(d) + BigInt(n), BigInt(d));
    return sign === "-" ? rational(-value.num, value.den) : value;
  }

  const parts = text.split("/");
  if (parts.length > 2) return null;
  const strip = (s: string) => s.trim().replace(/^\((.*)\)$/, "$1").trim();
  const top = parseDecimal(strip(parts[0]));
  if (!top) return null;
  if (parts.length === 1) return top;
  const bottom = parseDecimal(strip(parts[1]));
  if (!bottom || bottom.num === ZERO) return null;
  return divide(top, bottom);
}
