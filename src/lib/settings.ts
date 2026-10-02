import { db } from "./db";

// The shape of every admin-editable setting. Defaults live in the database (seeded by
// db/migrations), not here, so admins can change them without a code change.
export type ModelPrice = { input: number; output: number; cache_read: number; cache_write: number };

export type Settings = {
  "points.first_attempt": number;
  "points.second_attempt_no_help": number;
  "points.after_video": number;
  "points.hint_penalty": number;
  "points.solution_penalty": number;
  "points.after_follow_up": number | null;
  "lu.skip_score": number;
  "tutor.model": string;
  "cost.monthly_budget_inr": number;
  "cost.usd_to_inr": number;
  "cost.model_prices_usd_per_mtok": Record<string, ModelPrice>;
};

export type SettingKey = keyof Settings;

export async function getSettings<K extends SettingKey>(keys: K[]): Promise<Pick<Settings, K>> {
  const rows = await db().query("SELECT key, value FROM settings WHERE key = ANY($1)", [keys]);
  const found = Object.fromEntries(rows.map((r) => [r.key as string, r.value]));
  const missing = keys.filter((k) => !(k in found));
  if (missing.length) throw new Error(`Missing settings: ${missing.join(", ")}`);
  return found as Pick<Settings, K>;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  return (await getSettings([key]))[key];
}

export async function updateSetting<K extends SettingKey>(
  key: K,
  value: Settings[K],
  updatedBy: string,
): Promise<void> {
  const rows = await db().query(
    "UPDATE settings SET value = $2::jsonb, updated_at = now(), updated_by = $3 WHERE key = $1 RETURNING key",
    [key, JSON.stringify(value), updatedBy],
  );
  if (rows.length === 0) throw new Error(`Unknown setting: ${key}`);
}
