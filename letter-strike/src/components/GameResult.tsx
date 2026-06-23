import { useState, useEffect, useMemo } from 'react';
import { type GameResult as GameResultType } from '../game';
import { type GameMode } from './Game';
import { SupportLink } from './SupportLink';
import { ShareButton } from './ShareButton';
import type { CompactReplayLayout } from '../game';
import {
  encodePlayPayload,
  buildLetterStrikePlayUrl,
  PLAY_PAYLOAD_VERSION,
  type PlayPayloadDifficulty,
} from '../playPayload';

export type CellType = 'player' | 'computer' | 'neutral';

export interface GuessHistoryEntry {
  letter: string;
  cells: CellType[];
  isComputerGuess: boolean;
}

interface MultiplayerCurrentPlayer {
  name: string;
  color: 'player' | 'computer';
}

interface MultiplayerWinner {
  name: string;
  playerNum: number;
}

export interface ShareSummaryData {
  myFour: string;
  myFive: string;
  oppFour: string;
  oppFive: string;
  /** Distinct letters in the opponent's words that have been guessed (any player). */
  enemyLettersFoundCount: number;
  /** Distinct letters in the opponent's words (alphabet size of their answer). */
  possibleEnemyLetterCount: number;
  difficultyLabel: string;
  timerEnabled: boolean;
  timerDuration: number;
  aiDifficulty: PlayPayloadDifficulty;
  replaySnapshot: CompactReplayLayout;
}

interface GameResultProps {
  result: GameResultType;
  gameMode: GameMode;
  showHint?: boolean;
  hintFadingOut?: boolean;
  aiThinking?: boolean;
  onPlayAgain?: () => void;
  onMainMenu?: () => void;
  lostByTimeout?: boolean;
  guessHistory?: GuessHistoryEntry[];
  multiplayerCurrentPlayer?: MultiplayerCurrentPlayer | null;
  multiplayerWinner?: MultiplayerWinner | null;
  shareSummary?: ShareSummaryData | null;
}

function buildShareSummaryBody(share: ShareSummaryData, playUrl: string): string {
  const lines = [
    `🔤: ${share.myFour}, ${share.myFive}`,
    `🎯: ${share.enemyLettersFoundCount}/${share.possibleEnemyLetterCount} hits`,
    `💪: ${share.difficultyLabel} difficulty`,
  ];
  if (share.timerEnabled) {
    lines.push(`⏱️: ${share.timerDuration}s per turn`);
  }
  lines.push('');
  lines.push('Can you beat me?');
  lines.push(playUrl);
  return lines.join('\n');
}

function truncateSharePreview(full: string): string {
  const lines = full.split('\n');
  if (lines.length === 0) return full;
  const lastIdx = lines.length - 1;
  const lastLine = lines[lastIdx]!;
  if (/^https?:\/\//.test(lastLine.trim())) {
    const maxLen = 48;
    lines[lastIdx] = lastLine.length > maxLen ? `${lastLine.slice(0, maxLen)}…` : lastLine;
  }
  return lines.join('\n');
}

const THINKING_MESSAGES = [
  'Locking onto a target...',
  'Taking aim...',
  'Zeroing in on a letter...',
  'Choosing where to strike...',
  'Narrowing the target area...',
  'Evaluating strike options...',
  'Tracing likely word paths...',
  'Weighing possible hits...',
  'Scanning for weak points...',
  'Aligning a strike path...',
  'Calculating strike angles...',
  'Running probability estimates...',
  'Refining the target zone...',
  'Testing strike scenarios...',
  'Weighing potential outcomes...',
  'Focusing the targeting system...',
  'Adjusting aim...',
  'Surveying the grid...',
  'Formulating a strike plan...',
  'Analyzing letter patterns...',
];

function getRandomThinkingMessage() {
  const randomIndex = Math.floor(Math.random() * THINKING_MESSAGES.length);
  return THINKING_MESSAGES[randomIndex];
}

