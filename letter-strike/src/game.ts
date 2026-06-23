import wordsData from './words.json';

export const BOARD_SIZE = 9;

export type Direction = 'horizontal' | 'vertical';

export type WordOwner = 'player' | 'computer' | 'filler';

export interface PlacedWord {
  word: string;
  startRow: number;
  startCol: number;
  direction: Direction;
  owner: WordOwner;
}

export interface PlayerWords {
  four: string;
  five: string;
  placed: PlacedWord[];
}

export interface GameState {
  board: (string | null)[][];
  player: PlayerWords;
  computer: PlayerWords;
  fillerWords: PlacedWord[];
  allPlacedWords: PlacedWord[];
  guessedLetters: Set<string>;
  currentTurn: 'player' | 'computer';
}

/** Compact share payload: dense board + segment strings only (short URLs). */
export interface CompactReplayLayout {
  /** Row-major 9×9; `.` = empty cell */
  b: string;
  /** Player word segments `r1,c1,r2,c2` (4- then 5-letter by length) */
  p: [string, string];
  /** Computer word segments */
  c: [string, string];
  /** Filler word segments */
  l: string[];
}

const EMPTY_CELL = '.';

export function boardToCompactString(board: (string | null)[][]): string {
  let s = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r]![c];
      s += cell === null ? EMPTY_CELL : cell.toLowerCase();
    }
  }
  return s;
}

export function boardFromCompactString(b: string): (string | null)[][] {
  if (b.length !== BOARD_SIZE * BOARD_SIZE) {
    throw new Error('Invalid compact board length');
  }
  const board: (string | null)[][] = [];
  let i = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const ch = b[i]!;
      i += 1;
      row.push(ch === EMPTY_CELL ? null : ch);
    }
    board.push(row);
  }
  return board;
}

export function placedWordToSegment(pw: PlacedWord): string {
  const { startRow, startCol, direction, word } = pw;
  const len = word.length;
  if (direction === 'horizontal') {
    return `${startRow},${startCol},${startRow},${startCol + len - 1}`;
  }
  return `${startRow},${startCol},${startRow + len - 1},${startCol}`;
}

function segmentToPlacedWord(
  seg: string,
  board: (string | null)[][],
  owner: WordOwner
): PlacedWord {
  const parts = seg.split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    throw new Error('Invalid word segment');
  }
  const [r1, c1, r2, c2] = parts;
  const horizontal = r1 === r2;
  const vertical = c1 === c2;
  if (!horizontal && !vertical) {
    throw new Error('Invalid word segment');
  }

  let startRow: number;
  let startCol: number;
  const direction: Direction = horizontal ? 'horizontal' : 'vertical';
  let word = '';

  if (horizontal) {
    startRow = r1;
    const cStart = Math.min(c1, c2);
    const cEnd = Math.max(c1, c2);
    startCol = cStart;
    for (let c = cStart; c <= cEnd; c++) {
      const ch = board[startRow]![c];
      if (ch === null) throw new Error('Empty cell in word');
      word += ch;
    }
  } else {
    startCol = c1;
    const rStart = Math.min(r1, r2);
    const rEnd = Math.max(r1, r2);
    startRow = rStart;
    for (let r = rStart; r <= rEnd; r++) {
      const ch = board[r]![startCol];
      if (ch === null) throw new Error('Empty cell in word');
      word += ch;
    }
  }

  return { word, startRow, startCol, direction, owner };
}

export function compactReplayFromGameState(state: GameState): CompactReplayLayout {
  const sortPlaced = (placed: PlacedWord[]) =>
    [...placed].sort((a, b) => a.word.length - b.word.length);

  const playerSorted = sortPlaced(state.player.placed);
  const computerSorted = sortPlaced(state.computer.placed);

  if (playerSorted.length !== 2 || computerSorted.length !== 2) {
    throw new Error('Expected two words per side');
  }

  return {
    b: boardToCompactString(state.board),
    p: [placedWordToSegment(playerSorted[0]!), placedWordToSegment(playerSorted[1]!)],
    c: [placedWordToSegment(computerSorted[0]!), placedWordToSegment(computerSorted[1]!)],
    l: state.fillerWords.map(placedWordToSegment),
  };
}

