// A scripted student conversation used to score the tutor before any prompt or model change
// ships. The scorer that replays these against the tutor arrives with the tutor chat itself.
export type EvalCase = {
  id: string;
  grade: number;
  board: string;
  chapter: string;
  mood: "neutral" | "confused" | "frustrated" | "rushing" | "off_topic";
  turns: { role: "student" | "tutor"; content: string }[];
  // What a good next tutor reply must do, checked on correctness, hint quality and tone.
  expectations: string[];
};

const MOODS = new Set(["neutral", "confused", "frustrated", "rushing", "off_topic"]);

export function validateEvalCase(value: unknown): string[] {
  const errors: string[] = [];
  const c = value as Partial<EvalCase>;
  if (typeof c?.id !== "string" || !c.id) errors.push("id must be a non-empty string");
  if (typeof c?.grade !== "number" || c.grade < 4 || c.grade > 10) errors.push("grade must be 4 to 10");
  if (typeof c?.board !== "string" || !c.board) errors.push("board must be a non-empty string");
  if (typeof c?.chapter !== "string" || !c.chapter) errors.push("chapter must be a non-empty string");
  if (!MOODS.has(c?.mood as string)) errors.push(`mood must be one of ${[...MOODS].join(", ")}`);
  if (!Array.isArray(c?.turns) || c.turns.length === 0) {
    errors.push("turns must be a non-empty array");
  } else if (c.turns.some((t) => (t?.role !== "student" && t?.role !== "tutor") || typeof t?.content !== "string")) {
    errors.push("each turn needs role student or tutor and string content");
  }
  if (!Array.isArray(c?.expectations) || c.expectations.length === 0) {
    errors.push("expectations must be a non-empty array");
  }
  return errors;
}
