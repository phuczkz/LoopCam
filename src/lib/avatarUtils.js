/**
 * Utility functions for generating and resolving lightweight, deterministic avatars
 * using DiceBear & UI-Avatars without consuming any Supabase Storage space.
 */

/**
 * Generate a deterministic default avatar URL.
 * @param {string} seed - Username, display name, or user ID
 * @param {'dicebear' | 'ui-avatars'} provider - Avatar service provider
 * @returns {string} Fully qualified avatar image URL
 */
export function getDefaultAvatar(seed = 'User', provider = 'dicebear') {
  const safeSeed = encodeURIComponent(String(seed || 'User').trim() || 'User')

  if (provider === 'ui-avatars') {
    return `https://ui-avatars.com/api/?name=${safeSeed}&background=random&color=fff&size=256&bold=true`
  }

  // DiceBear fun-emoji style (modern, colorful, friendly)
  return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${safeSeed}`
}

/**
 * Resolves avatar URL. If user has an uploaded avatar (not legacy static placeholder),
 * returns that avatar. Otherwise returns DiceBear default avatar.
 * @param {string|null} avatarUrl - Stored avatar URL
 * @param {string} fallbackSeed - Fallback name/username
 * @returns {string}
 */
export function getAvatarUrl(avatarUrl, fallbackSeed = 'User') {
  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim() !== '') {
    // Migrate old hardcoded unsplash placeholder
    if (avatarUrl.includes('images.unsplash.com')) {
      return getDefaultAvatar(fallbackSeed)
    }
    return avatarUrl
  }
  return getDefaultAvatar(fallbackSeed)
}