export function gameStateFromCompactReplay(
  layout: CompactReplayLayout,
  my: { four: string; five: string },
  opp: { four: string; five: string }
): GameState {
  const board = boardFromCompactString(layout.b);

  const playerPlaced = sortPlacedByWordLength([
    segmentToPlacedWord(layout.p[0]!, board, 'player'),
    segmentToPlacedWord(layout.p[1]!, board, 'player'),
  ]);
  const computerPlaced = sortPlacedByWordLength([
    segmentToPlacedWord(layout.c[0]!, board, 'computer'),
    segmentToPlacedWord(layout.c[1]!, board, 'computer'),
  ]);
  const fillerWords = layout.l.map((seg) => segmentToPlacedWord(seg, board, 'filler'));

  const allPlacedWords = [...playerPlaced, ...computerPlaced, ...fillerWords];

  return {
    board,
    player: {
      four: my.four,
      five: my.five,
      placed: playerPlaced,
    },
    computer: {
      four: opp.four,
      five: opp.five,
      placed: computerPlaced,
    },
    fillerWords,
    allPlacedWords,
    guessedLetters: new Set(),
    currentTurn: 'player',
  };
}

function sortPlacedByWordLength(placed: PlacedWord[]): PlacedWord[] {
  return [...placed].sort((a, b) => a.word.length - b.word.length);
}

const SEGMENT_RE = /^\d+,\d+,\d+,\d+$/;

