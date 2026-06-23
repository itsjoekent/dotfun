import { useState, useCallback } from 'react';
import { validateWords } from '../boardGenerator';
import wordsData from '../words.json';

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type AIDifficulty = 'easy' | 'normal' | 'hard';

export interface CustomGameConfig {
  aiDifficulty: AIDifficulty;
  timerEnabled: boolean;
  timerDuration: number;
  playerFourLetter: string;
  playerFiveLetter: string;
}

interface CustomGameSettingsProps {
  onStartGame: (config: CustomGameConfig) => void;
  onBack?: () => void;
  onHowToPlay?: () => void;
}

const TIMER_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

export function CustomGameSettings({ onStartGame, onBack, onHowToPlay }: CustomGameSettingsProps) {
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('normal');
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(15);
  const [fourLetter, setFourLetter] = useState('');
  const [fiveLetter, setFiveLetter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRandomWords = useCallback(() => {
    const randomFour = getRandomElement(wordsData.four);
    const randomFive = getRandomElement(wordsData.five);
    setFourLetter(randomFour);
    setFiveLetter(randomFive);
    setError(null);
  }, []);

  const handleSubmit = useCallback(() => {
    setError(null);

    const four = fourLetter.trim();
    const five = fiveLetter.trim();

    if (!four || !five) {
      setError('Please enter both words');
      return;
    }

    const validationError = validateWords(four, five);
    if (validationError) {
      setError(validationError);
      return;
    }

    onStartGame({
      aiDifficulty,
      timerEnabled,
      timerDuration,
      playerFourLetter: four.toLowerCase(),
      playerFiveLetter: five.toLowerCase(),
    });
  }, [fourLetter, fiveLetter, aiDifficulty, timerEnabled, timerDuration, onStartGame]);

  return (
    <div className="custom-game-settings">
      <div className="settings-section">
        <label className="settings-label">AI Difficulty</label>
        <div className="difficulty-options">
          {(['easy', 'normal', 'hard'] as const).map((diff) => (
            <button
              key={diff}
              type="button"
              className={`difficulty-btn ${aiDifficulty === diff ? 'active' : ''}`}
              onClick={() => setAiDifficulty(diff)}
            >
              {diff.charAt(0).toUpperCase() + diff.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <label className="settings-label">
          <input
            type="checkbox"
            checked={timerEnabled}
            onChange={(e) => setTimerEnabled(e.target.checked)}
          />
          Enable Timer
        </label>

        {timerEnabled && (
          <div className="timer-options">
            <label className="timer-label">Time per turn:</label>
            <select
              value={timerDuration}
              onChange={(e) => setTimerDuration(Number(e.target.value))}
              className="timer-select"
            >
              {TIMER_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}s
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="settings-section">
        <label className="settings-label">Your Words</label>
        <p className="settings-hint">
          Pick your secret words that the computer will try to reveal, or use random words
        </p>

        <div className="word-inputs">
          <div className="word-input-group">
            <label>4-letter word</label>
            <input
              type="text"
              value={fourLetter}
              onChange={(e) => setFourLetter(e.target.value.slice(0, 4))}
              placeholder="e.g. game"
              maxLength={4}
              className="word-input"
            />
          </div>

          <div className="word-input-group">
            <label>5-letter word</label>
            <input
              type="text"
              value={fiveLetter}
              onChange={(e) => setFiveLetter(e.target.value.slice(0, 5))}
              placeholder="e.g. words"
              maxLength={5}
              className="word-input"
            />
          </div>
        </div>

        <button type="button" className="menu-btn secondary random-words-btn" onClick={handleRandomWords}>
          Random words
        </button>

        {error && <p className="settings-error">{error}</p>}
      </div>

      <div className="settings-actions">
        <button type="button" className="menu-btn primary" onClick={handleSubmit}>
          Start Game
        </button>
        {onHowToPlay && (
          <button type="button" className="menu-btn secondary" onClick={onHowToPlay}>
            How to Play
          </button>
        )}
        {onBack && (
          <button type="button" className="menu-btn secondary" onClick={onBack}>
            Back
          </button>
        )}
      </div>
    </div>
  );
}
