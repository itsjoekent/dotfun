import { type Direction, type PlacedWord, type GameState, BOARD_SIZE } from './game';
import wordsData from './words.json';
import dictionaryData from './dictionary.json';

export interface BoardPosition {
  word: string;
  startRow: number;
  startCol: number;
  direction: Direction;
  owner: 'player' | 'computer' | 'filler';
}

export interface GeneratedBoard {
  board: (string | null)[][];
  player: {
    four: string;
    five: string;
    placed: BoardPosition[];
  };
  computer: {
    four: string;
    five: string;
    placed: BoardPosition[];
  };
  fillerWords: BoardPosition[];
  allPlacedWords: BoardPosition[];
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createEmptyBoard(): (string | null)[][] {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
}

function canPlaceWord(
  board: (string | null)[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: Direction
): boolean {
  const len = word.length;
  
  if (direction === 'horizontal') {
    if (startCol + len > BOARD_SIZE) return false;
  } else {
    if (startRow + len > BOARD_SIZE) return false;
  }
  
  for (let i = 0; i < len; i++) {
    const row = direction === 'horizontal' ? startRow : startRow + i;
    const col = direction === 'horizontal' ? startCol + i : startCol;
    const letter = word[i];
    
    const currentCell = board[row][col];
    if (currentCell !== null && currentCell !== letter) {
      return false;
    }
    
    const adjacentOffsets = direction === 'horizontal'
      ? [[-1, 0], [1, 0]]
      : [[0, -1], [0, 1]];
    
    for (const [dr, dc] of adjacentOffsets) {
      const adjRow = row + dr;
      const adjCol = col + dc;
      if (adjRow >= 0 && adjRow < BOARD_SIZE && adjCol >= 0 && adjCol < BOARD_SIZE) {
        if (board[adjRow][adjCol] !== null) {
          if (currentCell !== letter) {
            return false;
          }
        }
      }
    }
    
    if (i === 0) {
      const beforeRow = direction === 'horizontal' ? row : row - 1;
      const beforeCol = direction === 'horizontal' ? col - 1 : col;
      if (beforeRow >= 0 && beforeCol >= 0 && board[beforeRow][beforeCol] !== null) {
        return false;
      }
    }
    if (i === len - 1) {
      const afterRow = direction === 'horizontal' ? row : row + 1;
      const afterCol = direction === 'horizontal' ? col + 1 : col;
      if (afterRow < BOARD_SIZE && afterCol < BOARD_SIZE && board[afterRow][afterCol] !== null) {
        return false;
      }
    }
  }
  
  return true;
}

function placeWord(
  board: (string | null)[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: Direction
): void {
  for (let i = 0; i < word.length; i++) {
    const row = direction === 'horizontal' ? startRow : startRow + i;
    const col = direction === 'horizontal' ? startCol + i : startCol;
    board[row][col] = word[i];
  }
}

function tryPlaceWord(
  board: (string | null)[][],
  word: string,
  maxAttempts = 100
): Omit<PlacedWord, 'owner'> | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const direction: Direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    const maxRow = direction === 'horizontal' ? BOARD_SIZE : BOARD_SIZE - word.length;
    const maxCol = direction === 'horizontal' ? BOARD_SIZE - word.length : BOARD_SIZE;
    
    const startRow = Math.floor(Math.random() * maxRow);
    const startCol = Math.floor(Math.random() * maxCol);
    
    if (canPlaceWord(board, word, startRow, startCol, direction)) {
      placeWord(board, word, startRow, startCol, direction);
      return { word, startRow, startCol, direction };
    }
  }
  return null;
}

function generateBoardWithWords(
  playerFour: string,
  playerFive: string,
  computerFour: string,
  computerFive: string
): GeneratedBoard | null {
  const combinedBoard = createEmptyBoard();
  
  // Place player words
  const playerPlaced: BoardPosition[] = [];
  for (const word of [playerFive, playerFour]) {
    const placement = tryPlaceWord(combinedBoard, word);
    if (!placement) return null;
    playerPlaced.push({ ...placement, owner: 'player' });
  }
  
  // Place computer words
  const computerPlaced: BoardPosition[] = [];
  for (const word of [computerFive, computerFour]) {
    const placement = tryPlaceWord(combinedBoard, word, 50);
    if (!placement) return null;
    computerPlaced.push({ ...placement, owner: 'computer' });
  }
  
  // Place filler words
  const usedWords = new Set([playerFour, playerFive, computerFour, computerFive]);
  const allWords = [...wordsData.four, ...wordsData.five];
  const availableFillers = allWords.filter(w => !usedWords.has(w)).sort(() => Math.random() - 0.5);
  
  const fillerWords: BoardPosition[] = [];
  for (const word of availableFillers.slice(0, 18)) {
    if (fillerWords.length >= 6) break;
    const placement = tryPlaceWord(combinedBoard, word, 50);
    if (placement) {
      fillerWords.push({ ...placement, owner: 'filler' });
    }
  }
  
  const allPlacedWords = [...playerPlaced, ...computerPlaced, ...fillerWords];
  
  return {
    board: combinedBoard,
    player: {
      four: playerFour,
      five: playerFive,
      placed: playerPlaced,
    },
    computer: {
      four: computerFour,
      five: computerFive,
      placed: computerPlaced,
    },
    fillerWords,
    allPlacedWords,
  };
}

/**
 * Generate a new game board with random words
 */
export function generateRandomBoard(): GeneratedBoard {
  let result: GeneratedBoard | null = null;
  let attempts = 0;
  
  while (!result && attempts < 10) {
    result = generateBoardWithWords(
      getRandomElement(wordsData.four),
      getRandomElement(wordsData.five),
      getRandomElement(wordsData.four),
      getRandomElement(wordsData.five)
    );
    attempts++;
  }
  
  if (!result) {
    throw new Error('Failed to generate board');
  }
  
  return result;
}

/**
 * Generate a game board with specific player words (vs AI)
 */
export function generateBoardWithPlayerWords(
  playerFour: string,
  playerFive: string
): GeneratedBoard {
  let result: GeneratedBoard | null = null;
  let attempts = 0;
  
  while (!result && attempts < 10) {
    result = generateBoardWithWords(
      playerFour.toLowerCase(),
      playerFive.toLowerCase(),
      getRandomElement(wordsData.four),
      getRandomElement(wordsData.five)
    );
    attempts++;
  }
  
  if (!result) {
    throw new Error('Failed to generate board with specified words');
  }
  
  return result;
}

/**
 * Generate a game board for multiplayer with both players' words
 */
export function generateMultiplayerBoard(
  player1Four: string,
  player1Five: string,
  player2Four: string,
  player2Five: string
): GeneratedBoard {
  let result: GeneratedBoard | null = null;
  let attempts = 0;
  
  while (!result && attempts < 10) {
    result = generateBoardWithWords(
      player1Four.toLowerCase(),
      player1Five.toLowerCase(),
      player2Four.toLowerCase(),
      player2Five.toLowerCase()
    );
    attempts++;
  }
  
  if (!result) {
    throw new Error('Failed to generate multiplayer board');
  }
  
  return result;
}

/**
 * Convert a generated board into a GameState
 */
export function boardToGameState(board: GeneratedBoard): GameState {
  return {
    board: board.board,
    player: board.player,
    computer: board.computer,
    fillerWords: board.fillerWords,
    allPlacedWords: board.allPlacedWords,
    guessedLetters: new Set(),
    currentTurn: 'player',
  };
}

// Create Sets for fast dictionary lookup
const fourLetterDictionary = new Set(dictionaryData.four);
const fiveLetterDictionary = new Set(dictionaryData.five);

/**
 * Validate words against the dictionary
 */
export function validateWords(fourLetter: string, fiveLetter: string): string | null {
  const four = fourLetter.toLowerCase();
  const five = fiveLetter.toLowerCase();
  
  if (four.length !== 4) {
    return 'First word must be 4 letters';
  }
  if (five.length !== 5) {
    return 'Second word must be 5 letters';
  }
  if (!fourLetterDictionary.has(four)) {
    return `"${fourLetter}" is not a valid word`;
  }
  if (!fiveLetterDictionary.has(five)) {
    return `"${fiveLetter}" is not a valid word`;
  }
  return null;
}
