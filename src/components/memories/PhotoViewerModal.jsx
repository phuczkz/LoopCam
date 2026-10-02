import { useEffect, useState } from 'react'
import { X, Download, Trash2, ChevronLeft, ChevronRight, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Helper to format date in Vietnamese e.g. "Ngày 20 tháng 9, 2026 • 14:15"
function formatDetailDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day} tháng ${month}, ${year} • ${hours}:${minutes}`
}

export function PhotoViewerModal({
  posts = [],
  initialIndex = 0,
  dateKey,
  onClose,
  onDelete,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const currentPost = posts[currentIndex] || posts[0]

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && currentIndex < posts.length - 1) {
        setCurrentIndex((i) => i + 1)
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((i) => i - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, posts.length, onClose])

  if (!currentPost) return null

  const handleDownload = async () => {
    try {
      const response = await fetch(currentPost.signedImageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `LoopCam_Memory_${dateKey || 'photo'}.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Đã tải ảnh về máy!')
    } catch {
      window.open(currentPost.signedImageUrl, '_blank')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kỷ niệm LoopCam',
          text: currentPost.caption || 'Khoảnh khắc đáng nhớ!',
          url: currentPost.signedImageUrl,
        })
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(currentPost.signedImageUrl)
      toast.success('Đã sao chép liên kết ảnh!')
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (window.confirm('Bạn có chắc muốn xóa bức ảnh kỷ niệm này?')) {
      try {
        await onDelete(currentPost.id)
        toast.success('Đã xóa ảnh kỷ niệm')
        if (posts.length <= 1) {
          onClose()
        } else {
          setCurrentIndex((i) => Math.max(0, i - 1))
        }
      } catch {
        toast.error('Không thể xóa ảnh lúc này')
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[390px] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar with Close & Date */}
        <div className="w-full flex items-center justify-between mb-3 px-1 text-white">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-white/90">
              {formatDetailDate(currentPost.created_at)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-transform flex items-center justify-center text-white"
              title="Chia sẻ"
            >
              <Share2 size={18} />
            </button>
            <button
              onClick={handleDownload}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-transform flex items-center justify-center text-white"
              title="Tải về"
            >
              <Download size={18} />
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500/20 active:scale-90 transition-transform flex items-center justify-center text-white hover:text-red-400"
                title="Xóa ảnh"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 transition-transform flex items-center justify-center text-white ml-1"
              title="Đóng"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Center: Photo Card */}
        <div className="relative w-full aspect-square rounded-[32px] overflow-hidden bg-[#181818] shadow-2xl ring-1 ring-white/15">
          <img
            src={currentPost.signedImageUrl}
            alt="Kỷ niệm"
            className="w-full h-full object-cover select-none pointer-events-none"
          />

          {/* Caption banner if exists */}
          {currentPost.caption && (
            <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
              <div className="px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 text-white text-sm font-medium shadow-lg max-w-[90%] text-center">
                {currentPost.caption}
              </div>
            </div>
          )}

          {/* Navigation arrows for multiple photos */}
          {posts.length > 1 && (
            <>
              {currentIndex > 0 && (
                <button
                  onClick={() => setCurrentIndex((i) => i - 1)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 active:scale-90 transition-transform"
                >
                  <ChevronLeft size={22} />
                </button>
              )}
              {currentIndex < posts.length - 1 && (
                <button
                  onClick={() => setCurrentIndex((i) => i + 1)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 active:scale-90 transition-transform"
                >
                  <ChevronRight size={22} />
                </button>
              )}
            </>
          )}
        </div>

        {/* Dots indicator if multiple photos on that date */}
        {posts.length > 1 && (
          <div className="flex items-center gap-1.5 mt-3">
            {posts.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
