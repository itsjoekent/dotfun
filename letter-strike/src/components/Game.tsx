import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  type GameState,
  type GameResult as GameResultType,
  getWordCells,
  checkGameResult,
  compactReplayFromGameState,
} from '../game';
import { getAIGuess } from '../ai';
import { Board } from './Board';
import { Keyboard } from './Keyboard';
import { GameResult, type ShareSummaryData } from './GameResult';
import { PlayerWords } from './PlayerWords';
import { OpponentWords } from './OpponentWords';
import { type AIDifficulty, type GuessHistoryEntry, type CellType } from './index';
import type { PlayPayloadDifficulty } from '../playPayload';
import logo from '../assets/logo.png';

export type GameMode = 'custom' | 'multiplayer';

export interface MultiplayerPlayerInfo {
  name: string;
  color: 'player' | 'computer';
}

export interface MultiplayerPlayers {
  player1: MultiplayerPlayerInfo;
  player2: MultiplayerPlayerInfo;
  startingPlayer: 1 | 2;
}

export interface GameProps {
  initialGameState: GameState;
  gameMode: GameMode;
  difficulty: AIDifficulty;
  timerEnabled: boolean;
  timerDuration: number;
  multiplayerPlayers?: MultiplayerPlayers;
  initialResult?: GameResultType;
  initialComputerGuessedLetters?: Set<string>;
  initialGuessHistory?: GuessHistoryEntry[];
  isRestoredGame?: boolean;
  onMainMenu: () => void;
  onPlayAgain: () => void;
}

