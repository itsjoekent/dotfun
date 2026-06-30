import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { Game } from './components/Game';
import { LoadScreen } from './components/LoadScreen';
import type { Player } from './game';

const FADE_MS = 400;

function App() {
  const [gameKey, setGameKey] = useState(0);
  const [nextFirstPlayer, setNextFirstPlayer] = useState<Player>('human');
  const [loaded, setLoaded] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const readyRef = useRef({ animation: false, fonts: false });

  const tryFade = useCallback(() => {
    const { animation, fonts } = readyRef.current;
    if (!animation || !fonts) return;
    setFadeOut(true);
    setTimeout(() => setLoaded(true), FADE_MS);
  }, []);

  useEffect(() => {
    document.fonts
      .load('400 1rem "Holtwood One SC"')
      .then(() => {
        readyRef.current.fonts = true;
        tryFade();
      })
      .catch(() => {
        readyRef.current.fonts = true;
        tryFade();
      });
  }, [tryFade]);

  const handleAnimationComplete = useCallback(() => {
    readyRef.current.animation = true;
    tryFade();
  }, [tryFade]);

  const handleNewGame = useCallback((winner: Player) => {
    setNextFirstPlayer(winner);
    setGameKey((k) => k + 1);
  }, []);

  return (
    <div className="app">
      {!loaded && <LoadScreen fading={fadeOut} onAnimationComplete={handleAnimationComplete} />}
      {loaded && (
        <>
          <Game key={gameKey} firstPlayer={nextFirstPlayer} onNewGame={handleNewGame} />
        </>
      )}
    </div>
  );
}

export default App;
