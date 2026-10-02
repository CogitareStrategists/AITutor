import type { Chapter } from "./chapter";

export type Statement = { text: string; params: unknown[] };

// Builds the statements that upsert one chapter of the problem bank. They run together in one
// transaction. Questions missing from the file are retired rather than deleted, and come back
// if they are added again.
export function chapterStatements(chapter: Chapter): Statement[] {
  const units = chapter.units.map((u, i) => ({ id: u.id, position: i + 1, title: u.title }));
  const objectives = chapter.units.flatMap((u) =>
    u.objectives.map((o, i) => ({ id: o.id, unit_id: u.id, position: i + 1, title: o.title, video_url: o.video_url })),
  );
  const questions = chapter.units.flatMap((u) =>
    u.objectives.flatMap((o) =>
      o.questions.map((q, i) => ({
        id: q.id,
        objective_id: o.id,
        position: i + 1,
        uses: q.uses,
        format: q.format,
        prompt: q.prompt,
        answer: q.answer,
        likely_wrong: q.likely_wrong,
        hints: q.hints,
        solution: q.solution,
      })),
    ),
  );

  return [
    {
      text: `INSERT INTO chapters (id, grade, title, boards) VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET grade = EXCLUDED.grade, title = EXCLUDED.title,
               boards = EXCLUDED.boards, updated_at = now()`,
      params: [chapter.id, chapter.grade, chapter.title, chapter.boards],
    },
    {
      text: `INSERT INTO learning_units (id, chapter_id, position, title)
             SELECT r.id, $1, r.position, r.title
             FROM jsonb_to_recordset($2::jsonb) AS r(id text, position smallint, title text)
             ON CONFLICT (id) DO UPDATE SET chapter_id = EXCLUDED.chapter_id, position = EXCLUDED.position,
               title = EXCLUDED.title, updated_at = now()`,
      params: [chapter.id, JSON.stringify(units)],
    },
    {
      text: `INSERT INTO learning_objectives (id, unit_id, position, title, video_url)
             SELECT r.id, r.unit_id, r.position, r.title, r.video_url
             FROM jsonb_to_recordset($1::jsonb) AS r(id text, unit_id text, position smallint, title text, video_url text)
             ON CONFLICT (id) DO UPDATE SET unit_id = EXCLUDED.unit_id, position = EXCLUDED.position,
               title = EXCLUDED.title, video_url = EXCLUDED.video_url, updated_at = now()`,
      params: [JSON.stringify(objectives)],
    },
    {
      text: "DELETE FROM misconceptions WHERE chapter_id = $1 AND NOT (id = ANY($2))",
      params: [chapter.id, chapter.misconceptions.map((m) => m.id)],
    },
    {
      text: `INSERT INTO misconceptions (id, chapter_id, name, feedback, next_action, review_objective)
             SELECT r.id, $1, r.name, r.feedback, r.next_action, r.review_objective
             FROM jsonb_to_recordset($2::jsonb)
               AS r(id text, name text, feedback text, next_action text, review_objective text)
             ON CONFLICT (chapter_id, id) DO UPDATE SET name = EXCLUDED.name, feedback = EXCLUDED.feedback,
               next_action = EXCLUDED.next_action, review_objective = EXCLUDED.review_objective, updated_at = now()`,
      params: [chapter.id, JSON.stringify(chapter.misconceptions)],
    },
    {
      text: `INSERT INTO questions (id, objective_id, position, uses, format, prompt, answer, likely_wrong, hints, solution)
             SELECT r.id, r.objective_id, r.position, r.uses, r.format, r.prompt, r.answer, r.likely_wrong, r.hints, r.solution
             FROM jsonb_to_recordset($1::jsonb) AS r(id text, objective_id text, position smallint, uses text[],
               format text, prompt text, answer jsonb, likely_wrong jsonb, hints jsonb, solution text)
             ON CONFLICT (id) DO UPDATE SET objective_id = EXCLUDED.objective_id, position = EXCLUDED.position,
               uses = EXCLUDED.uses, format = EXCLUDED.format, prompt = EXCLUDED.prompt, answer = EXCLUDED.answer,
               likely_wrong = EXCLUDED.likely_wrong, hints = EXCLUDED.hints, solution = EXCLUDED.solution,
               retired_at = NULL, updated_at = now()`,
      params: [JSON.stringify(questions)],
    },
    {
      text: `UPDATE questions q SET retired_at = now(), updated_at = now()
             FROM learning_objectives o JOIN learning_units u ON u.id = o.unit_id
             WHERE q.objective_id = o.id AND u.chapter_id = $1 AND q.retired_at IS NULL AND NOT (q.id = ANY($2))`,
      params: [chapter.id, questions.map((q) => q.id)],
    },
  ];
}
