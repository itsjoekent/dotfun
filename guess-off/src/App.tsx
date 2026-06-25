import { useState } from 'react';
import './App.css';
import { Game } from './components/Game';

function App() {
  const [gameKey, setGameKey] = useState(0);

  return (
    <div className="app">
      <Game key={gameKey} onNewGame={() => setGameKey((k) => k + 1)} />
    </div>
  );
}

export default App;
