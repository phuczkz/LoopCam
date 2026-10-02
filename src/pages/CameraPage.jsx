import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCamera } from '../hooks/useCamera'
import { usePosts } from '../hooks/usePosts'
import { useFriends } from '../hooks/useFriends'
import { useAuth } from '../hooks/useAuth'
import { compressPostImage, blobToFile } from '../lib/imageCompression'
import { getAvatarUrl } from '../lib/avatarUtils'
import { Avatar } from '../components/ui/Avatar'
import { Spinner } from '../components/ui/Spinner'
import {
  SwitchCamera,
  X,
  Send,
  Users,
  ChevronDown,
  AlertCircle,
  Volume2,
  Zap,
  History,
  ImagePlus,
  Camera,
  Download,
  UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'

function getFormattedTime() {
  const now = new Date()
  let hours = now.getHours()
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const period = hours >= 12 ? 'CH' : 'SA'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${period}`
}

const CAPTION_WIDGETS = [
  {
    id: 'text',
    category: 'General',
    label: 'Văn bản',
    pillText: 'Aa Văn bản',
    iconText: 'Aa',
    defaultText: '',
    placeholder: 'Thêm một tin nhắn',
    sheetBg: 'bg-[#28282a]',
    textColor: 'text-white',
  },
  {
    id: 'review',
    category: 'General',
    label: 'Review',
    pillText: 'Review',
    iconText: '⭐',
    defaultText: '⭐⭐⭐⭐⭐ Rất thích!',
    placeholder: 'Viết review ngắn...',
    sheetBg: 'bg-[#28282a]',
    textColor: 'text-white',
  },
  {
    id: 'music',
    category: 'General',
    label: 'Đang phát',
    pillText: 'Đang phát',
    iconText: '🎵',
    defaultText: 'Đang phát • Bài hát yêu thích ♫',
    placeholder: 'Tên bài hát...',
    sheetBg: 'bg-[#28282a]',
    textColor: 'text-white',
  },
  {
    id: 'location',
    category: 'General',
    label: 'Vị trí',
    pillText: 'Vị trí',
    iconText: '📍',
    defaultText: 'Vị trí của tôi',
    placeholder: 'Nhập vị trí...',
    sheetBg: 'bg-[#28282a]',
    textColor: 'text-white',
  },
  {
    id: 'weather',
    category: 'General',
    label: 'Thời tiết',
    pillText: 'Thời tiết',
    iconText: '☀️',
    defaultText: '28°C • Nắng đẹp',
    placeholder: 'Thời tiết...',
    sheetBg: 'bg-[#38bdf8]',
    textColor: 'text-white font-bold',
  },
  {
    id: 'time',
    category: 'General',
    label: 'Thời gian',
    pillText: getFormattedTime(),
    iconText: '🕒',
    defaultText: getFormattedTime(),
    placeholder: 'Thời gian...',
    sheetBg: 'bg-[#28282a]',
    textColor: 'text-white',
  },
  {
    id: 'streak',
    category: 'General',
    label: 'Streak',
    pillText: '1',
    iconText: '🔥',
    defaultText: '1 ngày liên tiếp',
    placeholder: 'Số ngày chuỗi...',
    sheetBg: 'bg-[#f59e0b]',
    textColor: 'text-black font-bold',
  },
  {
    id: 'zodiac',
    category: 'General',
    label: 'Mùa Thiên Bình',
    pillText: 'Mùa Thiên Bình',
    iconText: '♎',
    defaultText: 'Mùa Thiên Bình ✨',
    placeholder: 'Cung hoàng đạo...',
    sheetBg: 'bg-[#fce7f3] border border-[#f472b6]/30',
    textColor: 'text-[#831843] font-semibold',
  },
  {
    id: 'party',
    category: 'Decorative',
    label: 'Party Time!',
    pillText: 'Party Time!',
    iconText: '🪩',
    defaultText: 'Party Time! 🎉',
    placeholder: 'Tiệc tùng...',
    sheetBg: 'bg-gradient-to-r from-[#86efac] via-[#6ee7b7] to-[#67e8f9]',
    textColor: 'text-[#064e3b] font-bold',
  },
  {
    id: 'ootd',
    category: 'Decorative',
    label: 'OOTD',
    pillText: 'OOTD',
    iconText: '🕶️',
    defaultText: 'Outfit Of The Day ✨',
    placeholder: 'Trang phục...',
    sheetBg: 'bg-white',
    textColor: 'text-black font-bold',
  },
  {
    id: 'missyou',
    category: 'Decorative',
    label: 'Miss you',
    pillText: 'Miss you',
    iconText: '🥰',
    defaultText: 'Miss you so much ❤️',
    placeholder: 'Lời nhắn...',
    sheetBg: 'bg-gradient-to-r from-[#f43f5e] to-[#ef4444]',
    textColor: 'text-white font-bold',
  },
]

async function drawBadgeOnImage(blob, widget, customVal) {
  if (!blob || !widget || widget.id === 'text') return blob
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 1080
      canvas.height = img.naturalHeight || 1080
      const ctx = canvas.getContext('2d')

      // Draw photo
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Badge content
      let text = customVal || widget.defaultText || widget.pillText
      let icon = widget.iconText

      let displayText = `${icon} ${text}`.trim()
      if (widget.id === 'streak') {
        displayText = `🔥 ${customVal || '1 ngày liên tiếp'}`
      } else if (widget.id === 'time') {
        displayText = `🕒 ${getFormattedTime()}`
      }

      const fontSize = Math.round(canvas.width * 0.038)
      ctx.font = `bold ${fontSize}px Inter, sans-serif`
      const textWidth = ctx.measureText(displayText).width
      const paddingX = Math.round(canvas.width * 0.045)
      const paddingY = Math.round(canvas.height * 0.016)
      const pillWidth = Math.min(canvas.width * 0.88, textWidth + paddingX * 2)
      const pillHeight = fontSize + paddingY * 2
      const pillX = (canvas.width - pillWidth) / 2
      const pillY = canvas.height - Math.round(canvas.height * 0.12)
      const radius = pillHeight / 2

      ctx.save()
      ctx.beginPath()
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, radius)

      if (widget.id === 'weather') {
        ctx.fillStyle = '#38bdf8'
      } else if (widget.id === 'streak') {
        ctx.fillStyle = '#f59e0b'
      } else if (widget.id === 'zodiac') {
        ctx.fillStyle = '#fce7f3'
      } else if (widget.id === 'party') {
        const grad = ctx.createLinearGradient(pillX, pillY, pillX + pillWidth, pillY)
        grad.addColorStop(0, '#86efac')
        grad.addColorStop(1, '#67e8f9')
        ctx.fillStyle = grad
      } else if (widget.id === 'ootd') {
        ctx.fillStyle = '#ffffff'
      } else if (widget.id === 'missyou') {
        const grad = ctx.createLinearGradient(pillX, pillY, pillX + pillWidth, pillY)
        grad.addColorStop(0, '#f43f5e')
        grad.addColorStop(1, '#ef4444')
        ctx.fillStyle = grad
      } else {
        ctx.fillStyle = 'rgba(28, 28, 30, 0.92)'
      }

      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetY = 4
      ctx.fill()
      ctx.restore()

      // Draw text
      ctx.save()
      if (widget.id === 'streak' || widget.id === 'ootd' || widget.id === 'party') {
        ctx.fillStyle = '#0f172a'
      } else if (widget.id === 'zodiac') {
        ctx.fillStyle = '#831843'
      } else {
        ctx.fillStyle = '#ffffff'
      }
      ctx.font = `bold ${fontSize}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(displayText, canvas.width / 2, pillY + pillHeight / 2)
      ctx.restore()

      canvas.toBlob((b) => resolve(b || blob), 'image/jpeg', 0.88)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(blob)
    }
    img.src = url
  })
}

