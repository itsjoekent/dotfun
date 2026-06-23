import { useState, useCallback } from 'react'
import { validateWords } from '../boardGenerator'

export interface PlayerConfig {
  name: string
  fourLetter: string
  fiveLetter: string
}

export interface MultiplayerConfig {
  player1: PlayerConfig
  player2: PlayerConfig
}

interface MultiplayerSetupProps {
  onStartGame: (config: MultiplayerConfig) => void
  onBack: () => void
}

type SetupStep = 'player1' | 'player2'

export function MultiplayerSetup({ onStartGame, onBack }: MultiplayerSetupProps) {
  const [step, setStep] = useState<SetupStep>('player1')
  const [player1, setPlayer1] = useState<PlayerConfig | null>(null)
  
  // Current player form state
  const [name, setName] = useState('')
  const [fourLetter, setFourLetter] = useState('')
  const [fiveLetter, setFiveLetter] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(() => {
    setError(null)
    
    const trimmedName = name.trim()
    const four = fourLetter.trim()
    const five = fiveLetter.trim()
    
    if (!trimmedName) {
      setError('Please enter your name')
      return
    }
    
    // Validate words against dictionary
    const validationError = validateWords(four, five)
    if (validationError) {
      setError(validationError)
      return
    }
    
    const playerConfig: PlayerConfig = {
      name: trimmedName,
      fourLetter: four.toLowerCase(),
      fiveLetter: five.toLowerCase(),
    }
    
    if (step === 'player1') {
      // Save player 1 and move to player 2
      setPlayer1(playerConfig)
      setStep('player2')
      // Reset form for player 2
      setName('')
      setFourLetter('')
      setFiveLetter('')
    } else {
      // Start the game with both players
      onStartGame({
        player1: player1!,
        player2: playerConfig,
      })
    }
  }, [step, name, fourLetter, fiveLetter, player1, onStartGame])

  const handleBack = useCallback(() => {
    if (step === 'player2') {
      // Go back to player 1
      setStep('player1')
      if (player1) {
        setName(player1.name)
        setFourLetter(player1.fourLetter)
        setFiveLetter(player1.fiveLetter)
      }
      setError(null)
    } else {
      onBack()
    }
  }, [step, player1, onBack])

  const playerNumber = step === 'player1' ? 1 : 2
  const isLastStep = step === 'player2'

  return (
    <div className="custom-game-settings multiplayer-setup">
      <h2>Player {playerNumber} Setup</h2>
      <p className="setup-subtitle">
        {step === 'player1' 
          ? 'Play with a friend on the same device!' 
          : 'Pass the device to your friend'}
      </p>
      <p className="setup-hint-small">
        {step === 'player1'
          ? 'Enter your name and choose your secret words'
          : "Don't peek at their words!"}
      </p>
      
      <div className="settings-section">
        <label className="settings-label">Your Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder={`Player ${playerNumber}`}
          maxLength={20}
          className="word-input name-input"
          autoComplete="off"
        />
      </div>

      <div className="settings-section">
        <label className="settings-label">Choose Your Words</label>
        <p className="settings-hint">Pick your secret words that {step === 'player1' ? 'Player 2' : 'Player 1'} will try to reveal</p>
        
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
              autoComplete="off"
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
              autoComplete="off"
            />
          </div>
        </div>
        
        {error && <p className="settings-error">{error}</p>}
      </div>

      <div className="settings-actions">
        <button
          className="menu-btn primary multiplayer"
          onClick={handleSubmit}
        >
          {isLastStep ? 'Start Game' : 'Next Player →'}
        </button>
        <button className="menu-btn secondary" onClick={handleBack}>
          Back
        </button>
      </div>
    </div>
  )
}
