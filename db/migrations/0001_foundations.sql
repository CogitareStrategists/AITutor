-- Foundations: admin-editable settings, minimal student records, and model cost logging.
-- Statements are separated by semicolons at line ends; the runner sends them one by one
-- in a single transaction, so do not use $$-quoted function bodies here.

-- Every tunable value (points, skip score, model choice, prices) lives here so admins can
-- change it at runtime. Code must read these through src/lib/settings.ts, never hard-code them.
CREATE TABLE settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  description text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);

-- Students are minors. Store only what teaching needs: no names, addresses or school names.
CREATE TABLE students (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade               smallint NOT NULL CHECK (grade BETWEEN 4 AND 10),
  board               text NOT NULL,
  enrolled_by         text NOT NULL CHECK (enrolled_by IN ('parent', 'school')),
  parental_consent_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- One row per model call, so cost per student per month can be tracked against the budget.
CREATE TABLE model_usage (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id         uuid REFERENCES students (id) ON DELETE CASCADE,
  purpose            text NOT NULL,
  model              text NOT NULL,
  input_tokens       integer NOT NULL DEFAULT 0,
  output_tokens      integer NOT NULL DEFAULT 0,
  cache_read_tokens  integer NOT NULL DEFAULT 0,
  cache_write_tokens integer NOT NULL DEFAULT 0,
  cost_usd           numeric(12, 6) NOT NULL,
  cost_inr           numeric(12, 4) NOT NULL,
  latency_ms         integer,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX model_usage_student_month_idx ON model_usage (student_id, created_at);

CREATE VIEW student_monthly_cost AS
SELECT student_id,
       date_trunc('month', created_at) AS month,
       sum(cost_inr) AS cost_inr,
       count(*) AS calls
FROM model_usage
GROUP BY student_id, date_trunc('month', created_at);

-- Defaults approved in the development guidelines. Point values are fractions of full marks.
INSERT INTO settings (key, value, description) VALUES
  ('points.first_attempt', '1.0', 'Points for a correct answer on the first attempt'),
  ('points.second_attempt_no_help', '1.0', 'Points for a correct second attempt without help (still counted as an error)'),
  ('points.after_video', '1.0', 'Points for a correct third attempt after rewatching the concept video section'),
  ('points.hint_penalty', '0.1', 'Points deducted per hint used before a correct third attempt'),
  ('points.solution_penalty', '0.5', 'Points deducted for a correct third attempt after watching the solution'),
  ('points.after_follow_up', 'null', 'Points for a correct answer after a follow-up question (not decided yet)'),
  ('lu.skip_score', '0.85', 'LU quiz score at or above which a student can skip the learning unit'),
  ('tutor.model', '"claude-opus-5-5"', 'Claude model used by the tutor chat'),
  ('cost.monthly_budget_inr', '500', 'Model plus hosting budget per student per month, in INR'),
  ('cost.usd_to_inr', '88', 'Exchange rate used to convert model cost to INR; update when it moves'),
  ('cost.model_prices_usd_per_mtok', '{
     "claude-opus-5-5":   {"input": 4, "output": 20, "cache_read": 0.2, "cache_write": 5},
     "claude-sonnet-5-5": {"input": 2, "output": 10, "cache_read": 0.2, "cache_write": 2.5},
     "claude-haiku-4-5":  {"input": 1, "output": 5,  "cache_read": 0.1, "cache_write": 1.25}
   }', 'Model prices in USD per million tokens, used to compute model_usage cost');
