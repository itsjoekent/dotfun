import type { Guess, Player } from '../game';

interface GuessRowProps {
  guess?: Guess;
  currentWord?: string;
  active?: boolean;
  player?: Player;
}

const PLAYER_EMOJI: Record<Player, string> = {
  human: '😼',
  computer: '🤖',
};

export function GuessRow({ guess, currentWord, active, player }: GuessRowProps) {
  const letters = guess?.word.split('') ?? currentWord?.padEnd(5, ' ').split('') ?? Array(5).fill('');
  const displayPlayer = guess?.player ?? player;

  return (
    <div className={`guess-row ${active ? 'active' : ''} ${displayPlayer ?? ''}`}>
      <span className="guess-row-emoji" aria-hidden="true">
        {displayPlayer ? PLAYER_EMOJI[displayPlayer] : ''}
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
