import type { Guess } from '../game';

interface GuessRowProps {
  guess?: Guess;
  currentWord?: string;
  active?: boolean;
}

export function GuessRow({ guess, currentWord, active }: GuessRowProps) {
  const letters = guess?.word.split('') ?? currentWord?.padEnd(5, ' ').split('') ?? Array(5).fill('');

  return (
    <div className={`guess-row ${active ? 'active' : ''} ${guess?.player ?? ''}`}>
      {letters.map((letter, i) => {
        const status = guess?.feedback[i];
        return (
          <div key={i} className={`guess-tile ${status ?? ''} ${letter.trim() ? 'filled' : ''}`}>
            {letter.trim() ? letter.toUpperCase() : ''}
          </div>
        );
      })}
    </div>
  );
}