export function isCompactReplayLayoutValid(data: unknown): data is CompactReplayLayout {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.b !== 'string' || d.b.length !== BOARD_SIZE * BOARD_SIZE) return false;
  for (const ch of d.b) {
    if (ch !== EMPTY_CELL && !/[a-z]/.test(ch)) return false;
  }
  if (!Array.isArray(d.p) || d.p.length !== 2 || !d.p.every((x) => typeof x === 'string' && SEGMENT_RE.test(x))) {
    return false;
  }
  if (!Array.isArray(d.c) || d.c.length !== 2 || !d.c.every((x) => typeof x === 'string' && SEGMENT_RE.test(x))) {
    return false;
  }
  if (!Array.isArray(d.l) || !d.l.every((x) => typeof x === 'string' && SEGMENT_RE.test(x))) {
    return false;
  }
  return true;
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function selectWordsForPlayer(): { four: string; five: string } {
  return {
    four: getRandomElement(wordsData.four),
    five: getRandomElement(wordsData.five),
  };
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
  
  // Check if word fits on board
  if (direction === 'horizontal') {
    if (startCol + len > BOARD_SIZE) return false;
  } else {
    if (startRow + len > BOARD_SIZE) return false;
  }
  
  // Check each cell the word would occupy
  for (let i = 0; i < len; i++) {
    const row = direction === 'horizontal' ? startRow : startRow + i;
    const col = direction === 'horizontal' ? startCol + i : startCol;
    const letter = word[i];
    
    // Check if cell is empty or has the same letter (intersection)
    const currentCell = board[row][col];
    if (currentCell !== null && currentCell !== letter) {
      return false;
    }
    
    // Check adjacent cells (words can't be directly next to each other, except at intersections)
    const adjacentOffsets = direction === 'horizontal'
      ? [[-1, 0], [1, 0]] // Check above and below for horizontal words
      : [[0, -1], [0, 1]]; // Check left and right for vertical words
    
    for (const [dr, dc] of adjacentOffsets) {
      const adjRow = row + dr;
      const adjCol = col + dc;
      if (adjRow >= 0 && adjRow < BOARD_SIZE && adjCol >= 0 && adjCol < BOARD_SIZE) {
        if (board[adjRow][adjCol] !== null) {
          // Adjacent cell has a letter - only allowed if this is an intersection
          if (currentCell !== letter) {
            return false;
          }
        }
      }
    }
    
    // Check cells before and after the word
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

function selectFillerWords(
  usedWords: Set<string>,
  targetCount: number
): string[] {
  // Collect all available words from 4 and 5 letter word lists only
  const allWords = [...wordsData.four, ...wordsData.five];
  const availableWords = allWords.filter(w => !usedWords.has(w));
  
  // Shuffle and pick words
  const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, targetCount);
}

function placeFillerWords(
  board: (string | null)[][],
  usedWords: Set<string>,
  targetCount: number = 8
): PlacedWord[] {
  const fillerCandidates = selectFillerWords(usedWords, targetCount * 3);
  const placed: PlacedWord[] = [];
  
  for (const word of fillerCandidates) {
    if (placed.length >= targetCount) break;
    
    const placement = tryPlaceWord(board, word, 50);
    if (placement) {
      placed.push({ ...placement, owner: 'filler' });
    }
  }
  
  return placed;
}

export function initializeGame(): GameState {
  // Select words for each player
  const playerWordSelection = selectWordsForPlayer();
  const computerWordSelection = selectWordsForPlayer();
  
  // Track used words to avoid duplicates
  const usedWords = new Set([
    playerWordSelection.four,
    playerWordSelection.five,
    computerWordSelection.four,
    computerWordSelection.five,
  ]);
  
  // Create a combined board with both players' words
  const combinedBoard = createEmptyBoard();
  
  // Place player words first
  const playerPlaced: PlacedWord[] = [];
  const playerWordList = [playerWordSelection.five, playerWordSelection.four];
  
  for (const word of playerWordList) {
    const placement = tryPlaceWord(combinedBoard, word);
    if (placement) {
      playerPlaced.push({ ...placement, owner: 'player' });
    } else {
      // If placement fails, restart
      console.warn(`Failed to place player word: ${word}, retrying...`);
      return initializeGame();
    }
  }
  
  // Now try to place computer words
  const computerPlaced: PlacedWord[] = [];
  const computerWordList = [computerWordSelection.five, computerWordSelection.four];
  
  let computerAttempts = 0;
  const maxComputerAttempts = 50;
  
  while (computerAttempts < maxComputerAttempts) {
    const testBoard = combinedBoard.map(row => [...row]);
    const tempPlaced: PlacedWord[] = [];
    let success = true;
    
    for (const word of computerWordList) {
      const placement = tryPlaceWord(testBoard, word);
      if (placement) {
        tempPlaced.push({ ...placement, owner: 'computer' });
      } else {
        success = false;
        break;
      }
    }
    
    if (success) {
      // Copy computer words to combined board
      for (const placement of tempPlaced) {
        placeWord(combinedBoard, placement.word, placement.startRow, placement.startCol, placement.direction);
        computerPlaced.push(placement);
      }
      break;
    }
    
    computerAttempts++;
  }
  
  if (computerAttempts >= maxComputerAttempts) {
    console.warn('Could not place all computer words, restarting...');
    return initializeGame();
  }
  
  // Place filler words to fill some empty spaces
  const fillerWords = placeFillerWords(combinedBoard, usedWords, 6);
  
  // Combine all placed words
  const allPlacedWords = [...playerPlaced, ...computerPlaced, ...fillerWords];
  
  return {
    board: combinedBoard,
    player: {
      ...playerWordSelection,
      placed: playerPlaced,
    },
    computer: {
      ...computerWordSelection,
      placed: computerPlaced,
    },
    fillerWords,
    allPlacedWords,
    guessedLetters: new Set(),
    currentTurn: 'player',
  };
}

export function getWordCells(placed: PlacedWord[]): Set<string> {
  const cells = new Set<string>();
  for (const { word, startRow, startCol, direction } of placed) {
    for (let i = 0; i < word.length; i++) {
      const row = direction === 'horizontal' ? startRow : startRow + i;
      const col = direction === 'horizontal' ? startCol + i : startCol;
      cells.add(`${row},${col}`);
    }
  }
  return cells;
}

// Get a map of cell positions to their owning words
export function getCellToWordsMap(allPlacedWords: PlacedWord[]): Map<string, PlacedWord[]> {
  const cellMap = new Map<string, PlacedWord[]>();
  
  for (const placedWord of allPlacedWords) {
    const { word, startRow, startCol, direction } = placedWord;
    for (let i = 0; i < word.length; i++) {
      const row = direction === 'horizontal' ? startRow : startRow + i;
      const col = direction === 'horizontal' ? startCol + i : startCol;
      const key = `${row},${col}`;
      
      if (!cellMap.has(key)) {
        cellMap.set(key, []);
      }
      cellMap.get(key)!.push(placedWord);
    }
  }
  
  return cellMap;
}

// Check if all letters of a word have been guessed (by position, not just letter value)
export function isWordRevealed(
  placed: PlacedWord,
  guessedPositions: Set<string>
): boolean {
  const { word, startRow, startCol, direction } = placed;
  for (let i = 0; i < word.length; i++) {
    const row = direction === 'horizontal' ? startRow : startRow + i;
    const col = direction === 'horizontal' ? startCol + i : startCol;
    if (!guessedPositions.has(`${row},${col}`)) {
      return false;
    }
  }
  return true;
}

// Get revealed positions from guessed letters
export function getRevealedPositions(
  board: (string | null)[][],
  guessedLetters: Set<string>
): Set<string> {
  const positions = new Set<string>();
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const letter = board[row][col];
      if (letter && guessedLetters.has(letter)) {
        positions.add(`${row},${col}`);
      }
    }
  }
  return positions;
}

