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

function getGuessedLetters(guesses: Guess[]): Set<string> {
  const guessed = new Set<string>();
  for (const { word } of guesses) {
    for (const char of word) {
      guessed.add(char);
    }
  }
  return guessed;
}

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

export function scoreWord(
  word: string,
  knownCorrect: Map<number, string>,
  guessedLetters: Set<string>,
  answer: string,
  guesses: Guess[],
): number {
  let weight = 0;

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

  for (const char of word) {
    if (VOWELS.has(char)) {
      if (!guessedLetters.has(char)) {
        weight += (vowelCounts.get(char) === 1 ? 0.15 : 0.1);
      }
    }
  }

  if (POPULAR_WORDS.has(word)) {
    weight += 0.1;
  }

  if (word === answer && guesses.length > 0 && countLettersOnBoard(word, guesses) >= 2) {
    weight += countLettersOnBoard(word, guesses) * 0.05;
  }

  return weight;
}

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

  for (const { word, weight } of weighted) {
    if (Math.random() <= weight) {
      return word;
    }
  }

  return weighted[weighted.length - 1].word;
}
