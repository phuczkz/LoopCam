import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosts } from '../hooks/usePosts'
import { useAuth } from '../hooks/useAuth'
import { useFriends } from '../hooks/useFriends'
import { Avatar } from '../components/ui/Avatar'
import { FriendRequestBadge } from '../components/ui/FriendRequestBadge'
import {
  Megaphone,
  ChevronDown,
  Check,
  Users,
  Camera,
  Sparkles,
  X,
  Download,
  Share2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Format relative time like Locket ("11g", "5p", "1d", "vừa xong")
function formatLocketTime(dateStr) {
  if (!dateStr) return 'vừa xong'
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return 'vừa xong'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}p`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}g`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}

// Format detailed date for modal
function formatFullDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day} thg ${month}, ${year} lúc ${hours}:${minutes}`
}

export function AllPhotosPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { feed, loading, deletePost } = usePosts()
  const { friends, pendingReceivedCount } = useFriends()

  // Filter: 'all' | 'mine' | friend_id
  const [filter, setFilter] = useState('all')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [loadedImages, setLoadedImages] = useState({})

  // Photo viewer modal state
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null)
  const touchStartX = useRef(null)

  // Filtered photos
  const activePhotos = useMemo(() => {
    if (filter === 'all') return feed
    if (filter === 'mine') return feed.filter((p) => p.isMine)
    return feed.filter((p) => p.sender_id === filter)
  }, [feed, filter])

  // Count photos for each filter option
  const photoCounts = useMemo(() => {
    const counts = {
      all: feed.length,
      mine: feed.filter((p) => p.isMine).length,
    }
    friends.forEach((friend) => {
      const fId = friend.profile?.id || friend.friendId
      counts[fId] = feed.filter((p) => p.sender_id === fId).length
    })
    return counts
  }, [feed, friends])

  // Current filter label
  const filterLabel = useMemo(() => {
    if (filter === 'all') return 'Mọi người'
    if (filter === 'mine') return 'Ảnh của tôi'
    const friend = friends.find(
      (f) => f.profile?.id === filter || f.friendId === filter
    )
    return friend?.profile?.full_name || friend?.profile?.username || 'Bạn bè'
  }, [filter, friends])

  // Current active post in modal viewer
  const currentModalPost =
    selectedPhotoIndex !== null ? activePhotos[selectedPhotoIndex] : null

  // Keyboard navigation for modal
  useEffect(() => {
    if (selectedPhotoIndex === null) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedPhotoIndex(null)
      if (e.key === 'ArrowRight' && selectedPhotoIndex < activePhotos.length - 1) {
        setSelectedPhotoIndex((i) => i + 1)
      }
      if (e.key === 'ArrowLeft' && selectedPhotoIndex > 0) {
        setSelectedPhotoIndex((i) => i - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPhotoIndex, activePhotos.length])

  // Image load fallback
  const handleImageError = (e, post) => {
    if (!post?.image_path) return
    const { data } = supabase.storage.from('photos').getPublicUrl(post.image_path)
    if (data?.publicUrl && e.target.src !== data.publicUrl) {
      e.target.src = data.publicUrl
      return
    }
    setLoadedImages((prev) => ({ ...prev, [post.id]: true }))
  }

  // Download photo
  const handleDownload = async (post) => {
    if (!post?.signedImageUrl) return
    try {
      const response = await fetch(post.signedImageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `LoopCam_${post.id.slice(0, 8)}.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Đã tải ảnh về máy!')
    } catch {
      window.open(post.signedImageUrl, '_blank')
    }
  }

  // Share photo
  const handleShare = async (post) => {
    if (!post?.signedImageUrl) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LoopCam Photo',
          text: post.caption || 'Khoảnh khắc trên LoopCam!',
          url: post.signedImageUrl,
        })
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(post.signedImageUrl)
      toast.success('Đã sao chép liên kết ảnh!')
    }
  }

  // Delete photo (if user's own)
  const handleDelete = async (postId) => {
    if (window.confirm('Bạn có chắc muốn xóa ảnh này?')) {
      try {
        await deletePost(postId)
        toast.success('Đã xóa ảnh thành công')
        if (activePhotos.length <= 1) {
          setSelectedPhotoIndex(null)
        } else {
          setSelectedPhotoIndex((prev) =>
            prev >= activePhotos.length - 1 ? Math.max(0, prev - 1) : prev
          )
        }
      } catch (err) {
        toast.error('Không thể xóa ảnh: ' + (err.message || 'Lỗi không xác định'))
      }
    }
  }

  // Jump to FeedPage focused on this post
  const handleJumpToFeed = (post) => {
    navigate('/feed', { state: { initialPostId: post.id } })
  }

  // Touch swipe handlers for modal
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    if (diffX > 50 && selectedPhotoIndex < activePhotos.length - 1) {
      // Swipe left -> Next photo
      setSelectedPhotoIndex((i) => i + 1)
    } else if (diffX < -50 && selectedPhotoIndex > 0) {
      // Swipe right -> Prev photo
      setSelectedPhotoIndex((i) => i - 1)
    }
    touchStartX.current = null
  }

  return (
    <div className="relative flex flex-col h-full bg-[#12120e] select-none overflow-hidden">
      {/* ── Top Bar matching Reference UI ── */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 z-30 flex-shrink-0 relative">
        {/* Left: Speaker / Megaphone icon */}
        <button
          onClick={() => toast('Tính năng thông báo mới sắp ra mắt!')}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 flex items-center justify-center text-white/90 btn-press cursor-pointer transition-colors shadow-sm"
          aria-label="Thông báo"
          title="Thông báo"
        >
          <Megaphone size={19} />
        </button>

        {/* Center: "Mọi người ⌵" Filter Pill */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="h-10 px-4 rounded-full bg-[#242422]/90 hover:bg-[#2c2c28] border border-white/10 flex items-center gap-1.5 btn-press shadow-md cursor-pointer transition-colors"
            aria-label="Chọn đối tượng xem"
          >
            <span className="text-sm font-bold text-white tracking-wide">
              {filterLabel}
            </span>
            <ChevronDown
              size={16}
              className={`text-white/70 transition-transform duration-200 ${
                showFilterDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Filter Dropdown Menu */}
          {showFilterDropdown && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-60 rounded-2xl bg-[#1c1c1a]/95 backdrop-blur-xl border border-white/15 shadow-2xl p-1.5 z-50 animate-fade-in">
              <button
                onClick={() => {
                  setFilter('all')
                  setShowFilterDropdown(false)
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users size={16} />
                  <span>Mọi người</span>
                  <span className="text-xs text-white/40 font-normal">
                    ({photoCounts.all || 0})
                  </span>
                </div>
                {filter === 'all' && (
                  <Check size={16} className="text-[#CCFF00]" />
                )}
              </button>

              <button
                onClick={() => {
                  setFilter('mine')
                  setShowFilterDropdown(false)
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  filter === 'mine'
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Camera size={16} />
                  <span>Ảnh của tôi</span>
                  <span className="text-xs text-white/40 font-normal">
                    ({photoCounts.mine || 0})
                  </span>
                </div>
                {filter === 'mine' && (
                  <Check size={16} className="text-[#CCFF00]" />
                )}
              </button>

              {friends.length > 0 && (
                <div className="my-1 border-t border-white/10" />
              )}

              {friends.map((friend) => {
                const friendId = friend.profile?.id || friend.friendId
                const isSelected = filter === friendId
                const count = photoCounts[friendId] || 0
                return (
                  <button
                    key={friendId}
                    onClick={() => {
                      setFilter(friendId)
                      setShowFilterDropdown(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={friend.profile?.avatar_url}
                        alt={friend.profile?.full_name}
                        size={22}
                      />
                      <span className="truncate">
                        {friend.profile?.full_name ||
                          friend.profile?.username ||
                          'Bạn bè'}
                      </span>
                      <span className="text-xs text-white/40 font-normal flex-shrink-0">
                        ({count})
                      </span>
                    </div>
                    {isSelected && (
                      <Check size={16} className="text-[#CCFF00]" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Current User Avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="relative w-10 h-10 rounded-full ring-2 ring-white/20 btn-press cursor-pointer flex items-center justify-center transition-transform hover:scale-105"
          aria-label="Trang cá nhân"
        >
          <Avatar
            src={profile?.avatar_url || user?.user_metadata?.avatar_url}
            alt={profile?.full_name || 'Me'}
            size={40}
          />
          <FriendRequestBadge count={pendingReceivedCount} />
        </button>
      </div>

      {/* Backdrop click to close dropdown */}
      {showFilterDropdown && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowFilterDropdown(false)}
        />
      )}

      {/* ── Main Photo Grid Content ── */}
      <div className="flex-1 overflow-y-auto px-3 pt-1 pb-28 no-scrollbar">
        {loading && feed.length === 0 ? (
          // Skeleton loading grid
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="w-full aspect-square rounded-[20px] skeleton ring-1 ring-white/10"
              />
            ))}
          </div>
        ) : activePhotos.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full min-h-[360px] text-center px-6 animate-fade-in select-none">
            <div className="w-18 h-18 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-xl">
              <Camera size={32} className="text-white/60" strokeWidth={1.8} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5">
              {filter === 'mine'
                ? 'Bạn chưa có ảnh nào'
                : 'Chưa có ảnh nào'}
            </h3>
            <p className="text-white/50 text-xs mb-6 max-w-[240px] leading-relaxed">
              {filter === 'mine'
                ? 'Hãy chụp một bức ảnh để lưu lại khoảnh khắc đầu tiên của bạn.'
                : 'Chụp ảnh và chia sẻ ngay cùng bạn bè trên LoopCam.'}
            </p>
            <button
              onClick={() => navigate('/camera')}
              className="bg-[#CCFF00] hover:bg-[#b8e600] active:scale-95 text-black font-extrabold text-sm px-6 py-3 rounded-full shadow-lg shadow-[#CCFF00]/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles size={16} strokeWidth={2.5} />
              <span>Chụp ảnh ngay</span>
            </button>
          </div>
        ) : (
          // 3-Column Photos Grid matching Reference UI
          <div className="grid grid-cols-3 gap-2.5">
            {activePhotos.map((post, idx) => {
              const isLoaded = loadedImages[post.id]
              return (
                <div
                  key={post.id}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className="relative aspect-square rounded-[20px] overflow-hidden bg-[#1c1c1e] ring-1 ring-white/10 cursor-pointer active:scale-95 transition-transform duration-150 group shadow-md"
                >
                  {/* Loading skeleton */}
                  {!isLoaded && (
                    <div className="absolute inset-0 skeleton rounded-[20px] z-0" />
                  )}

                  {/* Photo image */}
                  {post.signedImageUrl ? (
                    <img
                      src={post.signedImageUrl}
                      alt={post.caption || 'Khoảnh khắc'}
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        isLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                      onLoad={() =>
                        setLoadedImages((prev) => ({ ...prev, [post.id]: true }))
                      }
                      onError={(e) => handleImageError(e, post)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-dark-800 text-white/40">
                      <Camera size={24} className="opacity-40" />
                    </div>
                  )}

                  {/* Subtle dark gradient overlay on tap */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 group-active:bg-black/20 transition-colors pointer-events-none" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Photo Detail Viewer Modal ── */}
      {currentModalPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-fade-in select-none"
          onClick={() => setSelectedPhotoIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="relative w-full max-w-[390px] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="w-full flex items-center justify-between mb-3 px-1 text-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  src={
                    currentModalPost.isMine
                      ? profile?.avatar_url || currentModalPost.senderAvatar
                      : currentModalPost.senderAvatar
                  }
                  alt={currentModalPost.senderName}
                  size={32}
                  className="ring-1 ring-white/20 flex-shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate">
                    {currentModalPost.senderName || 'Bạn bè'}
                  </span>
                  <span className="text-[11px] text-white/50 truncate">
                    {formatFullDate(currentModalPost.created_at)}
                  </span>
                </div>
              </div>

              {/* Action buttons on top */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleShare(currentModalPost)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-transform flex items-center justify-center text-white cursor-pointer"
                  title="Chia sẻ"
                  aria-label="Chia sẻ"
                >
                  <Share2 size={17} />
                </button>
                <button
                  onClick={() => handleDownload(currentModalPost)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-transform flex items-center justify-center text-white cursor-pointer"
                  title="Tải về máy"
                  aria-label="Tải về"
                >
                  <Download size={17} />
                </button>
                {currentModalPost.isMine && (
                  <button
                    onClick={() => handleDelete(currentModalPost.id)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500/20 active:scale-90 transition-transform flex items-center justify-center text-white hover:text-red-400 cursor-pointer"
                    title="Xóa ảnh"
                    aria-label="Xóa ảnh"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedPhotoIndex(null)}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 transition-transform flex items-center justify-center text-white ml-0.5 cursor-pointer"
                  title="Đóng"
                  aria-label="Đóng"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            {/* Main Photo Card */}
            <div className="relative w-full aspect-square rounded-[32px] overflow-hidden bg-[#181818] shadow-2xl ring-1 ring-white/15">
              <img
                src={currentModalPost.signedImageUrl}
                alt={currentModalPost.caption || 'Khoảnh khắc'}
                className="w-full h-full object-cover select-none pointer-events-none"
              />

              {/* Caption banner pill inside photo (Locket style) */}
              {currentModalPost.caption && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4 pointer-events-none z-10">
                  <div
                    className="px-4 py-1.5 rounded-full text-white text-sm font-semibold shadow-lg text-center max-w-[88%] truncate backdrop-blur-md"
                    style={{
                      backgroundColor: 'rgba(130, 100, 40, 0.88)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    {currentModalPost.caption}
                  </div>
                </div>
              )}

              {/* Navigation arrows */}
              {activePhotos.length > 1 && (
                <>
                  {selectedPhotoIndex > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPhotoIndex((i) => i - 1)
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 active:scale-90 transition-transform cursor-pointer z-20 border border-white/10"
                      aria-label="Ảnh trước"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  {selectedPhotoIndex < activePhotos.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPhotoIndex((i) => i + 1)
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 active:scale-90 transition-transform cursor-pointer z-20 border border-white/10"
                      aria-label="Ảnh tiếp theo"
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="w-full flex items-center justify-between gap-3 mt-3.5 px-1">
              {/* Photo position indicator */}
              <div className="text-white/40 text-xs font-semibold">
                {selectedPhotoIndex + 1} / {activePhotos.length}
              </div>

              {/* "Xem trên Feed" Button */}
              <button
                onClick={() => handleJumpToFeed(currentModalPost)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#CCFF00] hover:bg-[#b8e600] active:scale-95 text-black font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <MessageCircle size={15} strokeWidth={2.4} />
                <span>Xem trên Feed & Bình luận</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
