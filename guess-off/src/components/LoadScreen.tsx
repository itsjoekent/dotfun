import gloveBlue from '../assets/globe-blue-bottom.png';
import gloveRed from '../assets/glove-red-bottom.png';

interface LoadScreenProps {
  fading?: boolean;
  onAnimationComplete?: () => void;
}

export function LoadScreen({ fading = false, onAnimationComplete }: LoadScreenProps) {
  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.animationName === 'glove-slot-left') {
      onAnimationComplete?.();
    }
  };

  return (
    <div className={`load-screen${fading ? ' load-screen--fade-out' : ''}`} aria-busy="true" aria-label="Loading">
      <h1 className="load-screen-title">GUESS OFF</h1>
      <div className="load-screen-gloves" aria-hidden="true">
        <div
          className="load-screen-glove-slot load-screen-glove-slot--left"
          onAnimationEnd={handleAnimationEnd}
        >
          <img src={gloveBlue} alt="" className="load-screen-glove load-screen-glove--left" />
        </div>
        <div className="load-screen-glove-slot load-screen-glove-slot--right">
          <img src={gloveRed} alt="" className="load-screen-glove load-screen-glove--right" />
        </div>
      </div>
    </div>
  );
}
