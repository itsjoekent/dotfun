import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createGame,
  hasBeenGuessed,
  isValidGuess,
  mergeLetterStates,
  submitComputerGuess,
  submitGuess,
  type GameState,
  type LetterStatus,
} from '../game';
import { pickComputerGuess } from '../ai';
import { GuessRow } from './GuessRow';
import { Keyboard } from './Keyboard';

interface GameProps {
  onNewGame: () => void;
}

export function Game({ onNewGame }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(() => createGame());
  const [currentWord, setCurrentWord] = useState('');
  const [error, setError] = useState('');
  const [aiThinking, setAiThinking] = useState(false);

  const letterStates = useMemo(() => {
    let states = new Map<string, LetterStatus>();
    for (const guess of gameState.guesses) {
      states = mergeLetterStates(states, guess.word, guess.feedback);
    }
    return states;
  }, [gameState.guesses]);

  const submitWord = useCallback(
    (word: string) => {
      if (!isValidGuess(word)) {
        setError('Not in word list');
        return;
      }
      if (hasBeenGuessed(gameState.guesses, word)) {
        setError('Already guessed');
        return;
      }
      setError('');
      setCurrentWord('');
      setGameState((state) => submitGuess(state, word));
    },
    [gameState.guesses],
  );

  const handleKey = useCallback(
    (key: string) => {
      if (gameState.result !== 'playing' || gameState.turn !== 'human' || aiThinking) {
        return;
      }

      if (key === 'backspace') {
        setCurrentWord((w) => w.slice(0, -1));
        setError('');
        return;
      }

      if (key === 'enter') {
        if (currentWord.length !== 5) {
          setError('Word must be 5 letters');
          return;
        }
        submitWord(currentWord);
        return;
      }

      if (/^[a-z]$/.test(key) && currentWord.length < 5) {
        setCurrentWord((w) => w + key);
        setError('');
      }
    },
    [aiThinking, currentWord, gameState.result, gameState.turn, submitWord],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'enter') {
        e.preventDefault();
        handleKey('enter');
      } else if (key === 'backspace') {
        e.preventDefault();
        handleKey('backspace');
      } else if (/^[a-z]$/.test(key)) {
        handleKey(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKey]);

  useEffect(() => {
    if (gameState.turn !== 'computer' || gameState.result !== 'playing') {
      return;
    }

    const { guesses, answer } = gameState;
    setAiThinking(true);
    const timer = setTimeout(() => {
      const guess = pickComputerGuess(guesses, answer);
      setGameState((state) => submitComputerGuess(state, guess));
      setAiThinking(false);
    }, 600);

    return () => {
      clearTimeout(timer);
      setAiThinking(false);
    };
  }, [gameState.turn, gameState.result, gameState.guesses]);

  return (
    <div className="game">
      <header className="game-header">
        <h1>Guess Off</h1>
        <p className="turn-indicator">
          {gameState.result !== 'playing'
            ? gameState.result === 'human_wins'
              ? 'You win!'
              : 'Computer wins!'
            : aiThinking
              ? 'Computer is guessing...'
              : 'Your turn'}
        </p>
      </header>

      <section className="guess-board">
        {gameState.guesses.map((guess, i) => (
          <GuessRow key={i} guess={guess} />
        ))}
        {gameState.result === 'playing' && gameState.turn === 'human' && !aiThinking && (
          <GuessRow currentWord={currentWord} active />
        )}
        {aiThinking && <GuessRow currentWord="....." active />}
      </section>

      {error && <p className="error-message">{error}</p>}

      {gameState.result !== 'playing' && (
        <div className="game-over">
          <p>The word was <strong>{gameState.answer.toUpperCase()}</strong></p>
          <button type="button" onClick={onNewGame}>
            Play Again
          </button>
        </div>
      )}

      <Keyboard
        letterStates={letterStates}
        onKey={handleKey}
        disabled={gameState.result !== 'playing' || gameState.turn !== 'human' || aiThinking}
      />
    </div>
  );
}
