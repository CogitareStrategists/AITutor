# Problem bank

Each JSON file here is one chapter of the curated problem bank: its learning units (LUs),
learning objectives (LOs), questions, and the misconceptions that common wrong answers point to.
Content changes are reviewed in pull requests like code.

- **Ids** are stable slugs (`g6-ratios.lu1.lo1.q1`). Never reuse an id for a different question;
  a removed question is retired in the database, not deleted.
- **Boards** tag where the chapter is taught. `STATE` stands for state boards in general until
  content is tagged per state.
- **Uses** say where a question can appear: `diagnostic`, `lu_quiz`, `cfu` (check for
  understanding after an LO) and `practice`.
- **Answers** are checked by value in `src/lib/math/check-answer.ts`, so `2:3`, `2 to 3` and
  `\frac{2}{3}` are the same ratio, and `0.5`, `1/2` and `2/4` the same number. A `simplest`
  ratio must have whole-number terms with no common factor; an unsimplified equivalent is
  reported as the `not_simplest` misconception.
- **Likely wrong answers** name a misconception from the chapter's list, which carries the
  feedback, the next action and the LO to review.
- Prompts, hints and solutions are Markdown with LaTeX between `$` signs.

`npm run content` validates every file (it also runs in CI): ids are unique, every stored answer
passes the checker, every likely wrong answer fails it with the misconception it is tagged with.
`npm run content -- --load` upserts the files into the database; add `--check` to roll back.
