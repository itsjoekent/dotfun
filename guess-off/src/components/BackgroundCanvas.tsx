import { useEffect, useRef } from 'react';
import { GuessOffBackground, type ActivePlayer } from '../GuessOffBackground';

interface BackgroundCanvasProps {
  /** A = red/orange (computer), B = blue/cyan (human) */
  activePlayer: ActivePlayer;
  intensity?: number;
}

export function BackgroundCanvas({ activePlayer, intensity = 0.75 }: BackgroundCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<GuessOffBackground | null>(null);
  const prevPlayerRef = useRef<ActivePlayer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bg = new GuessOffBackground(canvas, { intensity, initialPlayer: activePlayer });
    bgRef.current = bg;
    prevPlayerRef.current = activePlayer;
    bg.start();

    return () => {
      bg.destroy();
      bgRef.current = null;
    };
  }, []);

  useEffect(() => {
    bgRef.current?.setIntensity(intensity);
  }, [intensity]);

  useEffect(() => {
    if (prevPlayerRef.current === activePlayer) return;
    prevPlayerRef.current = activePlayer;
    bgRef.current?.setActivePlayer(activePlayer);
  }, [activePlayer]);

  return <canvas ref={canvasRef} className="background-canvas" aria-hidden="true" />;
}
