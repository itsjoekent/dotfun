interface BookmarkProps {
  onBack: () => void
}

export function Bookmark({ onBack }: BookmarkProps) {
  return (
    <div className="bookmark-page">
      <h2>Add to Home Screen</h2>
      
      <div className="bookmark-content">
        <p className="bookmark-intro">
          Play Letter Strike instantly from your home screen — no app store needed!
        </p>

        <div className="bookmark-section">
          <h3>
            <span className="platform-icon">🍎 </span>
            iPhone / iPad (Safari)
          </h3>
          <ol>
            <li>Tap the <strong>Share</strong> button <span className="icon-hint">(square with arrow)</span></li>
            <li>Tap the <strong>"More"</strong> menu <span className="icon-hint">(three dots)</span></li>
            <li>Tap <strong>"Add to Home Screen"</strong> button</li>
          </ol>
        </div>

        <div className="bookmark-section">
          <h3>
            <span className="platform-icon">🤖 </span>
            Android (Chrome)
          </h3>
          <ol>
            <li>Tap the <strong>⋮ menu</strong> <span className="icon-hint">(three dots)</span></li>
            <li>Tap <strong>"Add to Home screen"</strong> and then <strong>"Create shortcut."</strong></li>
          </ol>
        </div>

        <p>
          The game will open in full screen just like a native app!
        </p>
      </div>

      <button className="menu-btn secondary" onClick={onBack}>
        Back
      </button>
    </div>
  )
}