export function GameResult({
  result,
  gameMode,
  showHint,
  hintFadingOut,
  aiThinking,
  onPlayAgain,
  onMainMenu,
  lostByTimeout,
  multiplayerCurrentPlayer,
  multiplayerWinner,
  shareSummary = null,
}: GameResultProps) {
  const [animatedIn, setAnimatedIn] = useState(false);
  const [hintAnimatedIn, setHintAnimatedIn] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState(THINKING_MESSAGES[0]);

  const isMultiplayer = gameMode === 'multiplayer';

  useEffect(() => {
    if (result !== 'playing') {
      const timer = setTimeout(() => setAnimatedIn(true), 50);
      return () => clearTimeout(timer);
    }
    return () => setAnimatedIn(false);
  }, [result]);

  useEffect(() => {
    if (showHint) {
      const timer = setTimeout(() => setHintAnimatedIn(true), 50);
      return () => clearTimeout(timer);
    }
    return () => setHintAnimatedIn(false);
  }, [showHint]);

  useEffect(() => {
    if (aiThinking) {
      const timer = setTimeout(() => setThinkingMessage(getRandomThinkingMessage()), 0);
      return () => clearTimeout(timer);
    }
  }, [aiThinking]);

  const shareText = useMemo(() => {
    if (!shareSummary) return '';
    const encoded = encodePlayPayload({
      v: PLAY_PAYLOAD_VERSION,
      m: { f: shareSummary.myFour, v: shareSummary.myFive },
      o: { f: shareSummary.oppFour, v: shareSummary.oppFive },
      a: shareSummary.aiDifficulty,
      t: shareSummary.timerEnabled,
      d: shareSummary.timerDuration,
      g: shareSummary.replaySnapshot,
    });
    const playUrl = buildLetterStrikePlayUrl(encoded);
    return buildShareSummaryBody(shareSummary, playUrl);
  }, [shareSummary]);

  const sharePreviewText = useMemo(
    () => (shareText ? truncateSharePreview(shareText) : ''),
    [shareText]
  );

  const [shareCopied, setShareCopied] = useState(false);
  const handleCopyShare = async () => {
    if (!shareText) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  if (showHint) {
    const turnClass = isMultiplayer
      ? multiplayerCurrentPlayer?.color === 'player'
        ? 'player-turn'
        : 'computer-turn'
      : aiThinking
        ? 'computer-turn'
        : 'player-turn';

    const hintText = isMultiplayer
      ? `${multiplayerCurrentPlayer?.name}'s turn`
      : aiThinking
        ? thinkingMessage
        : 'Pick a tile';

    return (
      <div
        className={`turn-indicator ${hintAnimatedIn ? 'animated-in' : ''} ${hintFadingOut ? 'fading-out' : ''} ${turnClass}`}
      >
        <span className="turn-dot" />
        <span className="turn-text">{hintText}</span>
      </div>
    );
  }

  if (result === 'playing') {
    return null;
  }

  const renderResult = () => {
    if (isMultiplayer && multiplayerWinner) {
      return (
        <>
          <h2>🎉 {multiplayerWinner.name} Wins!</h2>
        </>
      );
    }

    if (result === 'tie') {
      return (
        <>
          <h2>🤝 It's a Tie!</h2>
          <p>All words were revealed at the same time</p>
        </>
      );
    }

    if (result === 'player_wins') {
      return (
        <>
          <h2>🎉 You Win!</h2>
          <p>You found all the computer's words</p>
        </>
      );
    }

    return (
      <>
        <h2>💀 You Lose!</h2>
        <p>{lostByTimeout ? 'You ran out of time' : 'All your words were revealed'}</p>
      </>
    );
  };

  return (
    <div className="game-end-container">
      <div className={`game-result ${result} ${animatedIn ? 'animated-in' : ''}`}>
        {renderResult()}

        {shareSummary && shareText ? (
          <div className="share-summary-card">
            <label className="share-summary-label" htmlFor="share-summary-text">
              Share result
            </label>
            <p id="share-summary-copy-hint" className="share-summary-copy-hint">
              Preview is shortened. Copy includes the full link.
            </p>
            <div className="share-summary-preview-wrap">
              <pre
                id="share-summary-text"
                className="share-summary-textarea"
                role="textbox"
                aria-readonly
                aria-multiline
                aria-describedby="share-summary-copy-hint"
                title="Copy includes the full message and link."
              >
                {sharePreviewText}
              </pre>
            </div>
            <button
              type="button"
              className="end-btn primary share-summary-copy-btn"
              onClick={handleCopyShare}
            >
              {shareCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ) : null}

        <div className="game-end-actions">
          <div className="button-row">
            {onPlayAgain && (
              <button type="button" className="end-btn primary" onClick={onPlayAgain}>
                Play Again
              </button>
            )}
            {onMainMenu && (
              <button type="button" className="end-btn secondary" onClick={onMainMenu}>
                Menu
              </button>
            )}
            <ShareButton className="end-btn secondary" />
          </div>
        </div>
      </div>

      <SupportLink className="game-end-support" />
    </div>
  );
}
