import { useState } from 'react';

interface ShareButtonProps {
  className?: string;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

function getDeviceType(): DeviceType {
  const ua = navigator.userAgent;
  const isTouchDevice = window.matchMedia('(any-pointer: coarse)').matches;

  if (!isTouchDevice) {
    return 'desktop';
  }

  const isTablet = window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches;
  const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  if (isTablet) {
    return 'tablet';
  }
  if (isMobileUA || window.matchMedia('(max-width: 767px)').matches) {
    return 'mobile';
  }

  return 'desktop';
}

function shouldUseNativeShare(): boolean {
  if (getDeviceType() === 'desktop') {
    return false;
  }
  if (!('share' in navigator)) {
    return false;
  }
  const shareData = { title: 'Guess Off', url: window.location.href };
  return !('canShare' in navigator) || navigator.canShare(shareData);
}

async function copyLink(): Promise<void> {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

export function ShareButton({ className = '' }: ShareButtonProps) {
  const [showCopied, setShowCopied] = useState(false);

  const handleShare = async () => {
    if (shouldUseNativeShare()) {
      try {
        await navigator.share({ title: 'Guess Off', url: window.location.href });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        await copyLink();
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
      return;
    }

    await copyLink();
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  return (
    <button type="button" className={className} onClick={handleShare}>
      {showCopied ? 'Copied!' : 'Share'}
    </button>
  );
}
