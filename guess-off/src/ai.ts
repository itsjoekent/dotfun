import {
  getPossibleWords,
  getWordList,
  mergeLetterStates,
  type Guess,
  type LetterStatus,
} from './game';
import wordsData from './words.json';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const POPULAR_WORDS = new Set(wordsData.popularWords);

/** Green letters and their fixed positions from prior guesses. */
function getKnownCorrectPositions(guesses: Guess[]): Map<number, string> {
  const known = new Map<number, string>();
  for (const { word, feedback } of guesses) {
    for (let i = 0; i < 5; i++) {
      if (feedback[i] === 'correct') {
        known.set(i, word[i]);
      }
    }
  }
  return known;
}

/** Every letter the computer has already played (any position). */
function getGuessedLetters(guesses: Guess[]): Set<string> {
  const guessed = new Set<string>();
  for (const { word } of guesses) {
    for (const char of word) {
      guessed.add(char);
    }
  }
  return guessed;
}

/** Letters confirmed in the answer (green or yellow across all guesses). */
function getRevealedLetters(guesses: Guess[]): Set<string> {
  let states = new Map<string, LetterStatus>();
  for (const guess of guesses) {
    states = mergeLetterStates(states, guess.word, guess.feedback);
  }
  const revealed = new Set<string>();
  for (const [letter, status] of states) {
    if (status === 'correct' || status === 'present') {
      revealed.add(letter);
    }
  }
  return revealed;
}

/** How many of `word`'s letters are already known to be in the answer. */
function countLettersOnBoard(word: string, guesses: Guess[]): number {
  const revealed = getRevealedLetters(guesses);
  let count = 0;
  for (const char of word) {
    if (revealed.has(char)) {
      count++;
    }
  }
  return count;
}

/** Weighted nudge toward the answer from revealed correct vs present letters. */
function getAnswerCommitBonus(word: string, guesses: Guess[], knownCorrect: Map<number, string>): number {
  let states = new Map<string, LetterStatus>();
  for (const guess of guesses) {
    states = mergeLetterStates(states, guess.word, guess.feedback);
  }

  let bonus = 0;
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    if (knownCorrect.get(i) === char) {
      bonus += 0.03;
    } else if (states.get(char) === 'present' || states.get(char) === 'correct') {
      bonus += 0.01;
    }
  }
  return bonus;
}

/**
 * Heuristic preference for a candidate guess. Higher weight = more likely to
 * be chosen. Weights are probabilities in `pickComputerGuess`, not a ranking.
 */
export function scoreWord(
  word: string,
  knownCorrect: Map<number, string>,
  guessedLetters: Set<string>,
  answer: string,
  guesses: Guess[],
): number {
  let weight = 0;

  // Favor words that respect known green positions.
  for (const [index, letter] of knownCorrect) {
    if (word[index] === letter) {
      weight += 0.05;
    }
  }

  const vowelCounts = new Map<string, number>();
  for (const char of word) {
    if (VOWELS.has(char)) {
      vowelCounts.set(char, (vowelCounts.get(char) ?? 0) + 1);
    }
  }

  // Probe unseen vowels early; unique vowels score slightly higher.
  for (const char of word) {
    if (VOWELS.has(char)) {
      if (!guessedLetters.has(char)) {
        weight += (vowelCounts.get(char) === 1 ? 0.15 : 0.1);
      }
    }
  }

  // Common words are more natural guesses for a casual opponent.
  if (POPULAR_WORDS.has(word)) {
    weight += 0.1;
  }

  // Once several answer letters are on the board, nudge toward committing to
  // the real answer instead of dragging out the round.
  if (word === answer && guesses.length > 0 && countLettersOnBoard(word, guesses) >= 2) {
    weight += getAnswerCommitBonus(word, guesses, knownCorrect);
  }

  // Penalize candidates that ignore letters we already know are in the word.
  const revealedLetters = getRevealedLetters(guesses);
  for (const letter of revealedLetters) {
    if (!word.includes(letter)) {
      weight -= 0.05;
    }
  }

  return weight;
}

/** Choose the computer's next guess from words still consistent with feedback. */
export function pickComputerGuess(guesses: Guess[], answer: string): string {
  const possible = getPossibleWords(guesses);
  if (possible.length === 0) {
    return getWordList()[0];
  }
  if (possible.length === 1) {
    return possible[0];
  }

  const knownCorrect = getKnownCorrectPositions(guesses);
  const guessedLetters = getGuessedLetters(guesses);
  const weighted = possible
    .map((word) => ({ word, weight: scoreWord(word, knownCorrect, guessedLetters, answer, guesses) }))
    .sort((a, b) => b.weight - a.weight);

  // Weighted random walk: try highest-scored words first; each word gets a
  // `weight` chance of being picked. Fall back to the lowest-scored option.
  for (const { word, weight } of weighted) {
    if (Math.random() <= weight) {
      return word;
    }
  }

  return weighted[weighted.length - 1].word;
}
