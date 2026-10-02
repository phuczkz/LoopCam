import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutGrid, Home, MessageCircle, Share2 } from 'lucide-react'
import { useConversations } from '../../hooks/useMessages'
import toast from 'react-hot-toast'

// 6-dot matrix icon matching Image 1 for Locket Memories
function MemoriesGridIcon({ size = 22, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="8" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="8" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="16" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { totalUnreadCount } = useConversations()

  const isFeed = location.pathname === '/feed'
  const isMemories = location.pathname === '/memories' || location.pathname === '/history'
  const isCamera = location.pathname === '/camera'
  const isMessages = location.pathname.startsWith('/messages')

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LoopCam',
          text: 'Cùng chia sẻ khoảnh khắc với mình trên LoopCam nhé!',
          url: window.location.origin,
        })
      } catch {
        // user cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.origin)
        toast.success('Đã sao chép liên kết LoopCam! 🔗')
      } catch {
        toast('Chia sẻ LoopCam với bạn bè!')
      }
    }
  }

  // ==========================================
  // Giao diện BottomNav khi ở trang FEED (5 nút)
  // ==========================================
  if (isFeed) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom pointer-events-none">
        <div className="max-w-[430px] mx-auto pointer-events-auto px-4 pb-2.5">
          <div
            className="rounded-[36px] px-5 py-2 flex items-center justify-between shadow-2xl"
            style={{
              background: 'rgba(18, 18, 14, 0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* 1. Grid (Trang Feed) */}
            <button
              onClick={() => {
                if (location.pathname !== '/feed') navigate('/feed')
              }}
              className="flex items-center justify-center p-2 btn-press"
              aria-label="Feed dạng lưới"
            >
              <LayoutGrid size={23} className="text-white" strokeWidth={2.5} />
            </button>

            {/* 2. Calendar / Kỷ niệm (Chuyển sang trang Kỉ niệm) */}
            <button
              onClick={() => navigate('/memories')}
              className="flex items-center justify-center p-2 btn-press text-white/40 hover:text-white/70 transition-colors"
              aria-label="Kỷ niệm"
              title="Kỷ niệm"
            >
              <MemoriesGridIcon size={22} />
            </button>

            {/* 3. NÚT TRÒN Ở GIỮA: QUAY LẠI TRANG CAMERA */}
            <button
              onClick={() => navigate('/camera')}
              className="w-13 h-13 rounded-full flex items-center justify-center btn-press border-[3.5px] border-[#E8A020] bg-white shadow-xl shadow-[#E8A020]/25 transition-transform hover:scale-105 active:scale-95"
              aria-label="Quay lại Camera"
              title="Quay lại Camera"
            >
              <div className="w-10 h-10 rounded-full bg-white" />
            </button>

            {/* 4. Chat */}
            <button
              onClick={() => navigate('/messages')}
              className="relative flex items-center justify-center p-2 btn-press text-white/40 hover:text-white/70 transition-colors"
              aria-label="Tin nhắn"
            >
              <MessageCircle size={22} strokeWidth={2} />
              {totalUnreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#F43F5E] ring-2 ring-[#12120e]" />
              )}
            </button>

            {/* 5. Share */}
            <button
              onClick={handleShare}
              className="flex items-center justify-center p-2 btn-press text-white/40 hover:text-white/70 transition-colors"
              aria-label="Chia sẻ"
              title="Chia sẻ LoopCam"
            >
              <Share2 size={21} strokeWidth={2} />
            </button>
          </div>
        </div>
      </nav>
    )
  }

  // ==========================================
  // Giao diện BottomNav 3 nút chuẩn Locket (Ảnh 1)
  // (Dùng cho Camera, Kỷ niệm, Messages, ...)
  // ==========================================
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom pointer-events-none">
      <div className="max-w-[430px] mx-auto pointer-events-auto flex justify-center pb-2.5">
        <div
          className="rounded-full px-3 py-1.5 flex items-center gap-3.5 shadow-2xl"
          style={{
            background: 'rgba(26, 26, 26, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* 1. Icon Lịch / Kỷ niệm bên trái icon Home (Active khi ở trang Kỷ niệm - Ảnh 1) */}
          <button
            onClick={() => navigate('/memories')}
            className={`transition-all btn-press flex items-center justify-center ${
              isMemories
                ? 'w-14 h-10 rounded-full bg-[#383838] text-white shadow-inner'
                : 'w-12 h-10 rounded-full text-white/50 hover:text-white'
            }`}
            aria-label="Kỷ niệm"
            title="Kỷ niệm"
          >
            <MemoriesGridIcon
              size={22}
              className={isMemories ? 'text-white' : 'text-white/50'}
            />
          </button>

          {/* 2. Home icon pill ở giữa (Active khi ở Camera) */}
          <button
            onClick={() => navigate('/camera')}
            className={`transition-all btn-press flex items-center justify-center ${
              isCamera
                ? 'w-14 h-10 rounded-full bg-[#383838] text-white shadow-inner'
                : 'w-12 h-10 rounded-full text-white/50 hover:text-white'
            }`}
            aria-label="Mở Camera"
            title="Mở Camera"
          >
            <Home
              size={21}
              strokeWidth={isCamera ? 2.5 : 2}
              className={isCamera ? 'text-white' : 'text-white/50'}
            />
          </button>

          {/* 3. Icon Chat (Mở Tin nhắn) */}
          <button
            onClick={() => navigate('/messages')}
            className={`relative transition-all btn-press flex items-center justify-center ${
              isMessages
                ? 'w-14 h-10 rounded-full bg-[#383838] text-white shadow-inner'
                : 'w-12 h-10 rounded-full text-white/50 hover:text-white'
            }`}
            aria-label="Tin nhắn"
            title="Tin nhắn"
          >
            <MessageCircle size={22} strokeWidth={isMessages ? 2.5 : 2} />
            {totalUnreadCount > 0 && (
              <span className="absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full bg-[#F43F5E] ring-2 ring-[#1a1a1a]" />
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}
