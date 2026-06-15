// Fair, comparable per-round scoring so totals mean the same across games.
// Every round yields 0–100 "skill points": solving faster scores higher.

/** Standard 6-guess games: 1st try = 100, last try ≈ 17, miss = 0. */
export function roundScore(win: boolean, guessesUsed: number, maxGuesses = 6): number {
  if (!win) return 0;
  return Math.round((100 * (maxGuesses - guessesUsed + 1)) / maxGuesses);
}

/** Globle has unlimited guesses, so it uses a gentler decay (floor 15). */
export function globeScore(win: boolean, guessesUsed: number): number {
  if (!win) return 0;
  return Math.max(15, Math.round(100 - (guessesUsed - 1) * 9));
}

/** Single multiple-choice (Capitals): correct is worth a touch less (it's easy). */
export function quizScore(correct: boolean): number {
  return correct ? 70 : 0;
}

/** Proportional games (Name the NBA): share of the set you got. */
export function proportionScore(got: number, total: number): number {
  return Math.round((100 * got) / Math.max(1, total));
}