// Get all revealed words
export function getRevealedWords(
  allPlacedWords: PlacedWord[],
  board: (string | null)[][],
  guessedLetters: Set<string>
): Set<PlacedWord> {
  const revealedPositions = getRevealedPositions(board, guessedLetters);
  const revealed = new Set<PlacedWord>();
  
  for (const placedWord of allPlacedWords) {
    if (isWordRevealed(placedWord, revealedPositions)) {
      revealed.add(placedWord);
    }
  }
  
  return revealed;
}

export function areAllWordsRevealed(
  playerWords: PlayerWords,
  board: (string | null)[][],
  guessedLetters: Set<string>
): boolean {
  const revealedPositions = getRevealedPositions(board, guessedLetters);
  return playerWords.placed.every(placed => isWordRevealed(placed, revealedPositions));
}

export type GameResult = 'playing' | 'player_wins' | 'computer_wins' | 'tie';

export function checkGameResult(
  gameState: GameState,
  lastGuesser: 'player' | 'computer'
): GameResult {
  const { board, player, computer, guessedLetters } = gameState;
  
  const playerWordsRevealed = areAllWordsRevealed(player, board, guessedLetters);
  const computerWordsRevealed = areAllWordsRevealed(computer, board, guessedLetters);
  
  if (playerWordsRevealed && computerWordsRevealed) {
    return 'tie';
  }
  
  if (lastGuesser === 'player') {
    // Player just guessed
    if (computerWordsRevealed) {
      return 'player_wins'; // Player revealed all computer words
    }
    if (playerWordsRevealed) {
      return 'computer_wins'; // Player accidentally revealed all their own words
    }
  } else {
    // Computer just guessed
    if (playerWordsRevealed) {
      return 'computer_wins'; // Computer revealed all player words
    }
    if (computerWordsRevealed) {
      return 'player_wins'; // Computer accidentally revealed all its own words
    }
  }
  
  return 'playing';
}
