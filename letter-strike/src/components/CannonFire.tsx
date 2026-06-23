import { useEffect, useRef } from 'react'

interface LetterTrail {
  letter: string
  x: number
  y: number
  opacity: number
  age: number
  maxAge: number
  fontSize: number
  side: 'left' | 'right'
}

interface CannonBall {
  x: number
  y: number
  vx: number
  vy: number
  trail: Array<{ x: number; y: number }>
  opacity: number
  side: 'left' | 'right'
  lastLetterTime: number
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function CannonFire() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const ballsRef = useRef<CannonBall[]>([])
  const letterTrailsRef = useRef<LetterTrail[]>([])
  const lastFireTimeRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const gravity = 0.25
    const trailLength = 8

    const createCannonBall = (): CannonBall => {
      const side = Math.random() < 0.5 ? 'left' : 'right'

      const startX =
        side === 'left' ? -20 + Math.random() * 40 : canvas.width - 20 + Math.random() * 40
      const startY = canvas.height - 10 + Math.random() * 20

      const endX =
        side === 'left' ? canvas.width - 50 - Math.random() * 100 : 50 + Math.random() * 100
      const endY = canvas.height * (0.05 + Math.random() * 0.15)

      const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2)
      const angle = Math.atan2(endY - startY, endX - startX)
      const speed = distance / (100 + Math.random() * 40)
      const upwardVelocity = -10 - Math.random() * 6

      return {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + upwardVelocity,
        trail: [],
        opacity: 1,
        side,
        lastLetterTime: Date.now(),
      }
    }

    const updateBall = (ball: CannonBall) => {
      ball.trail.push({ x: ball.x, y: ball.y })
      if (ball.trail.length > trailLength) {
        ball.trail.shift()
      }

      const now = Date.now()
      if (now - ball.lastLetterTime > 35 + Math.random() * 40) {
        const randomLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)]
        letterTrailsRef.current.push({
          letter: randomLetter,
          x: ball.x,
          y: ball.y,
          opacity: 0.8,
          age: 0,
          maxAge: 2000 + Math.random() * 1000,
          fontSize: 12 + Math.random() * 4,
          side: ball.side,
        })
        ball.lastLetterTime = now
      }

      ball.x += ball.vx
      ball.y += ball.vy
      ball.vy += gravity

      const progress = Math.abs(ball.x) / (canvas.width + 100)
      ball.opacity = Math.max(0, 1 - progress * 0.5)
    }

    const updateLetterTrails = () => {
      letterTrailsRef.current = letterTrailsRef.current
        .map((letter) => {
          letter.age += 16
          letter.opacity = Math.max(0, 0.8 * (1 - letter.age / letter.maxAge))
          return letter
        })
        .filter((letter) => letter.opacity > 0)
    }

    const drawLetterTrails = () => {
      letterTrailsRef.current.forEach((letterTrail) => {
        const isBlue = letterTrail.side === 'left'
        ctx.save()
        ctx.globalAlpha = letterTrail.opacity
        ctx.fillStyle = isBlue ? 'rgba(59, 130, 246, 0.7)' : 'rgba(220, 38, 38, 0.7)'
        ctx.font = `${letterTrail.fontSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(letterTrail.letter, letterTrail.x, letterTrail.y)
        ctx.restore()
      })
    }

    const drawBall = (ball: CannonBall) => {
      if (ball.opacity <= 0) return

      const isBlue = ball.side === 'left'
      const ballColor = isBlue ? 'rgba(59, 130, 246, 0.9)' : 'rgba(220, 38, 38, 0.9)'
      const trailColor = isBlue ? 'rgba(59, 130, 246, 0.8)' : 'rgba(220, 38, 38, 0.8)'

      ctx.save()
      ctx.globalAlpha = ball.opacity

      ball.trail.forEach((point, i) => {
        const trailOpacity = (i / ball.trail.length) * ball.opacity * 0.4
        ctx.globalAlpha = trailOpacity
        ctx.fillStyle = trailColor
        ctx.beginPath()
        ctx.arc(point.x, point.y, 2, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.globalAlpha = ball.opacity
      ctx.fillStyle = ballColor
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, 3, 0, Math.PI * 2)
      ctx.fill()

      const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 15)
      if (isBlue) {
        gradient.addColorStop(0, `rgba(59, 130, 246, ${ball.opacity * 0.5})`)
        gradient.addColorStop(0.5, `rgba(37, 99, 235, ${ball.opacity * 0.3})`)
        gradient.addColorStop(1, `rgba(59, 130, 246, 0)`)
      } else {
        gradient.addColorStop(0, `rgba(220, 38, 38, ${ball.opacity * 0.5})`)
        gradient.addColorStop(0.5, `rgba(185, 28, 28, ${ball.opacity * 0.3})`)
        gradient.addColorStop(1, `rgba(220, 38, 38, 0)`)
      }
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, 15, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }

    const animate = () => {
      const now = Date.now()

      if (now - lastFireTimeRef.current > 500 + Math.random() * 2200) {
        ballsRef.current.push(createCannonBall())
        lastFireTimeRef.current = now
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      updateLetterTrails()
      drawLetterTrails()

      ballsRef.current = ballsRef.current.filter((ball) => {
        updateBall(ball)
        drawBall(ball)

        return (
          ball.x > -100 &&
          ball.x < canvas.width + 100 &&
          ball.y > -100 &&
          ball.opacity > 0
        )
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="cannon-fire-canvas"
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  )
}
