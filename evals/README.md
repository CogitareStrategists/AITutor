# Tutor evaluation set

Each file in `conversations/` is one scripted student conversation: the turns so far and what a
good next tutor reply must do. Every prompt or model change is scored against this set before it
reaches students (see the development guidelines, "Measuring satisfaction").

- Target: at least 100 conversations covering grades, chapters and moods (confused, frustrated,
  rushing, off topic).
- Every session rated 1 or 2 by a student is reviewed, and a version of it is added here.
- `npm run eval` checks that every file is well formed. Scoring against the tutor model is added
  with the tutor chat.