export function Game({
  initialGameState,
  gameMode,
  difficulty,
  timerEnabled,
  timerDuration,
  multiplayerPlayers,
  initialResult = 'playing',
  initialComputerGuessedLetters,
  initialGuessHistory = [],
  isRestoredGame = false,
  onMainMenu,
  onPlayAgain,
}: GameProps) {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [gameResult, setGameResult] = useState<GameResultType>(initialResult);
  const [aiThinking, setAiThinking] = useState(false);
  const [showPlayingUI, setShowPlayingUI] = useState(!isRestoredGame);
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [lostByTimeout, setLostByTimeout] = useState(false);
  const [computerGuessedLetters, setComputerGuessedLetters] = useState<Set<string>>(
    initialComputerGuessedLetters || new Set()
  );
  const [guessHistory, setGuessHistory] = useState<GuessHistoryEntry[]>(initialGuessHistory);
  const [timerResetting, setTimerResetting] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [thinkingMessage, setThinkingMessage] = useState('Thinking...');

  const [currentMultiplayerTurn, setCurrentMultiplayerTurn] = useState<1 | 2>(
    multiplayerPlayers?.startingPlayer || 1
  );

  const isMultiplayer = gameMode === 'multiplayer';

  useEffect(() => {
    if (aiThinking) {
      const messages = [
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
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setTimeout(() => {
        setThinkingMessage(randomMessage);
      }, 0);
    }
  }, [aiThinking]);

  const playingUIFading = gameResult !== 'playing' && showPlayingUI;

  const playerCells = useMemo(() => getWordCells(gameState.player.placed), [gameState.player.placed]);
  const computerCells = useMemo(() => getWordCells(gameState.computer.placed), [gameState.computer.placed]);

  useEffect(() => {
    if (gameResult !== 'playing' && showPlayingUI) {
      const timer = setTimeout(() => {
        setShowPlayingUI(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [gameResult, showPlayingUI]);

  useEffect(() => {
    if (!timerEnabled || gameResult !== 'playing') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setLostByTimeout(true);
          setGameResult('computer_wins');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerEnabled, gameResult]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const resetTimer = useCallback(() => {
    setTimeLeft(timerDuration);
    setTimerResetting(true);
    setTimeout(() => setTimerResetting(false), 400);
  }, [timerDuration]);

  const getRevealedCells = useCallback(
    (letter: string, state: GameState): CellType[] => {
      const { board } = state;
      const cells: CellType[] = [];

      for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row]!.length; col++) {
          if (board[row]![col] === letter) {
            const cellKey = `${row},${col}`;
            const isPlayer = playerCells.has(cellKey);
            const isComputer = computerCells.has(cellKey);

            if (isPlayer && isComputer) {
              cells.push('player');
              cells.push('computer');
            } else if (isPlayer) {
              cells.push('player');
            } else if (isComputer) {
              cells.push('computer');
            } else {
              cells.push('neutral');
            }
          }
        }
      }

      return cells;
    },
    [playerCells, computerCells]
  );

  const handleGuess = useCallback(
    (letter: string) => {
      if (gameState.guessedLetters.has(letter)) return;
      if (gameResult !== 'playing') return;
      if (aiThinking) return;

      const revealedCells = getRevealedCells(letter, gameState);

      const isPlayer2Turn = isMultiplayer && currentMultiplayerTurn === 2;

      setGuessHistory((prev) => [...prev, { letter, cells: revealedCells, isComputerGuess: isPlayer2Turn }]);

      const newGuessed = new Set(gameState.guessedLetters);
      newGuessed.add(letter);

      const tempState = { ...gameState, guessedLetters: newGuessed };

      const guesserRole = isPlayer2Turn ? 'computer' : 'player';
      const result = checkGameResult(tempState, guesserRole);

      setGameState((prev) => ({ ...prev, guessedLetters: newGuessed }));

      if (isPlayer2Turn) {
        setComputerGuessedLetters((prev) => new Set([...prev, letter]));
      }

      if (result !== 'playing') {
        setGameResult(result);
        return;
      }

      if (isMultiplayer) {
        setCurrentMultiplayerTurn((prev) => (prev === 1 ? 2 : 1));
        if (timerEnabled) {
          resetTimer();
        }
      } else {
        const flipAnimationDelay = 600;
        const aiThinkingDuration = 2000 + Math.random() * 1000;

        setTimeout(() => {
          setAiThinking(true);
          if (timerEnabled) {
            resetTimer();
          }

          setTimeout(() => {
            const aiLetter = getAIGuess(tempState, difficulty);
            if (aiLetter) {
              const aiRevealedCells = getRevealedCells(aiLetter, tempState);
              setGuessHistory((prev) => [
                ...prev,
                { letter: aiLetter, cells: aiRevealedCells, isComputerGuess: true },
              ]);

              const aiGuessed = new Set(newGuessed);
              aiGuessed.add(aiLetter);
              const aiState = { ...tempState, guessedLetters: aiGuessed };
              const aiResult = checkGameResult(aiState, 'computer');

              setComputerGuessedLetters((prev) => new Set([...prev, aiLetter]));
              setGameState((prev) => ({ ...prev, guessedLetters: aiGuessed }));
              setGameResult(aiResult);
            }
            setAiThinking(false);
            if (timerEnabled) {
              resetTimer();
            }
          }, aiThinkingDuration);
        }, flipAnimationDelay);
      }
    },
    [
      gameState,
      gameResult,
      aiThinking,
      isMultiplayer,
      currentMultiplayerTurn,
      difficulty,
      timerEnabled,
      resetTimer,
      getRevealedCells,
    ]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) {
        handleGuess(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGuess]);

  const timerClass = `${timeLeft <= 3 ? 'critical' : timeLeft <= 5 ? 'warning' : ''} ${timerResetting ? 'resetting' : ''}`;

  const getCurrentPlayerInfo = () => {
    if (!isMultiplayer || !multiplayerPlayers) return null;
    return currentMultiplayerTurn === 1 ? multiplayerPlayers.player1 : multiplayerPlayers.player2;
  };

  const currentPlayerInfo = getCurrentPlayerInfo();

  const shareSummary = useMemo((): ShareSummaryData | null => {
    if (gameResult === 'playing') return null;
    if (isMultiplayer) return null;

    const myWords = gameState.player;
    const oppWords = gameState.computer;

    const oppStr = `${oppWords.four}${oppWords.five}`.toLowerCase();
    const oppLetterSet = new Set(oppStr.match(/[a-z]/g) ?? []);
    const possibleEnemyLetterCount = oppLetterSet.size;
    const enemyLettersFoundCount = [...oppLetterSet].filter((c) => gameState.guessedLetters.has(c)).length;

    const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    return {
      myFour: myWords.four,
      myFive: myWords.five,
      oppFour: oppWords.four,
      oppFive: oppWords.five,
      enemyLettersFoundCount,
      possibleEnemyLetterCount,
      difficultyLabel,
      timerEnabled,
      timerDuration,
      aiDifficulty: difficulty as PlayPayloadDifficulty,
      replaySnapshot: compactReplayFromGameState(gameState),
    };
  }, [gameResult, isMultiplayer, gameState, difficulty, timerEnabled, timerDuration]);

  const getDisplayWords = () => {
    if (!isMultiplayer || !multiplayerPlayers) {
      return gameState.player;
    }
    if (currentMultiplayerTurn === 1) {
      return multiplayerPlayers.player1.color === 'player' ? gameState.player : gameState.computer;
    }
    return multiplayerPlayers.player2.color === 'player' ? gameState.player : gameState.computer;
  };

  const getOpponentWords = () => {
    if (!isMultiplayer || !multiplayerPlayers) {
      return gameState.computer;
    }
    if (currentMultiplayerTurn === 1) {
      return multiplayerPlayers.player2.color === 'player' ? gameState.player : gameState.computer;
    }
    return multiplayerPlayers.player1.color === 'player' ? gameState.player : gameState.computer;
  };

  const getWinnerInfo = () => {
    if (!isMultiplayer || !multiplayerPlayers || gameResult === 'playing') return null;

    if (gameResult === 'player_wins') {
      return multiplayerPlayers.player1.color === 'player'
        ? { name: multiplayerPlayers.player1.name, playerNum: 1 }
        : { name: multiplayerPlayers.player2.name, playerNum: 2 };
    }
    if (gameResult === 'computer_wins') {
      return multiplayerPlayers.player1.color === 'computer'
        ? { name: multiplayerPlayers.player1.name, playerNum: 1 }
        : { name: multiplayerPlayers.player2.name, playerNum: 2 };
    }
    return null;
  };

  const getTurnIndicator = () => {
    if (!showPlayingUI || gameResult !== 'playing') return null;

    const turnClass = isMultiplayer
      ? currentPlayerInfo?.color === 'player'
        ? 'player-turn'
        : 'computer-turn'
      : aiThinking
        ? 'computer-turn'
        : 'player-turn';

    const hintText = isMultiplayer
      ? `${currentPlayerInfo?.name}'s turn`
      : aiThinking
        ? thinkingMessage
        : 'Pick a tile';

    return (
      <div
        className={`turn-indicator ${playingUIFading ? 'fading-out' : 'animated-in'} ${turnClass}`}
      >
        <span className="turn-dot" />
        <span className="turn-text">{hintText}</span>
      </div>
    );
  };

  return (
    <>
      <button type="button" className="logo-btn" onClick={onMainMenu} aria-label="Back to main menu">
        <img src={logo} alt="Letter Strike" className="game-logo" />
      </button>

      <div className="game-board-sleeve">
        {showPlayingUI && gameResult === 'playing' ? (
          <div className="game-top-bar">
            {getTurnIndicator()}
            {timerEnabled ? (
              <div className={`timer top-bar-timer ${timerClass}`}>
                <span className="timer-icon">⏱</span>
                <span>{timeLeft}s</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <Board
          board={gameState.board}
          guessedLetters={gameState.guessedLetters}
          playerCells={playerCells}
          computerCells={computerCells}
          allPlacedWords={gameState.allPlacedWords}
          gameOver={gameResult !== 'playing'}
        />
      </div>

      <GameResult
        result={gameResult}
        gameMode={gameMode}
        showHint={false}
        hintFadingOut={playingUIFading}
        aiThinking={aiThinking}
        onPlayAgain={onPlayAgain}
        onMainMenu={onMainMenu}
        lostByTimeout={lostByTimeout}
        guessHistory={guessHistory}
        multiplayerCurrentPlayer={currentPlayerInfo}
        multiplayerWinner={getWinnerInfo()}
        shareSummary={shareSummary}
      />

      {showPlayingUI && (
        <>
          <div className={`words-container ${playingUIFading ? 'fading-out' : ''}`}>
            <div className="player-info-row">
              <PlayerWords
                words={getDisplayWords()}
                fadingOut={playingUIFading}
                isMultiplayer={isMultiplayer}
                playerColor={currentPlayerInfo?.color}
              />
            </div>
            <OpponentWords
              words={getOpponentWords()}
              board={gameState.board}
              guessedLetters={gameState.guessedLetters}
              fadingOut={playingUIFading}
              isMultiplayer={isMultiplayer}
            />
          </div>
          <Keyboard
            guessedLetters={gameState.guessedLetters}
            computerGuessedLetters={computerGuessedLetters}
            onGuess={handleGuess}
            fadingOut={playingUIFading}
          />
        </>
      )}
    </>
  );
}
