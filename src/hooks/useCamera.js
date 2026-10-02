import { useCallback, useEffect, useRef, useState } from 'react'

export function useCamera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isFrontCamera, setIsFrontCamera] = useState(true)
  const [capturedImage, setCapturedImage] = useState(null) // { blob, url }
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [cameraError, setCameraError] = useState(null)

  const startCamera = useCallback(async (facingFront = true) => {
    try {
      // Check for mediaDevices support (disabled on insecure HTTP on mobile)
      if (!navigator?.mediaDevices?.getUserMedia) {
        const isHttp = window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        const msg = isHttp
          ? 'Trình duyệt điện thoại yêu cầu kết nối bảo mật (HTTPS) để mở trực tiếp camera. Bạn hãy dùng nút Chụp ảnh bằng camera điện thoại bên dưới hoặc truy cập bằng https://'
          : 'Trình duyệt này không hỗ trợ truyền hình ảnh camera trực tiếp.'
        setCameraError(msg)
        setIsStreaming(false)
        return
      }

      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      const constraints = {
        video: {
          facingMode: facingFront ? 'user' : 'environment',
          width: { ideal: 1080 },
          height: { ideal: 1080 },
        },
        audio: false,
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      setIsStreaming(true)
      setPermissionDenied(false)
      setCameraError(null)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Camera access error:', error)
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true)
        setCameraError('Bạn đã từ chối quyền truy cập máy ảnh trong trình duyệt.')
      } else {
        setCameraError(error.message || 'Không thể khởi động camera.')
      }
      setIsStreaming(false)
    }
  }, [stream])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      setIsStreaming(false)
    }
  }, [stream])

  const switchCamera = useCallback(() => {
    const newFacing = !isFrontCamera
    setIsFrontCamera(newFacing)
    startCamera(newFacing)
  }, [isFrontCamera, startCamera])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) return null

    // Set canvas to square crop from center
    const size = Math.min(video.videoWidth, video.videoHeight)
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')

    // Mirror if front camera
    if (isFrontCamera) {
      ctx.translate(size, 0)
      ctx.scale(-1, 1)
    }

    // Crop to center square
    const sx = (video.videoWidth - size) / 2
    const sy = (video.videoHeight - size) / 2

    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size)

    // iOS Safari does NOT support 'image/webp' in canvas.toBlob — use 'image/jpeg' as universal fallback
    const mimeType = canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          setCapturedImage({ blob, url, mimeType })
        } else {
          console.error('canvas.toBlob returned null — format not supported')
        }
      },
      mimeType,
      0.85
    )

    stopCamera()
  }, [isFrontCamera, stopCamera])

  const retake = useCallback(() => {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }
    setCapturedImage(null)
    startCamera(isFrontCamera)
  }, [capturedImage, isFrontCamera, startCamera])

  const setImageFromFile = useCallback((file) => {
    const url = URL.createObjectURL(file)
    setCapturedImage({ blob: file, url })
    stopCamera()
  }, [stopCamera])

  const clearCapture = useCallback(() => {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }
    setCapturedImage(null)
  }, [capturedImage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (capturedImage?.url) {
        URL.revokeObjectURL(capturedImage.url)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    videoRef,
    canvasRef,
    isStreaming,
    isFrontCamera,
    capturedImage,
    permissionDenied,
    cameraError,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    retake,
    setImageFromFile,
    clearCapture,
  }
}
