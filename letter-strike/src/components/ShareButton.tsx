import { useState } from 'react'

interface ShareButtonProps {
  className?: string
}

export function ShareButton({ className = '' }: ShareButtonProps) {
  const [showCopied, setShowCopied] = useState(false)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = window.location.href
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  // Use end-btn if className includes it, otherwise use menu-btn
  const baseClass = className.includes('end-btn') ? '' : 'menu-btn secondary'
  
  return (
    <button className={`${baseClass} ${className}`.trim()} onClick={handleShare}>
      {showCopied ? 'Copied!' : 'Share'}
    </button>
  )
}
