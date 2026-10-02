import { db } from "./db";
import { getSettings, type ModelPrice } from "./settings";

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export function computeCostUsd(usage: TokenUsage, price: ModelPrice): number {
  const perToken = (perMillion: number) => perMillion / 1_000_000;
  return (
    usage.input_tokens * perToken(price.input) +
    usage.output_tokens * perToken(price.output) +
    (usage.cache_read_input_tokens ?? 0) * perToken(price.cache_read) +
    (usage.cache_creation_input_tokens ?? 0) * perToken(price.cache_write)
  );
}

// Records one model call against a student so monthly cost can be compared with the budget.
export async function recordModelUsage(entry: {
  studentId: string | null;
  purpose: string;
  model: string;
  usage: TokenUsage;
  latencyMs?: number;
}): Promise<{ costUsd: number; costInr: number }> {
  const settings = await getSettings(["cost.model_prices_usd_per_mtok", "cost.usd_to_inr"]);
  const price = settings["cost.model_prices_usd_per_mtok"][entry.model];
  if (!price) throw new Error(`No price configured for model ${entry.model}`);
  const costUsd = computeCostUsd(entry.usage, price);
  const costInr = costUsd * settings["cost.usd_to_inr"];
  await db().query(
    `INSERT INTO model_usage
       (student_id, purpose, model, input_tokens, output_tokens, cache_read_tokens,
        cache_write_tokens, cost_usd, cost_inr, latency_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      entry.studentId,
      entry.purpose,
      entry.model,
      entry.usage.input_tokens,
      entry.usage.output_tokens,
      entry.usage.cache_read_input_tokens ?? 0,
      entry.usage.cache_creation_input_tokens ?? 0,
      costUsd,
      costInr,
      entry.latencyMs ?? null,
    ],
  );
  return { costUsd, costInr };
}

export async function studentCostThisMonth(studentId: string): Promise<number> {
  const rows = await db().query(
    "SELECT coalesce(sum(cost_inr), 0)::float AS total FROM model_usage WHERE student_id = $1 AND created_at >= date_trunc('month', now())",
    [studentId],
  );
  return rows[0].total as number;
}
