import { useState, useEffect, useRef, useCallback } from 'react'

interface PlayerWordsProps {
  words: {
    four: string
    five: string
  }
  fadingOut?: boolean
  isMultiplayer?: boolean
  playerColor?: 'player' | 'computer'
}

const LONG_PRESS_DURATION = 500 // ms

export function PlayerWords({ words, fadingOut, isMultiplayer, playerColor }: PlayerWordsProps) {
  const [animatedIn, setAnimatedIn] = useState(false)
  const [isRevealed, setIsRevealed] = useState(!isMultiplayer)
  const longPressTimer = useRef<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedIn(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Reset revealed state when turn changes (new words to show)
  useEffect(() => {
    if (isMultiplayer) {
      setIsRevealed(false)
    }
  }, [words.four, words.five, isMultiplayer])

  const handlePressStart = useCallback(() => {
    if (!isMultiplayer) return
    
    longPressTimer.current = window.setTimeout(() => {
      setIsRevealed(true)
    }, LONG_PRESS_DURATION)
  }, [isMultiplayer])

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (isMultiplayer) {
      setIsRevealed(false)
    }
  }, [isMultiplayer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  const colorClass = playerColor === 'computer' ? 'red-team' : 'blue-team'

  return (
    <div 
      className={`player-words ${animatedIn ? 'animated-in' : ''} ${fadingOut ? 'fading-out' : ''} ${isMultiplayer ? 'multiplayer' : ''} ${colorClass}`}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
    >
      <span className="player-words-label">Your words:</span>
      <div className="word-badges-row">
        {isMultiplayer && !isRevealed ? (
          <>
            <span className="word-badge hidden">••••</span>
            <span className="word-badge hidden">•••••</span>
            <span className="reveal-hint">Hold to reveal</span>
          </>
        ) : (
          <>
            <span className="word-badge">{words.four}</span>
            <span className="word-badge">{words.five}</span>
          </>
        )}
      </div>
    </div>
  )
}
