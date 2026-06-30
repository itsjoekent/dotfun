import type { Guess, Player } from '../game';
import gloveBlue from '../assets/glove-blue-top.png';
import gloveRed from '../assets/glove-red-top.png';

interface GuessRowProps {
  guess?: Guess;
  currentWord?: string;
  active?: boolean;
  player?: Player;
}

const PLAYER_GLOVE: Record<Player, string> = {
  human: gloveBlue,
  computer: gloveRed,
};

export function GuessRow({ guess, currentWord, active, player }: GuessRowProps) {
  const letters = guess?.word.split('') ?? currentWord?.padEnd(5, ' ').split('') ?? Array(5).fill('');
  const displayPlayer = guess?.player ?? player;

  return (
    <div className={`guess-row ${active ? 'active' : ''} ${displayPlayer ?? ''}`}>
      <span className="guess-row-player" aria-hidden="true">
        {displayPlayer && (
          <img src={PLAYER_GLOVE[displayPlayer]} alt="" className="guess-row-glove" />
        )}
      </span>
      <div className="guess-row-tiles">
        {letters.map((letter, i) => {
          const status = guess?.feedback[i];
          return (
            <div key={i} className={`guess-tile ${status ?? ''} ${letter.trim() ? 'filled' : ''}`}>
              {letter.trim() ? letter.toUpperCase() : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
