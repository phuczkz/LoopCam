import { useState } from 'react'
import { getDefaultAvatar } from '../../lib/avatarUtils'

export function Avatar({ src, alt = 'User', size = 40, className = '' }) {
  const [errorSrc, setErrorSrc] = useState(null)

  const fallbackAvatar = getDefaultAvatar(alt || 'User')
  const isValidCustomSrc =
    Boolean(src) &&
    typeof src === 'string' &&
    src.trim() !== '' &&
    !src.includes('images.unsplash.com')

  const hasError = errorSrc === src
  const displaySrc = !hasError && isValidCustomSrc ? src : fallbackAvatar

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-dark-700 flex items-center justify-center flex-shrink-0 select-none ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <img
        key={displaySrc}
        src={displaySrc}
        alt={alt || 'Avatar'}
        className="w-full h-full object-cover"
        onError={() => setErrorSrc(src)}
        loading="lazy"
      />
    </div>
  )
}
