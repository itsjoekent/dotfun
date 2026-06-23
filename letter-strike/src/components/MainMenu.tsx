import { useState, useCallback } from 'react';
import logo from '../assets/logo.png';
import { Bookmark } from './Bookmark';
import { ShareButton } from './ShareButton';
import { CustomGameSettings, type CustomGameConfig } from './CustomGameSettings';
import { CannonFire } from './CannonFire';

export type MainMenuView = 'main' | 'howToPlay' | 'bookmark' | 'playSetup';

interface MainMenuProps {
  onStartVsComputer: (config: CustomGameConfig) => void;
  onMultiplayer: () => void;
  /** When returning from a finished vs-computer game, open Quick Play setup. */
  initialView?: MainMenuView;
}

export function MainMenu({
  onStartVsComputer,
  onMultiplayer,
  initialView = 'main',
}: MainMenuProps) {
  const [view, setView] = useState<MainMenuView>(initialView);

  const handleStartGame = useCallback(
    (config: CustomGameConfig) => {
      onStartVsComputer(config);
    },
    [onStartVsComputer]
  );

  return (
    <div className="main-menu">
      <CannonFire />
      <img src={logo} alt="Letter Strike" className="menu-logo" />

      {view === 'howToPlay' ? (
        <div className="how-to-play">
          <h2>How to Play</h2>
          <div className="how-to-play-content">
            <p>
              You and the computer each have <strong>two secret words</strong> hidden on the grid — one
              4-letter and one 5-letter word.
            </p>
            <p>
              Take turns guessing letters. When a letter is guessed, all matching tiles on the board are
              revealed.
            </p>
            <p>
              <span className="color-dot player"></span> <strong>Blue tiles</strong> are your words
            </p>
            <p>
              <span className="color-dot computer"></span> <strong>Red tiles</strong> are the computer's
              words
            </p>
            <p>Win by revealing all the computer's letters before yours are exposed!</p>
          </div>
          <div className="menu-section credits-section">
            <p className="credits">
              Word lists:{' '}
              <a href="https://github.com/BartMassey/wordlists" target="_blank" rel="noopener noreferrer">
                enable2k
              </a>{' '}
              &{' '}
              <a
                href="https://github.com/first20hours/google-10000-english"
                target="_blank"
                rel="noopener noreferrer"
              >
                google-10000-english
              </a>
            </p>
          </div>
          <button type="button" className="menu-btn secondary" onClick={() => setView('main')}>
            Back
          </button>
        </div>
      ) : view === 'bookmark' ? (
        <Bookmark onBack={() => setView('main')} />
      ) : view === 'playSetup' ? (
        <CustomGameSettings onStartGame={handleStartGame} onBack={() => setView('main')} />
      ) : (
        <>
          <div className="menu-section play-section">
            <button type="button" className="menu-btn primary" onClick={() => setView('playSetup')}>
              Quick Play
            </button>
            <button type="button" className="menu-btn primary multiplayer" onClick={onMultiplayer}>
              Play a Friend
            </button>
            <button type="button" className="menu-btn secondary" onClick={() => setView('howToPlay')}>
              How to Play
            </button>
            <div className="menu-btn-row">
              <button type="button" className="menu-btn secondary small" onClick={() => setView('bookmark')}>
                Bookmark
              </button>
              <ShareButton className="small" />
            </div>
          </div>

          <div className="menu-section credits-section">
            <p className="made-by">
              Made by <a href="https://joekent.com">Joe Kent</a>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
