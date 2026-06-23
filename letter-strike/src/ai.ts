import {
  type GameState,
  type GameResult,
  checkGameResult,
  getCellToWordsMap,
  getRevealedPositions,
  getRevealedWords,
} from './game';

export type AIDifficulty = 'easy' | 'normal' | 'hard';

function lettersOnBoard(board: GameState['board']): Set<string> {
  const set = new Set<string>();
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r]!.length; c++) {
      const ch = board[r]![c];
      if (ch) set.add(ch);
    }
  }
  return set;
}

function availableLetters(state: GameState): string[] {
  const onBoard = lettersOnBoard(state.board);
  return [...onBoard].filter((l) => !state.guessedLetters.has(l)).sort((a, b) => a.localeCompare(b));
}

function resultAfterComputerGuess(state: GameState, letter: string): GameResult {
  const guessed = new Set(state.guessedLetters);
  guessed.add(letter);
  return checkGameResult({ ...state, guessedLetters: guessed }, 'computer');
}

/** AI loses on its turn only when the player wins (tie is not a loss). */
function guessCausesAiLoss(state: GameState, letter: string): boolean {
  return resultAfterComputerGuess(state, letter) === 'player_wins';
}

function scoreLetterGuess(difficulty: AIDifficulty, state: GameState, letter: string): number {
  const { board, allPlacedWords, guessedLetters } = state;
  const beforePos = getRevealedPositions(board, guessedLetters);
  const afterGuessed = new Set(guessedLetters);
  afterGuessed.add(letter);
  const afterPos = getRevealedPositions(board, afterGuessed);

  const cellToWords = getCellToWordsMap(allPlacedWords);
  let score = 0;

  for (const key of afterPos) {
    if (beforePos.has(key)) continue;
    const words = cellToWords.get(key) ?? [];
    const hasPlayer = words.some((w) => w.owner === 'player');
    const hasComputer = words.some((w) => w.owner === 'computer');
    const hasFiller = words.some((w) => w.owner === 'filler');
    if (hasPlayer) score += 2;
    else if (hasComputer) score -= 1;
    else if (hasFiller) score += (difficulty === 'hard' ? 1 : 2);
  }

  const beforeWords = getRevealedWords(allPlacedWords, board, guessedLetters);
  const afterWords = getRevealedWords(allPlacedWords, board, afterGuessed);
  for (const w of afterWords) {
    if (!beforeWords.has(w)) {
      if (w.owner === 'player') score += 4;
      else if (w.owner === 'computer') score -= 3;
    }
  }

  return score;
}

function sortLettersByScore(difficulty: AIDifficulty, state: GameState, letters: string[]): string[] {
  const scored = letters.map((l) => ({ l, s: scoreLetterGuess(difficulty, state, l) }));
  scored.sort((a, b) => b.s - a.s || a.l.localeCompare(b.l));
  return scored.map((x) => x.l);
}

function targetRankIndex(difficulty: AIDifficulty, movesSoFar: number): number {
  const base =
    difficulty === 'hard' ? 0 :
    difficulty === 'normal' ? 1 : 2;

  const every =
    difficulty === 'hard' ? 5 :
    difficulty === 'normal' ? 3 : 2;

  const moves = Number.isFinite(movesSoFar) ? Math.max(0, Math.floor(movesSoFar)) : 0;
  return base + Math.floor(moves / every);
}

/**
 * Deterministic AI: rank every unguessed board letter by a fixed score, break ties
 * with alphabetical order. Difficulty chooses 1st / 2nd / 3rd best, with fallbacks
 * when the preferred guess would lose (tie allowed) or when there are not enough
 * distinct ranks (clamped via start index). If only one letter is left to guess,
 * that letter is always chosen regardless of difficulty.
 */
export function getAIGuess(
  gameState: GameState,
  difficulty: AIDifficulty = 'normal'
): string | null {
  const available = availableLetters(gameState);
  if (available.length === 0) return null;
  // Only one unguessed letter on the board — no ranking / difficulty choice.
  if (available.length === 1) return available[0]!;

  const sorted = sortLettersByScore(difficulty, gameState, available);

  const best = sorted[0]!;
  if (resultAfterComputerGuess(gameState, best) === 'computer_wins') {
    return best;
  }

  const want = targetRankIndex(difficulty, gameState.guessedLetters.size);
  const startIdx = Math.min(want, sorted.length - 1);

  for (let i = startIdx; i >= 0; i--) {
    const letter = sorted[i]!;
    if (!guessCausesAiLoss(gameState, letter)) return letter;
  }

  return best;
}
