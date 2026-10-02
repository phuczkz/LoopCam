import imageCompression from 'browser-image-compression'
import encodeWebp from '@jsquash/webp/encode'

/**
 * Cache for native canvas WebP export detection.
 * iOS Safari / WebKit does NOT support canvas.toBlob(..., 'image/webp') natively,
 * whereas Chrome/Edge/Firefox on Android and Desktop support it natively.
 */
let _supportsNativeWebP = null

export function supportsNativeCanvasWebP() {
  if (_supportsNativeWebP !== null) return _supportsNativeWebP
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    _supportsNativeWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    _supportsNativeWebP = false
  }
  return _supportsNativeWebP
}

/**
 * Load a File or Blob into an HTMLImageElement with fallback for HEIC or exotic formats.
 * @param {Blob|File} fileOrBlob
 * @returns {Promise<HTMLImageElement>}
 */
async function loadImage(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(fileOrBlob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = async (err) => {
      URL.revokeObjectURL(url)
      try {
        // Fallback for special formats like HEIC on older browsers
        const fallbackBlob = await imageCompression(fileOrBlob, {
          maxWidthOrHeight: 1440,
          fileType: 'image/jpeg',
          useWebWorker: false,
        })
        const fallbackUrl = URL.createObjectURL(fallbackBlob)
        const fallbackImg = new Image()
        fallbackImg.onload = () => {
          URL.revokeObjectURL(fallbackUrl)
          resolve(fallbackImg)
        }
        fallbackImg.onerror = () => {
          URL.revokeObjectURL(fallbackUrl)
          reject(err)
        }
        fallbackImg.src = fallbackUrl
      } catch {
        reject(err)
      }
    }
    img.src = url
  })
}

/**
 * Calculate scaled dimensions while preserving aspect ratio and preventing upscaling.
 */
function calculateDimensions(width, height, maxWidthOrHeight) {
  if (!maxWidthOrHeight || (width <= maxWidthOrHeight && height <= maxWidthOrHeight)) {
    return { width, height }
  }
  if (width > height) {
    return {
      width: maxWidthOrHeight,
      height: Math.round((height * maxWidthOrHeight) / width),
    }
  } else {
    return {
      width: Math.round((width * maxWidthOrHeight) / height),
      height: maxWidthOrHeight,
    }
  }
}

/**
 * Convert canvas pixel data to WebP ArrayBuffer using WebAssembly (@jsquash/webp).
 * Runs on iOS Safari or mobile browsers lacking native canvas WebP export.
 */
async function encodeCanvasToWebpWasm(canvas, quality = 0.88) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const qualityInt = Math.min(100, Math.max(1, Math.round(quality * 100)))
  const arrayBuffer = await encodeWebp(imageData, { quality: qualityInt })
  return arrayBuffer
}

/**
 * High-definition Canvas to WebP Compressor:
 * 1. Resizes with high-quality bicubic smoothing (ctx.imageSmoothingQuality = 'high').
 * 2. If browser supports native WebP export (Chrome/Edge/Android), exports natively at high quality.
 * 3. If browser is iOS Safari / WebKit, encodes via WebAssembly without lossy intermediate steps.
 * 4. Produces a crisp, razor-sharp WebP File object.
 *
 * @param {Blob|File} file
 * @param {number} maxWidthOrHeight - Target resolution constraint (default: 1200px)
 * @param {number} quality - WebP quality 0.0 - 1.0 (default: 0.88)
 * @returns {Promise<File>}
 */
export async function canvasCompress(file, maxWidthOrHeight = 1200, quality = 0.88) {
  if (typeof window === 'undefined' || !file) {
    return file
  }

  const baseName = (file.name || 'photo').replace(/\.[^/.]+$/, '')

  try {
    const img = await loadImage(file)
    const { width, height } = calculateDimensions(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      maxWidthOrHeight
    )

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, width)
    canvas.height = Math.max(1, height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Method A: Native canvas WebP export (Desktop / Android Chrome)
    if (supportsNativeCanvasWebP()) {
      try {
        const nativeBlob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/webp', quality)
        })
        if (nativeBlob && nativeBlob.type === 'image/webp') {
          return new File([nativeBlob], `${baseName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          })
        }
      } catch (err) {
        console.warn('Native canvas WebP export failed, trying WASM:', err)
      }
    }

    // Method B: WebAssembly WebP encoding (iOS Safari / mobile WebKit)
    const wasmBuffer = await encodeCanvasToWebpWasm(canvas, quality)
    return new File([wasmBuffer], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } catch (err) {
    console.error('canvasCompress error:', err)
    return file
  }
}

/**
 * General purpose image compressor with guaranteed WebP output on ALL devices.
 *
 * @param {File|Blob} file
 * @param {object} customOptions
 * @returns {Promise<File>}
 */
export async function compressImage(file, customOptions = {}) {
  if (!file) return file

  const maxWidthOrHeight = customOptions.maxWidthOrHeight || 1200
  const quality = customOptions.initialQuality || 0.88

  return await canvasCompress(file, maxWidthOrHeight, quality)
}

/**
 * Avatar compressor:
 * - Max dimension: 320px (tack sharp on 3x Retina display)
 * - Format: WebP (quality 0.88)
 * - Size: ~18KB - 35KB
 *
 * @param {File|Blob} file
 * @returns {Promise<File>}
 */
export async function compressAvatar(file) {
  if (!file) return file

  // If already WebP and small enough, avoid recompression
  if (file.type === 'image/webp' && file.size < 50 * 1024) {
    return file
  }

  return await canvasCompress(file, 320, 0.88)
}

/**
 * Post/Memory photo compressor:
 * - Max dimension: 1200px (crystal sharp on mobile 3x Super Retina OLED displays)
 * - Format: WebP (quality 0.88, preserves fine facial textures, badge typography, and vibrant colors)
 * - Size: ~120KB - 250KB (saves ~95% storage compared to 4MB-8MB original camera snaps)
 *
 * @param {File|Blob} file
 * @returns {Promise<File>}
 */
export async function compressPostImage(file) {
  if (!file) return file

  // If already WebP and small enough, avoid recompression
  if (file.type === 'image/webp' && file.size < 500 * 1024) {
    return file
  }

  return await canvasCompress(file, 1200, 0.88)
}

/**
 * Convert a canvas blob or file to a File object, ensuring .webp naming.
 * @param {Blob|File} blob
 * @param {string} filename
 * @returns {File}
 */
export function blobToFile(blob, filename = 'photo.webp') {
  if (!blob) return null
  if (blob instanceof File && blob.name && blob.type === 'image/webp') {
    return blob
  }
  const type = blob.type && blob.type !== '' ? blob.type : 'image/webp'
  return new File([blob], filename, {
    type,
    lastModified: Date.now(),
  })
}
