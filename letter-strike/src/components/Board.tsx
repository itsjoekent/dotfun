import { useState, useEffect, useRef } from 'react'
import { BOARD_SIZE, type PlacedWord, getCellToWordsMap, getRevealedWords } from '../game'

interface BoardProps {
  board: (string | null)[][]
  guessedLetters: Set<string>
  playerCells: Set<string>
  computerCells: Set<string>
  allPlacedWords: PlacedWord[]
  gameOver: boolean
}

export function Board({ 
  board, 
  guessedLetters, 
  playerCells, 
  computerCells, 
  allPlacedWords,
  gameOver
}: BoardProps) {
  const [animatedIn, setAnimatedIn] = useState(false)
  const [flippingCells, setFlippingCells] = useState<Set<string>>(new Set())
  const [shaking, setShaking] = useState(false)
  const [missMessage, setMissMessage] = useState<string | null>(null)
  const prevGuessedRef = useRef<Set<string>>(new Set())

  // Get map of cells to their owning words
  const cellToWords = getCellToWordsMap(allPlacedWords)
  
  // Get set of revealed words (all letters guessed)
  const revealedWords = getRevealedWords(allPlacedWords, board, guessedLetters)

  // Trigger entrance animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedIn(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Detect newly guessed letters and trigger flip animation for matching tiles
  useEffect(() => {
    const newlyGuessed = [...guessedLetters].filter(l => !prevGuessedRef.current.has(l))
    if (newlyGuessed.length === 0) {
      prevGuessedRef.current = new Set(guessedLetters)
      return
    }
    
    // Find all cells that contain the newly guessed letters
    const cellsToFlip: string[] = []
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const letter = board[row][col]
        if (letter && newlyGuessed.includes(letter)) {
          cellsToFlip.push(`${row},${col}`)
        }
      }
    }
    
    prevGuessedRef.current = new Set(guessedLetters)
    
    if (cellsToFlip.length === 0) {
      // Letter was guessed but not on the board - shake and show message!
      const missedLetter = newlyGuessed[0].toUpperCase()
      const raf = requestAnimationFrame(() => {
        setShaking(true)
        setMissMessage(`No "${missedLetter}" on the board`)
      })
      const shakeTimer = setTimeout(() => setShaking(false), 500)
      const messageTimer = setTimeout(() => setMissMessage(null), 1500)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(shakeTimer)
        clearTimeout(messageTimer)
      }
    }
    
    // Use requestAnimationFrame to defer state update
    const raf = requestAnimationFrame(() => {
      setFlippingCells(new Set(cellsToFlip))
    })
    
    // Remove flip class after animation completes
    const timer = setTimeout(() => {
      setFlippingCells(new Set())
    }, 500)
    
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [guessedLetters, board])

  // Calculate distance from center for staggered animation
  const center = (BOARD_SIZE - 1) / 2
  const getDistanceFromCenter = (row: number, col: number) => {
    return Math.sqrt(Math.pow(row - center, 2) + Math.pow(col - center, 2))
  }
  const maxDistance = getDistanceFromCenter(0, 0)
  
  return (
    <div className={`board ${animatedIn ? 'animated-in' : ''} ${shaking ? 'shaking' : ''}`}>
      {missMessage && (
        <div className="miss-message">
          {missMessage}
        </div>
      )}
      {Array.from({ length: BOARD_SIZE }).map((_, row) => (
        <div key={row} className="row">
          {Array.from({ length: BOARD_SIZE }).map((_, col) => {
            const letter = board[row][col]
            const cellKey = `${row},${col}`
            const distance = getDistanceFromCenter(row, col)
            const delay = (distance / maxDistance) * 300 // 0-300ms based on distance
            const isFlipping = flippingCells.has(cellKey)
            
            // Empty cell - render as black square
            if (letter === null) {
              return (
                <div 
                  key={col} 
                  className={`tile empty ${animatedIn ? 'tile-enter' : ''}`}
                  style={{ animationDelay: `${delay}ms` }}
                >
                  <p></p>
                </div>
              )
            }
            
            const isPlayerCell = playerCells.has(cellKey)
            const isComputerCell = computerCells.has(cellKey)
            
            // Get words that contain this cell
            const wordsAtCell = cellToWords.get(cellKey) || []
            
            // Check which words at this cell are revealed
            const revealedWordsAtCell = wordsAtCell.filter(w => revealedWords.has(w))
            const playerWordRevealed = revealedWordsAtCell.some(w => w.owner === 'player')
            const computerWordRevealed = revealedWordsAtCell.some(w => w.owner === 'computer')
            const fillerWordRevealed = revealedWordsAtCell.some(w => w.owner === 'filler')
            
            // Show letter if:
            // - The letter has been guessed
            // - The game is over
            const isLetterGuessed = guessedLetters.has(letter)
            const showLetter = isLetterGuessed || gameOver
            
            // Check if any word at this cell is revealed (for coloring)
            const anyWordRevealed = revealedWordsAtCell.length > 0
            
            // Determine color class based on revealed words
            let colorClass = ''
            
            if (gameOver) {
              // Game over: show all colors
              // Add 'unguessed' class for letters that weren't discovered during play
              const unguessedClass = !isLetterGuessed ? ' unguessed' : ''
              if (isPlayerCell && isComputerCell) {
                colorClass = 'player-word computer-word' + unguessedClass
              } else if (isPlayerCell) {
                colorClass = 'player-word' + unguessedClass
              } else if (isComputerCell) {
                colorClass = 'computer-word' + unguessedClass
              } else if (wordsAtCell.length > 0) {
                colorClass = 'filler' + unguessedClass
              }
            } else if (anyWordRevealed) {
              // Only show colors for revealed words
              if (playerWordRevealed && computerWordRevealed) {
                colorClass = 'player-word computer-word'
              } else if (playerWordRevealed) {
                colorClass = 'player-word'
              } else if (computerWordRevealed) {
                colorClass = 'computer-word'
              } else if (fillerWordRevealed) {
                colorClass = 'neutral'
              }
            } else if (isLetterGuessed) {
              colorClass = 'guessed'
            }

            // Build tile wrapper class
            let tileClass = 'tile'
            if (animatedIn) tileClass += ' tile-enter'
            // When actively flipping, let the animation handle it; otherwise use flipped class
            if (isFlipping) {
              tileClass += ' flipping'
            } else if (showLetter) {
              tileClass += ' flipped'
            }

            return (
              <div 
                key={col} 
                className={tileClass}
                style={{ animationDelay: `${delay}ms` }}
              >
                <div className="tile-inner">
                  <div className="tile-front">
                    <p>?</p>
                  </div>
                  <div className={`tile-back ${colorClass}`}>
                    <p>{letter.toUpperCase()}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
