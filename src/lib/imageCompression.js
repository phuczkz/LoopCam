import imageCompression from 'browser-image-compression'

/**
 * Fallback compressor using HTML5 Canvas if browser-image-compression fails
 * or when direct canvas export is required.
 */
async function canvasCompress(file, maxWidthOrHeight = 1080, quality = 0.8, mimeType = 'image/webp') {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !file) {
      return resolve(file)
    }

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img

      if (width > height) {
        if (width > maxWidthOrHeight) {
          height = Math.round((height * maxWidthOrHeight) / width)
          width = maxWidthOrHeight
        }
      } else {
        if (height > maxWidthOrHeight) {
          width = Math.round((width * maxWidthOrHeight) / height)
          height = maxWidthOrHeight
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, width)
      canvas.height = Math.max(1, height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback to jpeg if webp not supported by browser canvas
            canvas.toBlob(
              (jpegBlob) => {
                if (!jpegBlob) return resolve(file)
                resolve(
                  new File([jpegBlob], 'image.jpg', {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  })
                )
              },
              'image/jpeg',
              quality
            )
            return
          }
          const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
          resolve(
            new File([blob], `image.${ext}`, {
              type: blob.type,
              lastModified: Date.now(),
            })
          )
        },
        mimeType,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}

/**
 * General purpose image compressor with WebP default.
 *
 * @param {File|Blob} file
 * @param {object} customOptions
 * @returns {Promise<File>}
 */
export async function compressImage(file, customOptions = {}) {
  if (!file) return file

  const defaultOptions = {
    maxSizeMB: 0.35,
    maxWidthOrHeight: 1200,
    initialQuality: 0.82,
    fileType: 'image/webp',
    useWebWorker: false, // Set false for iOS Safari stability
  }

  const options = { ...defaultOptions, ...customOptions }

  try {
    const compressed = await imageCompression(file, options)
    return compressed
  } catch (err) {
    console.warn('browser-image-compression fallback to canvas:', err)
    return await canvasCompress(
      file,
      options.maxWidthOrHeight,
      options.initialQuality,
      options.fileType || 'image/webp'
    )
  }
}

/**
 * Avatar compressor:
 * - Max dimension: 256px
 * - Target size: ~15KB - 35KB (max 0.05MB)
 * - Format: WebP (quality 0.82)
 *
 * @param {File|Blob} file
 * @returns {Promise<File>}
 */
export async function compressAvatar(file) {
  if (!file) return file

  return await compressImage(file, {
    maxSizeMB: 0.05,
    maxWidthOrHeight: 256,
    initialQuality: 0.82,
    fileType: 'image/webp',
  })
}

/**
 * Post/Memory photo compressor:
 * - Max dimension: 1080px (standard mobile resolution)
 * - Target size: ~80KB - 200KB (max 0.25MB, saves ~95% storage compared to raw 5MB-10MB)
 * - Format: WebP (quality 0.8)
 *
 * @param {File|Blob} file
 * @returns {Promise<File>}
 */
export async function compressPostImage(file) {
  if (!file) return file

  return await compressImage(file, {
    maxSizeMB: 0.25,
    maxWidthOrHeight: 1080,
    initialQuality: 0.8,
    fileType: 'image/webp',
  })
}

/**
 * Convert a canvas blob or file to a File object.
 * @param {Blob|File} blob
 * @param {string} filename
 * @returns {File}
 */
export function blobToFile(blob, filename = 'photo.webp') {
  if (!blob) return null
  if (blob instanceof File && blob.name) return blob
  const type = blob.type && blob.type !== '' ? blob.type : 'image/webp'
  return new File([blob], filename, {
    type,
    lastModified: Date.now(),
  })
}
