import { supabase } from './supabase.js'

/**
 * Extracts the relative storage path inside a bucket from a relative path or full URL.
 * Examples:
 * - 'avatars/user123/123.webp' -> 'avatars/user123/123.webp'
 * - 'photos/avatars/user123/123.webp' -> 'avatars/user123/123.webp'
 * - 'https://.../storage/v1/object/public/photos/avatars/user123/123.webp' -> 'avatars/user123/123.webp'
 * - 'https://.../storage/v1/object/public/photos/user123/123.webp' -> 'user123/123.webp'
 *
 * @param {string} pathOrUrl
 * @param {string} bucket
 * @returns {string|null}
 */
export function extractStoragePath(pathOrUrl, bucket = 'photos') {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null
  const trimmed = pathOrUrl.trim()

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    // Strip leading bucket name if present
    const prefix = `${bucket}/`
    return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed
  }

  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
    `/storage/v1/object/authenticated/${bucket}/`,
  ]

  for (const marker of markers) {
    if (trimmed.includes(marker)) {
      const part = trimmed.split(marker)[1]
      if (part) {
        return decodeURIComponent(part.split('?')[0])
      }
    }
  }

  return null
}

/**
 * Remove a file from Supabase storage bucket.
 * @param {string} pathOrUrl - Relative path or public URL of the file
 * @param {string} bucket - Bucket name (default: 'photos')
 * @returns {Promise<{data: any, error: any}>}
 */
export async function removeStorageFile(pathOrUrl, bucket = 'photos') {
  const relativePath = extractStoragePath(pathOrUrl, bucket)
  if (!relativePath) return { data: null, error: null }

  try {
    const { data, error } = await supabase.storage.from(bucket).remove([relativePath])
    if (error) {
      console.warn(`[Supabase Storage] Lỗi xóa file (${bucket}/${relativePath}):`, error)
    } else if (!data || data.length === 0) {
    } else {
      console.log(`[Supabase Storage] Đã xóa thành công file: ${relativePath}`)
    }
    return { data, error }
  } catch (err) {
    console.warn(`[Supabase Storage] Ngoại lệ khi xóa (${bucket}/${relativePath}):`, err)
    return { data: null, error: err }
  }
}

/**
 * Clean up old avatar files in 'avatars/{userId}/' folder so users only keep the active avatar.
 * Prevents storage accumulation when users repeatedly update their profile photo.
 *
 * @param {string} userId - User ID
 * @param {string} currentFileName - Name of the new file to preserve (e.g. '17200000.webp')
 * @param {string} bucket - Bucket name
 */
export async function cleanupOldAvatars(userId, currentFileName, bucket = 'photos') {
  if (!userId) return
  try {
    const folder = `avatars/${userId}`
    const { data: fileList, error: listErr } = await supabase.storage
      .from(bucket)
      .list(folder)

    if (listErr) {
      console.warn(`[Supabase Storage] Lỗi list files trong ${folder}:`, listErr)
      return
    }

    if (!fileList || fileList.length === 0) return

    const filesToDelete = fileList
      .filter(
        (file) =>
          file.name &&
          file.name !== currentFileName &&
          file.name !== '.emptyFolderPlaceholder'
      )
      .map((file) => `${folder}/${file.name}`)

    if (filesToDelete.length > 0) {
      console.log(`[Supabase Storage] Đang xóa ${filesToDelete.length} avatar cũ:`, filesToDelete)
      const { data, error } = await supabase.storage.from(bucket).remove(filesToDelete)
      if (error) {
        console.warn('[Supabase Storage] Lỗi khi xóa avatar cũ:', error)
      } else if (!data || data.length === 0) {
      } else {
        console.log(`[Supabase Storage] Đã dọn dẹp ${data.length} avatar cũ thành công!`)
      }
    }
  } catch (err) {
    console.warn('[Supabase Storage] cleanupOldAvatars exception:', err)
  }
}
