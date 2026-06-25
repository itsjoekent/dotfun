import type { LetterStatus } from '../game';

const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
];

interface KeyboardProps {
  letterStates: Map<string, LetterStatus>;
  onKey: (key: string) => void;
  disabled?: boolean;
}

function statusClass(status: LetterStatus | undefined): string {
  if (status === 'correct') return 'key-correct';
  if (status === 'present') return 'key-present';
  if (status === 'absent') return 'key-absent';
  return '';
}

function keyLabel(key: string): string {
  if (key === 'enter') return 'Enter';
  if (key === 'backspace') return '⌫';
  return key.toUpperCase();
}

export function Keyboard({ letterStates, onKey, disabled }: KeyboardProps) {
  return (
    <div className="keyboard">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard-row">
          {row.map((key) => {
            const isWide = key === 'enter' || key === 'backspace';
            const isAbsent = !isWide && letterStates.get(key) === 'absent';

            return (
              <button
                key={key}
                type="button"
                className={`key ${isWide ? 'key-wide' : ''} ${statusClass(letterStates.get(key))}`}
                onClick={() => onKey(key)}
                disabled={disabled || isAbsent}
              >
                {keyLabel(key)}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