export function CameraPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const nativeCamInputRef = useRef(null)
  const { user } = useAuth()

  const {
    videoRef,
    canvasRef,
    isStreaming,
    isFrontCamera,
    capturedImage,
    permissionDenied,
    cameraError,
    startCamera,
    switchCamera,
    capturePhoto,
    retake,
    setImageFromFile,
    clearCapture,
  } = useCamera()

  const { sendPost, sending, feed } = usePosts()
  const { friends } = useFriends()

  const [caption, setCaption] = useState('')
  const [sendToAll, setSendToAll] = useState(true)
  const [selectedFriends, setSelectedFriends] = useState([])
  const [step, setStep] = useState('capture') // 'capture' | 'preview'
  const [flashOn, setFlashOn] = useState(false)
  const [activeWidgetIndex, setActiveWidgetIndex] = useState(0)
  const [showWidgetSheet, setShowWidgetSheet] = useState(false)
  const [widgetCustomText, setWidgetCustomText] = useState({})
  const [widgetBadge, setWidgetBadge] = useState(null)

  const captionInputRef = useRef(null)
  const photoTouchStartX = useRef(null)
  const photoTouchStartY = useRef(null)
  const widgetBadgeTimerRef = useRef(null)

  // Start camera on mount
  useEffect(() => {
    if (!capturedImage) {
      startCamera(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When image is captured, move to preview
  useEffect(() => {
    if (capturedImage) {
      setStep('preview')
    } else {
      setStep('capture')
    }
  }, [capturedImage])

  // Add body class when preview is active to hide BottomNav
  useEffect(() => {
    if (step === 'preview') {
      document.body.classList.add('camera-preview-active')
    } else {
      document.body.classList.remove('camera-preview-active')
    }
    return () => {
      document.body.classList.remove('camera-preview-active')
    }
  }, [step])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFromFile(file)
    }
  }

  const handleWidgetSelect = (idx) => {
    setActiveWidgetIndex(idx)
    const w = CAPTION_WIDGETS[idx]
    setWidgetBadge(w.label)
    if (widgetBadgeTimerRef.current) clearTimeout(widgetBadgeTimerRef.current)
    widgetBadgeTimerRef.current = setTimeout(() => {
      setWidgetBadge(null)
    }, 1200)

    if (w.id === 'text') {
      setTimeout(() => captionInputRef.current?.focus(), 150)
    }
  }

  const handlePhotoTouchStart = (e) => {
    photoTouchStartX.current = e.touches[0].clientX
    photoTouchStartY.current = e.touches[0].clientY
  }

  const handlePhotoTouchEnd = (e) => {
    if (photoTouchStartX.current === null) return
    const diffX = photoTouchStartX.current - e.changedTouches[0].clientX
    const diffY = photoTouchStartY.current - e.changedTouches[0].clientY

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        handleWidgetSelect((activeWidgetIndex + 1) % CAPTION_WIDGETS.length)
      } else {
        handleWidgetSelect((activeWidgetIndex - 1 + CAPTION_WIDGETS.length) % CAPTION_WIDGETS.length)
      }
    }
    photoTouchStartX.current = null
    photoTouchStartY.current = null
  }

  const toggleFriend = (friendId) => {
    if (sendToAll) {
      setSendToAll(false)
      setSelectedFriends([friendId])
    } else {
      if (selectedFriends.includes(friendId)) {
        const remaining = selectedFriends.filter((id) => id !== friendId)
        if (remaining.length === 0) {
          setSendToAll(true)
          setSelectedFriends([])
        } else {
          setSelectedFriends(remaining)
        }
      } else {
        setSelectedFriends((prev) => [...prev, friendId])
      }
    }
  }

  const selectAllFriends = () => {
    setSendToAll(true)
    setSelectedFriends([])
  }

  const getHeaderTitle = () => {
    if (sendToAll) {
      return 'Gửi đến...'
    }
    if (selectedFriends.length === 1) {
      const friend = friends.find(
        (f) => (f.profile?.id || f.friendId) === selectedFriends[0]
      )
      const name = friend?.profile?.full_name || friend?.profile?.username
      return name ? `Gửi đến ${name}...` : 'Gửi đến...'
    }
    if (selectedFriends.length > 1) {
      return `Gửi đến ${selectedFriends.length} người bạn...`
    }
    return 'Gửi đến...'
  }

  const handleDownload = async () => {
    if (!capturedImage?.blob && !capturedImage?.url) return
    try {
      let blobToDownload = capturedImage.blob
      const activeWidget = CAPTION_WIDGETS[activeWidgetIndex]
      if (activeWidget.id !== 'text' && blobToDownload) {
        const customVal = widgetCustomText[activeWidget.id] ?? activeWidget.defaultText
        blobToDownload = await drawBadgeOnImage(blobToDownload, activeWidget, customVal)
      }
      const downloadUrl = blobToDownload
        ? URL.createObjectURL(blobToDownload)
        : capturedImage.url

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `loopcam_${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      if (blobToDownload && downloadUrl !== capturedImage.url) {
        URL.revokeObjectURL(downloadUrl)
      }
      toast.success('Đã lưu ảnh vào máy! 💾')
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Không thể lưu ảnh')
    }
  }

  const handleSend = async () => {
    if (!capturedImage) return

    const recipientIds = sendToAll
      ? friends.map((f) => f.profile?.id || f.friendId).filter(Boolean)
      : selectedFriends

    try {
      let finalBlob = capturedImage.blob
      const activeWidget = CAPTION_WIDGETS[activeWidgetIndex]

      if (activeWidget.id !== 'text' && finalBlob) {
        const customVal = widgetCustomText[activeWidget.id] ?? activeWidget.defaultText
        finalBlob = await drawBadgeOnImage(finalBlob, activeWidget, customVal)
      }

      const mime = capturedImage.mimeType || finalBlob?.type || 'image/jpeg'
      const ext = mime === 'image/webp' ? 'webp' : 'jpg'
      const file = blobToFile(finalBlob, `photo.${ext}`)
      const compressed = await compressPostImage(file)

      const finalCaption = activeWidget.id === 'text'
        ? caption
        : `${activeWidget.iconText} ${widgetCustomText[activeWidget.id] ?? activeWidget.defaultText}`

      await sendPost({
        imageFile: compressed,
        caption: finalCaption,
        recipientIds,
      })

      if (recipientIds.length > 0) {
        toast.success('Đã gửi ảnh đến bạn bè và lưu vào Feed! 📸')
      } else {
        toast.success('Đã đăng ảnh lên Feed của bạn! 📸')
      }

      setCaption('')
      setWidgetCustomText({})
      setActiveWidgetIndex(0)
      setSelectedFriends([])
      setSendToAll(true)
      clearCapture()
      navigate('/feed')
    } catch (error) {
      console.error('Send error:', error)
      toast.error(error.message || 'Lỗi khi gửi ảnh')
    }
  }

  // Touch swipe UP on camera to open Feed
  const camTouchStartY = useRef(null)
  const camTouchStartX = useRef(null)

  const handleCamTouchStart = (e) => {
    camTouchStartY.current = e.touches[0].clientY
    camTouchStartX.current = e.touches[0].clientX
  }

  const handleCamTouchEnd = (e) => {
    if (camTouchStartY.current === null) return
    const diffY = camTouchStartY.current - e.changedTouches[0].clientY
    const diffX = camTouchStartX.current - e.changedTouches[0].clientX

    // Swipe UP to navigate to Feed
    if (diffY > 50 && Math.abs(diffY) > Math.abs(diffX)) {
      navigate('/feed')
    }
    camTouchStartY.current = null
    camTouchStartX.current = null
  }

  const handleCamWheel = (e) => {
    if (e.deltaY > 30) {
      navigate('/feed')
    }
  }

  // ===== CAPTURE VIEW =====
  if (step === 'capture') {
    return (
      <div
        className="flex flex-col h-full bg-black select-none pb-18"
        onTouchStart={handleCamTouchStart}
        onTouchEnd={handleCamTouchEnd}
        onWheel={handleCamWheel}
      >

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          {/* Mute / Sound pill */}
          <button className="cam-pill" aria-label="Sound">
            <Volume2 size={17} />
          </button>

          {/* Friends badge */}
          <div className="cam-pill">
            <Users size={15} />
            <span>{friends.length} người bạn</span>
          </div>

          {/* User avatar */}
          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/20 btn-press"
            aria-label="Profile"
          >
            <Avatar
              src={user?.user_metadata?.avatar_url}
              alt={user?.user_metadata?.full_name ?? 'Me'}
              size={40}
            />
          </button>
        </div>

        {/* ── Camera Viewfinder (Hình vuông 1:1, kéo chiều cao dài xuống chuẩn Locket) ── */}
        <div className="w-full px-3.5 flex justify-center flex-shrink-0">
          <div className="relative w-full aspect-square max-w-[390px] rounded-[32px] overflow-hidden bg-dark-800 shadow-2xl ring-1 ring-white/10">
            {permissionDenied || cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-dark-800 animate-fade-in">
                <AlertCircle size={40} className="text-[#E8A020] mb-3" />
                <p className="text-white font-semibold mb-1.5 text-base">
                  {permissionDenied ? 'Đã chặn quyền máy ảnh' : 'Không thể mở Camera trực tiếp'}
                </p>
                <p className="text-white/60 text-xs mb-6 max-w-xs leading-relaxed">
                  {cameraError || 'Vui lòng cấp quyền máy ảnh trong cài đặt trình duyệt, hoặc chụp bằng ứng dụng máy ảnh của điện thoại.'}
                </p>
                <div className="flex flex-col gap-2.5 w-full max-w-xs">
                  <button
                    onClick={() => nativeCamInputRef.current?.click()}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#E8A020] hover:bg-[#d9941a] text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg btn-press"
                  >
                    <Camera size={20} />
                    <span>Chụp bằng máy ảnh điện thoại</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 btn-press"
                  >
                    <ImagePlus size={16} />
                    <span>Chọn ảnh từ bộ sưu tập</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
                />

                {/* Loading overlay */}
                {!isStreaming && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-dark-800">
                    <Spinner size={32} />
                    <span className="text-xs text-white/40">Đang bật máy ảnh...</span>
                  </div>
                )}

                {/* Flash toggle — top left */}
                <button
                  onClick={() => setFlashOn((p) => !p)}
                  className="cam-overlay-btn absolute top-3.5 left-3.5 w-9 h-9"
                  aria-label="Flash"
                >
                  <Zap
                    size={22}
                    fill={flashOn ? 'white' : 'none'}
                    strokeWidth={flashOn ? 0 : 2}
                  />
                </button>

                {/* Zoom label — top right */}
                <span className="absolute top-3.5 right-3.5 bg-black/40 backdrop-blur-sm text-white text-xs font-bold rounded-full px-2.5 py-1">
                  1×
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="flex items-center justify-center gap-9 pt-3.5 pb-2">
          {/* Gallery / File picker (Tải ảnh từ thư viện máy lên) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-white/20 bg-dark-700 hover:bg-dark-600 flex items-center justify-center btn-press shadow-md transition-colors"
            aria-label="Tải ảnh từ thư viện"
            title="Tải ảnh từ thư viện"
          >
            <ImagePlus size={22} className="text-white/80" />
          </button>
          {/* File picker from gallery */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          {/* Native OS camera capture for mobile fallback */}
          <input
            ref={nativeCamInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Shutter button */}
          <button
            className="cam-shutter-ring"
            onClick={isStreaming ? capturePhoto : () => nativeCamInputRef.current?.click()}
            aria-label="Take photo"
            title={isStreaming ? 'Chụp ảnh' : 'Bấm để chụp bằng máy ảnh'}
          >
            <div className="cam-shutter-inner" />
          </button>

          {/* Switch camera */}
          <button
            onClick={switchCamera}
            disabled={!isStreaming}
            className="w-12 h-12 flex items-center justify-center btn-press disabled:opacity-30"
            aria-label="Switch camera"
          >
            <SwitchCamera size={26} className="text-white" />
          </button>
        </div>

        {/* ── History Row matching Locket ── */}
        <button
          className="flex items-center justify-center gap-2 mt-3.5 mb-1 pb-1.5 btn-press cursor-pointer"
          onClick={() => navigate('/feed')}
          aria-label="Xem Feed (hoặc lướt lên)"
        >
          {feed && feed[0]?.signedImageUrl ? (
            <img
              src={feed[0].signedImageUrl}
              alt="Lịch sử"
              className="w-7 h-7 rounded-lg object-cover ring-1 ring-white/20 flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-dark-700 flex items-center justify-center flex-shrink-0">
              <History size={15} className="text-white/60" />
            </div>
          )}
          <span className="text-white text-sm font-semibold">Lịch sử</span>
          <ChevronDown size={15} className="text-white/60" />
        </button>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  // ===== PREVIEW & SEND VIEW (LOCKET-STYLE) =====
  const activeWidget = CAPTION_WIDGETS[activeWidgetIndex] || CAPTION_WIDGETS[0]

  return (
    <div className="fixed inset-0 z-50 max-w-[430px] mx-auto bg-black flex flex-col justify-between px-3 pt-3 pb-5 safe-top safe-bottom select-none animate-fade-in overflow-hidden">
      
      {/* ── 1. Top Bar ── */}
      <div className="flex items-center justify-between h-12 flex-shrink-0 px-1">
        {/* Invisible spacer to balance the header */}
        <div className="w-10 h-10" />

        {/* Center Title: "Gửi đến..." */}
        <h1 className="text-white text-[17px] font-semibold tracking-tight text-center truncate max-w-[240px]">
          {getHeaderTitle()}
        </h1>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="w-10 h-10 flex items-center justify-center text-white/90 hover:text-white active:scale-90 transition-transform rounded-full cursor-pointer"
          title="Tải ảnh về máy"
          aria-label="Tải ảnh về máy"
        >
          <Download size={22} strokeWidth={2.2} />
        </button>
      </div>

      {/* ── 2. Photo Card Preview ── */}
      <div className="w-full flex flex-col items-center justify-center flex-1 my-auto">
        <div
          className="relative w-full aspect-square max-w-[370px] sm:max-w-[390px] rounded-[32px] sm:rounded-[36px] overflow-hidden bg-dark-800 shadow-2xl ring-1 ring-white/10 flex-shrink-0"
          onTouchStart={handlePhotoTouchStart}
          onTouchEnd={handlePhotoTouchEnd}
        >
          {capturedImage?.url && (
            <img
              src={capturedImage.url}
              alt="Preview"
              className="w-full h-full object-cover pointer-events-none select-none"
            />
          )}

          {/* Widget name toast pill when changing */}
          {widgetBadge && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold border border-white/15 pointer-events-none animate-fade-in shadow-xl flex items-center gap-1.5 z-20">
              <span>{activeWidget.iconText}</span>
              <span>{widgetBadge}</span>
            </div>
          )}

          {/* Caption / Widget Overlay */}
          <div className="absolute bottom-5 left-4 right-4 flex justify-center z-10">
            {activeWidget.id === 'text' ? (
              <input
                ref={captionInputRef}
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Thêm một tin nhắn"
                maxLength={100}
                className="w-full text-center bg-transparent border-none outline-none text-white text-[15px] sm:text-base font-medium placeholder-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] px-3 py-1.5 caret-[#E8A020] focus:ring-0"
              />
            ) : (
              <div
                onClick={() => setShowWidgetSheet(true)}
                className={`${activeWidget.sheetBg} ${activeWidget.textColor} px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 max-w-[90%] cursor-pointer active:scale-95 transition-transform`}
              >
                <span className="text-base leading-none select-none">{activeWidget.iconText}</span>
                <input
                  type="text"
                  value={widgetCustomText[activeWidget.id] ?? activeWidget.defaultText}
                  onChange={(e) => {
                    e.stopPropagation()
                    setWidgetCustomText((prev) => ({ ...prev, [activeWidget.id]: e.target.value }))
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={activeWidget.placeholder}
                  maxLength={60}
                  className="bg-transparent border-none outline-none text-inherit text-sm font-semibold flex-1 min-w-0 text-center placeholder-inherit/60 focus:ring-0"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Caption Widget Pagination Dots (11 dots) ── */}
        <div className="flex items-center justify-center gap-1.5 mt-3 mb-2 flex-shrink-0">
          {CAPTION_WIDGETS.map((widget, idx) => (
            <button
              key={widget.id}
              onClick={() => handleWidgetSelect(idx)}
              className={`transition-all duration-200 rounded-full cursor-pointer ${
                activeWidgetIndex === idx
                  ? 'w-2 h-2 bg-white scale-125 shadow-sm'
                  : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
              }`}
              title={widget.label}
              aria-label={widget.label}
            />
          ))}
        </div>
      </div>

      {/* ── 4. Main Action Buttons Row (✕ , Send , Aa✦) ── */}
      <div className="flex items-center justify-between px-8 sm:px-10 mt-1 mb-3 flex-shrink-0">
        {/* Cancel / Retake (✕) */}
        <button
          onClick={retake}
          className="w-12 h-12 flex items-center justify-center text-white/90 hover:text-white active:scale-90 transition-transform btn-press cursor-pointer"
          aria-label="Chụp lại"
          title="Chụp lại"
        >
          <X size={30} strokeWidth={2.5} />
        </button>

        {/* Big Circular Send Button */}
        <button
          onClick={handleSend}
          disabled={sending || (!sendToAll && selectedFriends.length === 0)}
          className="w-[74px] h-[74px] rounded-full bg-[#404044] hover:bg-[#4d4d52] active:scale-95 transition-all flex items-center justify-center shadow-2xl border border-white/5 btn-press disabled:opacity-40 cursor-pointer"
          aria-label="Gửi ảnh"
          title="Gửi ảnh"
        >
          {sending ? (
            <Spinner size={30} className="text-white" />
          ) : (
            <Send
              size={30}
              className="text-white translate-x-[-1px] translate-y-[1px]"
              strokeWidth={2.2}
            />
          )}
        </button>

        {/* Text / Caption Style (Aa✦) - Opens bottom sheet form */}
        <button
          onClick={() => setShowWidgetSheet(true)}
          className="w-12 h-12 flex items-center justify-center active:scale-90 transition-transform btn-press cursor-pointer"
          aria-label="Chọn chú thích"
          title="Chọn chú thích"
        >
          <div className="w-11 h-11 rounded-full border-2 border-white/80 flex items-center justify-center relative">
            <span className="text-white font-bold text-base leading-none select-none">Aa</span>
            <span className="absolute -top-1 -right-1 text-white text-[12px] leading-none select-none font-bold">✦</span>
          </div>
        </button>
      </div>

      {/* ── 5. Recipient / Friends Selector Row ── */}
      <div className="w-full flex-shrink-0 pb-1">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar px-6 py-1 justify-center">
          {/* Tất cả (All Friends) */}
          <button
            onClick={selectAllFriends}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group btn-press cursor-pointer"
          >
            <div
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-all ${
                sendToAll
                  ? 'ring-2 ring-[#E8A020] ring-offset-2 ring-offset-black bg-[#1c1c1e]'
                  : 'ring-1 ring-white/20 bg-[#1c1c1e] opacity-70 group-hover:opacity-100'
              }`}
            >
              <Users
                size={22}
                className={sendToAll ? 'text-[#E8A020]' : 'text-white/80'}
                strokeWidth={2.2}
              />
            </div>
            <span
              className={`text-xs font-semibold tracking-tight transition-colors ${
                sendToAll ? 'text-[#E8A020]' : 'text-white/60'
              }`}
            >
              Tất cả
            </span>
          </button>

          {/* Individual Friends */}
          {friends.map((friend) => {
            const fid = friend.profile?.id || friend.friendId
            const isSelected = !sendToAll && selectedFriends.includes(fid)
            const name = friend.profile?.full_name || friend.profile?.username || 'Bạn'
            const avatarUrl = friend.profile?.avatar_url

            return (
              <button
                key={fid}
                onClick={() => toggleFriend(fid)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 group btn-press cursor-pointer"
              >
                <div
                  className={`w-13 h-13 rounded-full overflow-hidden transition-all flex items-center justify-center bg-dark-700 ${
                    isSelected
                      ? 'ring-2 ring-[#E8A020] ring-offset-2 ring-offset-black'
                      : 'ring-1 ring-white/20 opacity-80 group-hover:opacity-100'
                  }`}
                >
                  <img
                    src={getAvatarUrl(avatarUrl, name)}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span
                  className={`text-xs font-semibold tracking-tight max-w-[64px] truncate transition-colors ${
                    isSelected ? 'text-[#E8A020]' : 'text-white/60'
                  }`}
                >
                  {name}
                </span>
              </button>
            )
          })}

          {/* Add Friend Shortcut if 0 friends */}
          {friends.length === 0 && (
            <button
              onClick={() => navigate('/friends')}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group btn-press cursor-pointer"
            >
              <div className="w-13 h-13 rounded-full flex items-center justify-center ring-1 ring-dashed ring-white/30 bg-[#1c1c1e] text-white/60 group-hover:text-white transition-colors">
                <UserPlus size={20} />
              </div>
              <span className="text-xs text-white/50">Thêm bạn</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 6. Bottom Sheet Form chú thích (Hiển thị từ dưới lên) ── */}
      {showWidgetSheet && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowWidgetSheet(false)}
          />

          {/* Sheet Container */}
          <div
            className="fixed bottom-0 left-0 right-0 z-70 max-w-[430px] mx-auto bg-[#1a1a1c] rounded-t-[36px] p-5 pb-8 border-t border-white/10 shadow-[0_-12px_45px_rgba(0,0,0,0.85)] animate-slide-in-bottom select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div
              className="w-11 h-1.5 rounded-full bg-white/20 mx-auto mb-4 cursor-pointer"
              onClick={() => setShowWidgetSheet(false)}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-white/40 text-xs font-bold tracking-wider uppercase">Chọn kiểu chú thích</span>
              <button
                onClick={() => setShowWidgetSheet(false)}
                className="text-white/60 hover:text-white text-xs font-semibold px-2 py-1 rounded-lg bg-white/5 active:scale-95 transition-all"
              >
                Đóng
              </button>
            </div>

            {/* General Section */}
            <div className="mb-5">
              <h3 className="text-white/70 text-sm font-semibold mb-3 px-1">General</h3>
              <div className="flex flex-wrap gap-2.5">
                {CAPTION_WIDGETS.filter((w) => w.category === 'General').map((w) => {
                  const idx = CAPTION_WIDGETS.findIndex((item) => item.id === w.id)
                  const isSelected = activeWidgetIndex === idx
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        handleWidgetSelect(idx)
                        setShowWidgetSheet(false)
                      }}
                      className={`px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all btn-press cursor-pointer border ${w.sheetBg} ${w.textColor} ${
                        isSelected
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1c] border-white/40 shadow-lg scale-105'
                          : 'border-white/5 hover:border-white/20 opacity-90 hover:opacity-100'
                      }`}
                    >
                      <span className="text-base leading-none">{w.iconText}</span>
                      <span>{w.id === 'text' ? 'Văn bản' : w.pillText}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Decorative Section */}
            <div>
              <h3 className="text-white/70 text-sm font-semibold mb-3 px-1">Decorative</h3>
              <div className="flex flex-wrap gap-2.5">
                {CAPTION_WIDGETS.filter((w) => w.category === 'Decorative').map((w) => {
                  const idx = CAPTION_WIDGETS.findIndex((item) => item.id === w.id)
                  const isSelected = activeWidgetIndex === idx
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        handleWidgetSelect(idx)
                        setShowWidgetSheet(false)
                      }}
                      className={`px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all btn-press cursor-pointer border ${w.sheetBg} ${w.textColor} ${
                        isSelected
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1c] border-white/40 shadow-lg scale-105'
                          : 'border-white/5 hover:border-white/20 opacity-90 hover:opacity-100'
                      }`}
                    >
                      <span className="text-base leading-none">{w.iconText}</span>
                      <span>{w.pillText}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
