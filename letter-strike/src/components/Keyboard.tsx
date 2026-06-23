import { useState, useEffect, useRef } from 'react'

const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
]

interface KeyboardProps {
  guessedLetters: Set<string>
  computerGuessedLetters: Set<string>
  onGuess: (letter: string) => void
  fadingOut?: boolean
}

export function Keyboard({ guessedLetters, computerGuessedLetters, onGuess, fadingOut }: KeyboardProps) {
  const [animatedIn, setAnimatedIn] = useState(false)
  const [poppingKeys, setPoppingKeys] = useState<Set<string>>(new Set())
  const prevGuessedRef = useRef<Set<string>>(new Set())

  // Trigger entrance animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedIn(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Detect newly guessed letters and trigger pop animation
  useEffect(() => {
    const newlyGuessed = [...guessedLetters].filter(l => !prevGuessedRef.current.has(l))
    if (newlyGuessed.length > 0) {
      // Check if this is a computer guess (needs longer animation time)
      const isComputerGuess = newlyGuessed.some(l => computerGuessedLetters.has(l))
      const animationDuration = isComputerGuess ? 550 : 200
      
      setPoppingKeys(prev => new Set([...prev, ...newlyGuessed]))
      // Remove pop class after animation completes
      const timer = setTimeout(() => {
        setPoppingKeys(prev => {
          const next = new Set(prev)
          newlyGuessed.forEach(l => next.delete(l))
          return next
        })
      }, animationDuration)
      prevGuessedRef.current = new Set(guessedLetters)
      return () => clearTimeout(timer)
    }
    prevGuessedRef.current = new Set(guessedLetters)
  }, [guessedLetters, computerGuessedLetters])

  return (
    <div className={`keyboard ${animatedIn ? 'animated-in' : ''} ${fadingOut ? 'fading-out' : ''}`}>
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div 
          key={rowIndex} 
          className="keyboard-row"
          style={{ 
            animationDelay: animatedIn ? `${rowIndex * 80}ms` : '0ms'
          }}
        >
          {row.map((letter) => {
            const isGuessed = guessedLetters.has(letter)
            const isPopping = poppingKeys.has(letter)
            const isComputerGuess = computerGuessedLetters.has(letter)
            const guessClass = isGuessed ? (isComputerGuess ? 'pressed-computer' : 'pressed-player') : ''
            return (
              <button
                key={letter}
                className={`key ${guessClass} ${isPopping ? 'popping' : ''}`}
                onClick={() => onGuess(letter)}
                disabled={isGuessed}
              >
                {letter.toUpperCase()}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

