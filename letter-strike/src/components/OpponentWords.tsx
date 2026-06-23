import { useState, useEffect } from 'react';
import { type PlacedWord, isWordRevealed, getRevealedPositions } from '../game';

interface OpponentWordsProps {
  words: {
    four: string;
    five: string;
    placed: PlacedWord[];
  };
  board: (string | null)[][];
  guessedLetters: Set<string>;
  fadingOut?: boolean;
  isMultiplayer?: boolean;
}

export function OpponentWords({
  words,
  board,
  guessedLetters,
  fadingOut,
}: OpponentWordsProps) {
  const [animatedIn, setAnimatedIn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedIn(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const revealedPositions = getRevealedPositions(board, guessedLetters);
  const fourLetterRevealed = words.placed.some(
    (w) => w.word === words.four && isWordRevealed(w, revealedPositions)
  );
  const fiveLetterRevealed = words.placed.some(
    (w) => w.word === words.five && isWordRevealed(w, revealedPositions)
  );

  return (
    <div
      className={`opponent-words ${animatedIn ? 'animated-in' : ''} ${fadingOut ? 'fading-out' : ''}`}
    >
      <span className="opponent-words-label">Their words:</span>
      <div className="word-badges-row">
        {fourLetterRevealed ? (
          <span className="word-badge">{words.four}</span>
        ) : (
          <span className="word-badge hidden">••••</span>
        )}

        {fiveLetterRevealed ? (
          <span className="word-badge">{words.five}</span>
        ) : (
          <span className="word-badge hidden">•••••</span>
        )}
      </div>
    </div>
  );
}
