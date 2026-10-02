-- Curated problem bank: chapters, learning units (LUs), learning objectives (LOs), questions and
-- the misconceptions their likely wrong answers point to. The source of truth is content/*.json,
-- reviewed in pull requests and loaded with `npm run content:load`. Ids are stable text slugs so a
-- reload updates rows in place; questions removed from a file are retired, never deleted, so
-- student attempts that refer to them stay valid.

CREATE TABLE chapters (
  id         text PRIMARY KEY,
  grade      smallint NOT NULL CHECK (grade BETWEEN 4 AND 10),
  title      text NOT NULL,
  -- Content is tagged by school board, e.g. CBSE, ICSE, STATE.
  boards     text[] NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE learning_units (
  id         text PRIMARY KEY,
  chapter_id text NOT NULL REFERENCES chapters (id),
  position   smallint NOT NULL,
  title      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE learning_objectives (
  id         text PRIMARY KEY,
  unit_id    text NOT NULL REFERENCES learning_units (id),
  position   smallint NOT NULL,
  title      text NOT NULL,
  video_url  text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE misconceptions (
  id               text NOT NULL,
  chapter_id       text NOT NULL REFERENCES chapters (id),
  name             text NOT NULL,
  feedback         text NOT NULL,
  next_action      text NOT NULL,
  review_objective text NOT NULL REFERENCES learning_objectives (id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chapter_id, id)
);

CREATE TABLE questions (
  id           text PRIMARY KEY,
  objective_id text NOT NULL REFERENCES learning_objectives (id),
  position     smallint NOT NULL,
  uses         text[] NOT NULL CHECK (uses <@ ARRAY['diagnostic', 'lu_quiz', 'cfu', 'practice']),
  format       text NOT NULL CHECK (format IN ('fill_blank', 'mcq', 'true_false')),
  prompt       text NOT NULL,
  -- Checked by src/lib/math/check-answer.ts, never by string match.
  answer       jsonb NOT NULL,
  likely_wrong jsonb NOT NULL DEFAULT '[]',
  hints        jsonb NOT NULL DEFAULT '[]',
  solution     text NOT NULL,
  retired_at   timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX questions_objective_idx ON questions (objective_id) WHERE retired_at IS NULL;
