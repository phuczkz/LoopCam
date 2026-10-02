import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, MessageCircle } from 'lucide-react'
import { useConversations } from '../../hooks/useMessages'

// Calendar / Memories 6-dot matrix icon matching Locket Memories
function MemoriesGridIcon({ size = 21, className = '' }) {
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

// 4 rounded square rings icon matching the user's attached image (chuyển tới AllPhotosPage)
function FourSquaresGridIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="2" />
      <rect x="13" y="4.5" width="6.5" height="6.5" rx="2" />
      <rect x="4.5" y="13" width="6.5" height="6.5" rx="2" />
      <rect x="13" y="13" width="6.5" height="6.5" rx="2" />
    </svg>
  )
}

// Kích thước các nút trong BottomNav để đảm bảo vòng border luôn là hình tròn hoàn hảo bao quanh icon
const TAB_SIZE = 44 // 44px x 44px (w-11 h-11)
const TAB_GAP = 8   // 8px (gap-2)
const PADDING = 6   // 6px (p-1.5)
const STRIDE = TAB_SIZE + TAB_GAP // 52px

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { totalUnreadCount } = useConversations()

  const isFeed = location.pathname === '/feed'
  const isMemories = location.pathname === '/memories' || location.pathname === '/history'
  const isCamera = location.pathname === '/camera'
  const isMessages = location.pathname.startsWith('/messages')

  // Xác định vị trí tab active (0: Kỷ niệm, 1: Camera, 2: Tin nhắn)
  const activeIndex = useMemo(() => {
    if (isMemories) return 0
    if (isCamera) return 1
    if (isMessages) return 2
    return -1
  }, [isMemories, isCamera, isMessages])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom pointer-events-none select-none">
      <div className="max-w-[430px] mx-auto pointer-events-auto px-4 pb-2.5 relative flex items-center justify-center">
        {/* Nút 4 ô vuông tròn độc lập nằm bên trái ngoài BottomNav (trang Feed) */}
        {isFeed && (
          <button
            onClick={() => navigate('/all-photos')}
            className="absolute left-4 w-12 h-12 rounded-full flex items-center justify-center btn-press shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer text-white/80 hover:text-white"
            style={{
              background: 'rgba(26, 26, 26, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
            aria-label="Tất cả ảnh"
            title="Tất cả ảnh"
          >
            <FourSquaresGridIcon size={20} />
          </button>
        )}

        {/* Thanh BottomNav 3 icon chuẩn Locket (Lịch, Home/Camera, Tin nhắn) */}
        <div
          className="relative rounded-full p-1.5 flex items-center gap-2 shadow-2xl"
          style={{
            background: 'rgba(26, 26, 26, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* ── Vòng tròn border xám trượt mượt mà (Bo tròn hoàn hảo 100% bao quanh icon) ── */}
          <div
            className="absolute rounded-full pointer-events-none z-0"
            style={{
              top: `${PADDING}px`,
              left: `${PADDING}px`,
              width: `${TAB_SIZE}px`,
              height: `${TAB_SIZE}px`,
              backgroundColor: '#383838',
              border: '1.5px solid rgba(255, 255, 255, 0.18)',
              boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.1), 0 2px 6px rgba(0, 0, 0, 0.25)',
              transform: `translateX(${activeIndex >= 0 ? activeIndex * STRIDE : STRIDE}px) scale(${
                activeIndex >= 0 ? 1 : 0.8
              })`,
              opacity: activeIndex >= 0 ? 1 : 0,
              transition:
                'transform 300ms cubic-bezier(0.34, 1.25, 0.64, 1), opacity 200ms ease, scale 200ms ease',
            }}
          />

          {/* 1. Icon Lịch (Kỷ niệm -> chuyển đến MemoriesPage) */}
          <button
            onClick={() => navigate('/memories')}
            className="relative z-10 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200 btn-press"
            aria-label="Kỷ niệm"
            title="Kỷ niệm"
          >
            <MemoriesGridIcon
              size={21}
              className={`transition-colors duration-200 ${
                isMemories ? 'text-white' : 'text-white/50 hover:text-white'
              }`}
            />
          </button>

          {/* 2. Home icon ở giữa (Mở Camera) */}
          <button
            onClick={() => navigate('/camera')}
            className="relative z-10 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200 btn-press"
            aria-label="Mở Camera"
            title="Mở Camera"
          >
            <Home
              size={21}
              strokeWidth={isCamera ? 2.5 : 2}
              className={`transition-colors duration-200 ${
                isCamera ? 'text-white' : 'text-white/50 hover:text-white'
              }`}
            />
          </button>

          {/* 3. Icon Chat (Mở Tin nhắn) */}
          <button
            onClick={() => navigate('/messages')}
            className="relative z-10 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200 btn-press"
            aria-label="Tin nhắn"
            title="Tin nhắn"
          >
            <MessageCircle
              size={21}
              strokeWidth={isMessages ? 2.5 : 2}
              className={`transition-colors duration-200 ${
                isMessages ? 'text-white' : 'text-white/50 hover:text-white'
              }`}
            />
            {totalUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#F43F5E] ring-2 ring-[#1a1a1a]" />
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}
