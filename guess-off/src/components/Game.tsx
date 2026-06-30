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
  type Player,
} from '../game';
import { pickComputerGuess } from '../ai';
import { GuessRow } from './GuessRow';
import { Keyboard } from './Keyboard';
import { ShareButton } from './ShareButton';
import { BackgroundCanvas } from './BackgroundCanvas';

interface GameProps {
  firstPlayer: Player;
  onNewGame: (winner: Player) => void;
}

export function Game({ firstPlayer, onNewGame }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(() => createGame(undefined, firstPlayer));
  const [currentWord, setCurrentWord] = useState('');
  const [error, setError] = useState('');
  const aiThinking = gameState.turn === 'computer' && gameState.result === 'playing';
  const { turn, result, guesses, answer } = gameState;

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
    if (turn !== 'computer' || result !== 'playing') {
      return;
    }

    const thinkTime = 1000 + Math.random() * 2000;
    const timer = setTimeout(() => {
      const guess = pickComputerGuess(guesses, answer);
      setGameState((state) => submitComputerGuess(state, guess));
    }, thinkTime);

    return () => clearTimeout(timer);
  }, [turn, result, guesses, answer]);

  const isGameOver = gameState.result !== 'playing';
  const keyboardDimmed = aiThinking || isGameOver;

  const activePlayer = turn === 'human' ? 'B' : 'A';

  return (
    <>
      <BackgroundCanvas activePlayer={activePlayer} />
      <div className="game">
        <header className="game-header">
          <p className="turn-indicator">
            {aiThinking && <span className="turn-spinner" aria-hidden="true" />}
            {isGameOver
              ? gameState.result === 'human_wins'
                ? 'You win!'
                : 'Computer wins!'
              : aiThinking
                ? 'Computer is guessing...'
                : 'Your turn'}
          </p>
        </header>

        <div className="game-main">
          <div className="guess-board-scroll">
            <section className="guess-board">
              {gameState.guesses.map((guess, i) => (
                <GuessRow key={i} guess={guess} />
              ))}
              {!isGameOver && gameState.turn === 'human' && !aiThinking && (
                <GuessRow currentWord={currentWord} active player="human" />
              )}
              {aiThinking && <GuessRow currentWord="....." active player="computer" />}
            </section>

            {error && <p className="error-message">{error}</p>}
          </div>

          <div className="game-bottom">
            <div className="keyboard-wrapper">
              <Keyboard
                letterStates={letterStates}
                onKey={handleKey}
                disabled={isGameOver || gameState.turn !== 'human' || aiThinking}
                dimmed={keyboardDimmed}
              />

              {isGameOver && (
                <div className="game-over">
                  <p>
                    The word was <strong>{gameState.answer.toUpperCase()}</strong>
                  </p>
                  <div className="game-over-actions">
                    <button
                      type="button"
                      onClick={() =>
                        onNewGame(gameState.result === 'human_wins' ? 'human' : 'computer')
                      }
                    >
                      Play Again
                    </button>
                    <ShareButton />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="game-bottom-spacer" aria-hidden="true" />
        </div>
      </div>
    </>
  );
}
