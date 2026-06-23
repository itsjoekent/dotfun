import { useState, useCallback, useRef, useEffect } from 'react';
import './App.css';
import { type GameState, type GameResult, gameStateFromCompactReplay } from './game';
import {
  generateBoardWithPlayerWords,
  generateMultiplayerBoard,
  boardToGameState,
  validateWords,
} from './boardGenerator';
import { decodePlayPayload } from './playPayload';
import {
  MainMenu,
  MultiplayerSetup,
  Game,
  type CustomGameConfig,
  type GuessHistoryEntry,
  type MainMenuView,
  type MultiplayerConfig,
  type AIDifficulty,
} from './components';
import logo from './assets/logo.png';

type Screen = 'menu' | 'playing' | 'multiplayerSetup';
type GameMode = 'custom' | 'multiplayer';

const DEFAULT_TIMER_DURATION = 15;

export interface MultiplayerPlayerInfo {
  name: string;
  color: 'player' | 'computer';
}

interface GameSession {
  key: string;
  gameState: GameState;
  gameMode: GameMode;
  difficulty: AIDifficulty;
  timerEnabled: boolean;
  timerDuration: number;
  multiplayerPlayers?: {
    player1: MultiplayerPlayerInfo;
    player2: MultiplayerPlayerInfo;
    startingPlayer: 1 | 2;
  };
  initialResult?: GameResult;
  initialComputerGuessedLetters?: Set<string>;
  initialGuessHistory?: GuessHistoryEntry[];
  isRestoredGame?: boolean;
}

function playPayloadMatchesGameState(
  payload: {
    my: { four: string; five: string };
    opp: { four: string; five: string };
  },
  gs: GameState
): boolean {
  const L = (s: string) => s.toLowerCase();
  return (
    L(payload.my.four) === L(gs.player.four) &&
    L(payload.my.five) === L(gs.player.five) &&
    L(payload.opp.four) === L(gs.computer.four) &&
    L(payload.opp.five) === L(gs.computer.five)
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [mainMenuInitialView, setMainMenuInitialView] = useState<MainMenuView>('main');
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const gameKeyCounter = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playRaw = params.get('play');
    if (!playRaw) return;

    const payload = decodePlayPayload(playRaw);
    if (!payload) return;

    const my = { four: payload.m.f, five: payload.m.v };
    const opp = { four: payload.o.f, five: payload.o.v };

    const err = validateWords(my.four, my.five) || validateWords(opp.four, opp.five);
    if (err) {
      console.warn('Invalid play payload:', err);
      return;
    }

    try {
      const gameState = gameStateFromCompactReplay(payload.g, my, opp);
      if (!playPayloadMatchesGameState({ my, opp }, gameState)) {
        console.warn('Play payload words do not match encoded board');
        return;
      }

      gameKeyCounter.current += 1;
      setGameSession({
        key: `play-${gameKeyCounter.current}`,
        gameState,
        gameMode: 'custom',
        difficulty: payload.a,
        timerEnabled: payload.t,
        timerDuration: payload.d,
      });
      setScreen('playing');
    } catch (e) {
      console.warn('Failed to build board from play payload', e);
      return;
    }

    params.delete('play');
    const next = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${next ? `?${next}` : ''}`);
  }, []);

  const startCustomGame = useCallback((config: CustomGameConfig) => {
    const board = generateBoardWithPlayerWords(config.playerFourLetter, config.playerFiveLetter);
    const gameState = boardToGameState(board);

    gameKeyCounter.current += 1;
    setGameSession({
      key: `custom-${gameKeyCounter.current}`,
      gameState,
      gameMode: 'custom',
      difficulty: config.aiDifficulty,
      timerEnabled: config.timerEnabled,
      timerDuration: config.timerDuration,
    });
    setScreen('playing');
  }, []);

  const startMultiplayerGame = useCallback((config: MultiplayerConfig) => {
    const player1IsBlue = Math.random() < 0.5;
    const startingPlayer = Math.random() < 0.5 ? (1 as const) : (2 as const);

    const board = player1IsBlue
      ? generateMultiplayerBoard(
          config.player1.fourLetter,
          config.player1.fiveLetter,
          config.player2.fourLetter,
          config.player2.fiveLetter
        )
      : generateMultiplayerBoard(
          config.player2.fourLetter,
          config.player2.fiveLetter,
          config.player1.fourLetter,
          config.player1.fiveLetter
        );

    const gameState = boardToGameState(board);

    gameKeyCounter.current += 1;
    setGameSession({
      key: `multiplayer-${gameKeyCounter.current}`,
      gameState,
      gameMode: 'multiplayer',
      difficulty: 'normal',
      timerEnabled: false,
      timerDuration: DEFAULT_TIMER_DURATION,
      multiplayerPlayers: {
        player1: {
          name: config.player1.name,
          color: player1IsBlue ? 'player' : 'computer',
        },
        player2: {
          name: config.player2.name,
          color: player1IsBlue ? 'computer' : 'player',
        },
        startingPlayer,
      },
    });
    setScreen('playing');
  }, []);

  const goToMainMenu = useCallback(() => {
    setMainMenuInitialView('main');
    setScreen('menu');
    setGameSession(null);
  }, []);

  const handlePlayAgain = useCallback(() => {
    if (gameSession?.gameMode === 'multiplayer') {
      setScreen('multiplayerSetup');
    } else {
      setMainMenuInitialView('playSetup');
      setScreen('menu');
      setGameSession(null);
    }
  }, [gameSession?.gameMode]);

  const goToMultiplayerSetup = useCallback(() => {
    setScreen('multiplayerSetup');
  }, []);

  if (screen === 'menu') {
    return (
      <div className="app">
        <MainMenu
          initialView={mainMenuInitialView}
          onStartVsComputer={startCustomGame}
          onMultiplayer={goToMultiplayerSetup}
        />
      </div>
    );
  }

  if (screen === 'multiplayerSetup') {
    return (
      <div className="app">
        <div className="main-menu">
          <img src={logo} alt="Letter Strike" className="menu-logo" />
          <MultiplayerSetup onStartGame={startMultiplayerGame} onBack={goToMainMenu} />
        </div>
      </div>
    );
  }

  if (screen === 'playing' && gameSession) {
    return (
      <div className="app">
        <Game
          key={gameSession.key}
          initialGameState={gameSession.gameState}
          gameMode={gameSession.gameMode}
          difficulty={gameSession.difficulty}
          timerEnabled={gameSession.timerEnabled}
          timerDuration={gameSession.timerDuration}
          multiplayerPlayers={gameSession.multiplayerPlayers}
          initialResult={gameSession.initialResult}
          initialComputerGuessedLetters={gameSession.initialComputerGuessedLetters}
          initialGuessHistory={gameSession.initialGuessHistory}
          isRestoredGame={gameSession.isRestoredGame}
          onMainMenu={goToMainMenu}
          onPlayAgain={handlePlayAgain}
        />
      </div>
    );
  }

  return null;
}

export default App;
