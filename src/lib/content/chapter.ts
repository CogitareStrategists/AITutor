import { checkAnswer, isSimplest, NOT_SIMPLEST, parseRatio, type Answer, type LikelyWrong } from "../math/check-answer";

// A chapter of the curated problem bank, as stored in content/*.json and loaded into the database.
// Prompts, hints and solutions are Markdown with LaTeX math between $ signs.
export type QuestionUse = "diagnostic" | "lu_quiz" | "cfu" | "practice";
export type QuestionFormat = "fill_blank" | "mcq" | "true_false";

export type Question = {
  id: string;
  uses: QuestionUse[];
  format: QuestionFormat;
  prompt: string;
  answer: Answer;
  likely_wrong: LikelyWrong[];
  hints: string[];
  solution: string;
};

export type LearningObjective = { id: string; title: string; video_url: string | null; questions: Question[] };
export type LearningUnit = { id: string; title: string; objectives: LearningObjective[] };

export type Misconception = {
  id: string;
  name: string;
  // Shown to the student: names the mistake kindly, then says what to do next.
  feedback: string;
  next_action: string;
  // The learning objective whose content addresses this misconception.
  review_objective: string;
};

export type Chapter = {
  id: string;
  grade: number;
  title: string;
  boards: string[];
  misconceptions: Misconception[];
  units: LearningUnit[];
};

const USES = new Set<QuestionUse>(["diagnostic", "lu_quiz", "cfu", "practice"]);
const FORMATS: Record<QuestionFormat, Answer["kind"][]> = {
  fill_blank: ["number", "ratio"],
  mcq: ["choice"],
  true_false: ["choice"],
};

export function allQuestions(chapter: Chapter): (Question & { objective: string })[] {
  return chapter.units.flatMap((u) =>
    u.objectives.flatMap((o) => o.questions.map((q) => ({ ...q, objective: o.id }))),
  );
}

// Checks a chapter is internally consistent, and that every stored answer passes the answer
// checker while every listed wrong answer fails it. Returns one message per problem found.
export function validateChapter(chapter: Chapter): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const unique = (id: string) => {
    if (!id || ids.has(id)) errors.push(`missing or duplicate id "${id}"`);
    ids.add(id);
  };

  unique(chapter.id);
  if (chapter.grade < 4 || chapter.grade > 10) errors.push("grade must be 4 to 10");
  if (!chapter.boards?.length) errors.push("boards must list at least one board");

  const objectives = new Set(chapter.units.flatMap((u) => u.objectives.map((o) => o.id)));
  const misconceptions = new Set<string>();
  for (const m of chapter.misconceptions) {
    unique(m.id);
    misconceptions.add(m.id);
    if (!m.feedback || !m.next_action) errors.push(`${m.id}: needs feedback and a next action`);
    if (!objectives.has(m.review_objective)) errors.push(`${m.id}: unknown review_objective ${m.review_objective}`);
  }

  for (const unit of chapter.units) {
    unique(unit.id);
    if (!unit.objectives.length) errors.push(`${unit.id}: has no learning objectives`);
    if (!unit.objectives.some((o) => o.questions.some((q) => q.uses.includes("lu_quiz")))) {
      errors.push(`${unit.id}: has no LU quiz questions`);
    }
    for (const objective of unit.objectives) {
      unique(objective.id);
      if (!objective.questions.some((q) => q.uses.includes("cfu"))) {
        errors.push(`${objective.id}: has no CFU questions`);
      }
      for (const q of objective.questions) {
        unique(q.id);
        errors.push(...validateQuestion(q, misconceptions).map((e) => `${q.id}: ${e}`));
      }
    }
  }
  return errors;
}

function validateQuestion(q: Question, misconceptions: Set<string>): string[] {
  const errors: string[] = [];
  if (!q.uses.length || q.uses.some((u) => !USES.has(u))) errors.push("uses must be diagnostic, lu_quiz, cfu or practice");
  if (!FORMATS[q.format]?.includes(q.answer.kind)) errors.push(`format ${q.format} does not fit a ${q.answer.kind} answer`);
  if (!q.prompt) errors.push("prompt is empty");
  if (!q.hints.length) errors.push("needs at least one hint");
  if (!q.solution) errors.push("solution is empty");

  const a = q.answer;
  if (a.kind === "choice") {
    if (a.options.length < 2 || a.correct < 0 || a.correct >= a.options.length) errors.push("choice needs 2+ options and a valid correct index");
    if (q.format === "true_false" && a.options.join("|") !== "True|False") errors.push('true/false options must be ["True", "False"]');
  } else {
    if (a.kind === "ratio" && a.form === "simplest") {
      const r = parseRatio(a.value);
      if (r && !isSimplest(r)) errors.push(`stored answer ${a.value} is not in simplest form`);
    }
    try {
      if (checkAnswer(a, a.value).status !== "correct") errors.push(`stored answer ${a.value} is not accepted by the checker`);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  for (const wrong of q.likely_wrong) {
    if (!misconceptions.has(wrong.misconception)) errors.push(`unknown misconception ${wrong.misconception}`);
    const input = a.kind === "choice" ? String(Number(wrong.answer)) : wrong.answer;
    const result = checkAnswer(a, input, q.likely_wrong);
    if (result.status !== "incorrect") errors.push(`likely wrong answer ${wrong.answer} is ${result.status}`);
    else if (result.misconception !== wrong.misconception) {
      errors.push(`likely wrong answer ${wrong.answer} is tagged ${result.misconception ?? "nothing"}, expected ${wrong.misconception}`);
    }
  }
  if (a.kind === "ratio" && a.form === "simplest" && !misconceptions.has(NOT_SIMPLEST)) {
    errors.push(`simplest-form questions need a "${NOT_SIMPLEST}" misconception in the chapter`);
  }
  return errors;
}
