/**
 * Utility functions for encoding and decoding photo comment messages
 * in LoopCam (Locket style).
 */

/**
 * Format date for post badge in chat: e.g. "14 thg 9", "Hôm nay 15:30"
 */
export function formatPostCommentDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const timeStr = `${hours}:${minutes}`

  if (isToday) {
    return `Hôm nay ${timeStr}`
  }

  if (isYesterday) {
    return `Hôm qua ${timeStr}`
  }

  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()

  if (year === now.getFullYear()) {
    return `${day} thg ${month}`
  }
  return `${day}/${month}/${year}`
}

/**
 * Encode photo comment metadata into the media_url hash
 * This ensures the URL remains a valid HTTP(S) image URL for any <img> tag,
 * while carrying rich post metadata across Supabase Realtime without altering table schema.
 */
export function encodePostCommentMediaUrl({
  imageUrl,
  postId,
  authorId,
  authorName,
  authorAvatar,
  postCreatedAt,
  caption,
}) {
  if (!imageUrl) return ''

  const meta = {
    type: 'post_comment',
    postId: postId || null,
    authorId: authorId || null,
    authorName: authorName || 'Bạn bè',
    authorAvatar: authorAvatar || null,
    postCreatedAt: postCreatedAt || new Date().toISOString(),
    caption: caption || null,
  }

  return `${imageUrl}#loopcam_meta=${encodeURIComponent(JSON.stringify(meta))}`
}

/**
 * Parse a media_url to extract clean image URL and any attached post comment metadata
 */
export function parseMessageMedia(mediaUrl) {
  if (!mediaUrl) {
    return {
      imageUrl: null,
      isPostComment: false,
      meta: null,
    }
  }

  const [rawUrl, hash] = mediaUrl.split('#loopcam_meta=')
  const imageUrl = rawUrl || null

  if (!hash) {
    return {
      imageUrl,
      isPostComment: false,
      meta: null,
    }
  }

  try {
    const meta = JSON.parse(decodeURIComponent(hash))
    return {
      imageUrl,
      isPostComment: meta.type === 'post_comment',
      meta,
    }
  } catch (err) {
    console.warn('Failed to parse loopcam_meta from media_url:', err)
    return {
      imageUrl,
      isPostComment: false,
      meta: null,
    }
  }
}
