import { describe, expect, it } from "vitest";
import { computeCostUsd } from "./cost";

const opus = { input: 4, output: 20, cache_read: 0.2, cache_write: 5 };

describe("computeCostUsd", () => {
  it("prices input and output tokens per million", () => {
    expect(computeCostUsd({ input_tokens: 1_000_000, output_tokens: 0 }, opus)).toBeCloseTo(4);
    expect(computeCostUsd({ input_tokens: 0, output_tokens: 500_000 }, opus)).toBeCloseTo(10);
  });

  it("adds cache reads and writes when present", () => {
    const cost = computeCostUsd(
      {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 10_000,
        cache_creation_input_tokens: 2_000,
      },
      opus,
    );
    expect(cost).toBeCloseTo(100 * 4e-6 + 50 * 20e-6 + 10_000 * 0.2e-6 + 2_000 * 5e-6);
  });

  it("treats null cache counts as zero", () => {
    expect(
      computeCostUsd(
        { input_tokens: 10, output_tokens: 0, cache_read_input_tokens: null, cache_creation_input_tokens: null },
        opus,
      ),
    ).toBeCloseTo(40e-6);
  });
});
