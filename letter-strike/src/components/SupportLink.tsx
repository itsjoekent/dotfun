import joePhoto from '../assets/joe-2.jpg'
import homeIcon from '../assets/home.png'
import instagramIcon from '../assets/instagram.png'
import tiktokIcon from '../assets/tiktok.png'
import linkedinIcon from '../assets/linkedin.png'

interface SupportSectionProps {
  className?: string
}

export function SupportLink({ className = '' }: SupportSectionProps) {
  return (
    <div className={`support-section ${className}`}>
      <div className="support-left">
        <div className="support-photo">
          <img src={joePhoto} alt="Joe" />
        </div>
      </div>
      <div className="support-content">
        <p className="support-message">
          created by @itsjoekent
        </p>
        <div className="support-socials">
          <a
            href="https://joekent.com"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
            aria-label="Website"
          >
            <img src={homeIcon} alt="Website" />
          </a>
          <a 
            href="https://instagram.com/itsjoekent" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link"
            aria-label="Instagram"
          >
            <img src={instagramIcon} alt="Instagram" />
          </a>
          <a 
            href="https://tiktok.com/@itsjoekent" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link"
            aria-label="TikTok"
          >
            <img src={tiktokIcon} alt="TikTok" />
          </a>
          <a 
            href="https://linkedin.com/in/itsjoekent" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link"
            aria-label="LinkedIn"
          >
            <img src={linkedinIcon} alt="LinkedIn" />
          </a>
        </div>
      </div>
    </div>
  )
}
