# AI Math Tutor

A math tutor for students in grades 4 to 10 across Indian school boards. The goal is an average
student rating above 4 out of 5 together with measurable learning gain. Product decisions live in
the development guidelines document; this repository follows them.

The first chapter being built is **Grade 6 Ratios**.

## Stack

- Next.js with TypeScript (App Router)
- Neon Postgres 18 through Neon's HTTPS driver (`@neondatabase/serverless`). Do not use a TCP
  Postgres client: port 5432 is blocked from our cloud build sessions.
- Neon object storage (S3 API), bucket from `S3_BUCKET`
- Claude via the Anthropic API, called only from the server

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in values; never commit them
npm run db:migrate           # apply pending migrations
npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run lint` / `typecheck` / `test` | Fast checks, also run in CI |
| `npm run eval` | Checks every scripted conversation in `evals/conversations` |
| `npm run content` | Validates the problem bank in `content/`; `-- --load` loads it into the database |
| `npm run db:migrate` | Applies pending files in `db/migrations` |
| `npm run db:migrate -- --check` | Runs pending migrations inside a transaction, then rolls back |

## Conventions

- **Admin-editable values** (points, the LU skip score, model choice, prices, budget) live in the
  `settings` table and are read through `src/lib/settings.ts`. Never hard-code them.
- **Database changes** go through a new numbered file in `db/migrations`. Never edit an applied one.
- **Every model call** is recorded with `recordModelUsage` in `src/lib/cost.ts`, so cost per
  student per month can be checked against the 500 INR budget.
- **Student data is minimal**: no names, addresses, school names or face photos.
- **Answers are checked by value**, never by string match, with `checkAnswer` in
  `src/lib/math/check-answer.ts`. Practice questions come from the reviewed bank in `content/`.
- **Prompts are code**: system prompts and persona text live in versioned files and are reviewed.
