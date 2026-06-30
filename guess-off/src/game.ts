import wordsData from './words.json';

export type LetterStatus = 'correct' | 'present' | 'absent';
export type Player = 'human' | 'computer';
export type GameResult = 'playing' | 'human_wins' | 'computer_wins';

export interface Guess {
  word: string;
  feedback: LetterStatus[];
  player: Player;
}

export interface GameState {
  answer: string;
  guesses: Guess[];
  turn: Player;
  result: GameResult;
}

const WORD_LIST = wordsData.five;
const WORD_SET = new Set(WORD_LIST);
const POPULAR_WORD_LIST = wordsData.popularWords;

export function getWordList(): string[] {
  return WORD_LIST;
}

export function pickRandomAnswer(): string {
  return POPULAR_WORD_LIST[Math.floor(Math.random() * POPULAR_WORD_LIST.length)];
}

export function isValidGuess(word: string): boolean {
  return word.length === 5 && WORD_SET.has(word.toLowerCase());
}

export function hasBeenGuessed(guesses: Guess[], word: string): boolean {
  const normalized = word.toLowerCase();
  return guesses.some((g) => g.word === normalized);
}

export function computeFeedback(guess: string, answer: string): LetterStatus[] {
  const result: LetterStatus[] = Array(5).fill('absent');
  const answerChars = answer.split('');
  const guessChars = guess.toLowerCase().split('');
  const used = Array(5).fill(false);

  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessChars[i] === answerChars[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

function statusRank(status: LetterStatus): number {
  return status === 'correct' ? 3 : status === 'present' ? 2 : 1;
}

export function filterPossibleWords(candidates: string[], guess: string, feedback: LetterStatus[]): string[] {
  return candidates.filter((word) => {
    const computed = computeFeedback(guess, word);
    return computed.every((status, i) => status === feedback[i]);
  });
}

export function getPossibleWords(guesses: Guess[]): string[] {
  const guessed = new Set(guesses.map((g) => g.word));
  const candidates = guesses.reduce(
    (candidates, { word, feedback }) => filterPossibleWords(candidates, word, feedback),
    [...WORD_LIST],
  );
  return candidates.filter((w) => !guessed.has(w));
}

export function mergeLetterStates(
  current: Map<string, LetterStatus>,
  guess: string,
  feedback: LetterStatus[],
): Map<string, LetterStatus> {
  const next = new Map(current);
  for (let i = 0; i < 5; i++) {
    const letter = guess[i];
    const status = feedback[i];
    const existing = next.get(letter);
    if (!existing || statusRank(status) > statusRank(existing)) {
      next.set(letter, status);
    }
  }
  return next;
}

export function createGame(answer?: string, firstPlayer: Player = 'human'): GameState {
  return {
    answer: (answer ?? pickRandomAnswer()).toLowerCase(),
    guesses: [],
    turn: firstPlayer,
    result: 'playing',
  };
}

export function submitGuess(state: GameState, word: string): GameState {
  const guess = word.toLowerCase();
  if (state.result !== 'playing' || state.turn !== 'human') {
    return state;
  }
  if (!isValidGuess(guess)) {
    return state;
  }
  if (hasBeenGuessed(state.guesses, guess)) {
    return state;
  }

  const feedback = computeFeedback(guess, state.answer);
  const guesses: Guess[] = [...state.guesses, { word: guess, feedback, player: 'human' }];

  if (guess === state.answer) {
    return { ...state, guesses, result: 'human_wins' };
  }

  return { ...state, guesses, turn: 'computer' };
}

export function submitComputerGuess(state: GameState, word: string): GameState {
  const guess = word.toLowerCase();
  const feedback = computeFeedback(guess, state.answer);
  const guesses: Guess[] = [...state.guesses, { word: guess, feedback, player: 'computer' }];

  if (guess === state.answer) {
    return { ...state, guesses, result: 'computer_wins' };
  }

  return { ...state, guesses, turn: 'human' };
}
