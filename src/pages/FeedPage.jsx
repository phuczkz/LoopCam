import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { usePosts } from '../hooks/usePosts'
import { useAuth } from '../hooks/useAuth'
import { useFriends } from '../hooks/useFriends'
import { Avatar } from '../components/ui/Avatar'
import {
  Camera,
  ChevronDown,
  Megaphone,
  Smile,
  Trash2,
  Sparkles,
  Users,
  Check,
  MessageCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { encodePostCommentMediaUrl } from '../lib/messageUtils'
import { PhotoReplyModal } from '../components/feed/PhotoReplyModal'

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

function EmptyFeed() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-dark-800 flex items-center justify-center animate-pulse-glow ring-2 ring-white/10">
          <Camera size={40} className="text-white/80" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full gradient-bg flex items-center justify-center shadow-lg">
          <Sparkles size={16} className="text-white" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Chưa có ảnh nào!</h2>
      <p className="text-dark-300 text-sm mb-8 leading-relaxed max-w-[280px]">
        Hãy chụp một bức ảnh để chia sẻ khoảnh khắc với bạn bè hoặc lưu lại nhật ký 📸
      </p>
      <button
        onClick={() => navigate('/camera')}
        className="gradient-bg px-8 py-3.5 rounded-2xl text-white font-bold text-base btn-press shadow-xl shadow-accent-violet/30 flex items-center gap-2"
      >
        <Camera size={20} />
        <span>Chụp ảnh ngay</span>
      </button>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 animate-fade-in">
      <div className="w-full max-w-[360px] aspect-square rounded-[28px] skeleton ring-1 ring-white/10 mb-3" />
      <div className="flex items-center gap-2.5 w-full max-w-[360px] px-2 mb-3">
        <div className="w-6 h-6 rounded-full skeleton" />
        <div className="h-4 w-24 rounded-md skeleton" />
      </div>
      <div className="w-full max-w-[360px] h-12 rounded-full skeleton" />
    </div>
  )
}

export function FeedPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { feed, loading, deletePost } = usePosts()
  const { friends } = useFriends()

  // Filter: 'all' | 'mine' | friend_id
  const [filter, setFilter] = useState('all')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState('none') // 'up' | 'down' | 'none'
  const [loadedImages, setLoadedImages] = useState({})
  const [showHeartBurst, setShowHeartBurst] = useState(false)
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false)
  const lastTapRef = useRef(0)

  // Filtered feed
  const activeFeed = useMemo(() => {
    if (filter === 'all') return feed
    if (filter === 'mine') return feed.filter((p) => p.isMine)
    return feed.filter((p) => p.sender_id === filter)
  }, [feed, filter])

  // Safe index within bounds
  const safeIndex = activeFeed.length > 0
    ? Math.min(Math.max(currentIndex, 0), activeFeed.length - 1)
    : 0

  const currentPost = activeFeed[safeIndex]

  // Filter label
  const filterLabel = useMemo(() => {
    if (filter === 'all') return 'Mọi người'
    if (filter === 'mine') return 'Của tôi'
    const friend = friends.find((f) => f.profile?.id === filter || f.friendId === filter)
    return friend?.profile?.full_name || friend?.profile?.username || 'Bạn bè'
  }, [filter, friends])

  // Navigation handlers (Vertical)
  const goNext = useCallback(() => {
    if (safeIndex < activeFeed.length - 1) {
      setDirection('down')
      setCurrentIndex((prev) => prev + 1)
    }
  }, [safeIndex, activeFeed.length])

  const goPrev = useCallback(() => {
    if (safeIndex > 0) {
      setDirection('up')
      setCurrentIndex((prev) => prev - 1)
    } else {
      // Swipe down on the first photo transitions back to Camera!
      navigate('/camera')
    }
  }, [safeIndex, navigate])

  // Touch Swipe Handling (Vertical Up/Down)
  const touchStartY = useRef(null)
  const touchStartX = useRef(null)

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return
    const diffY = touchStartY.current - e.changedTouches[0].clientY
    const diffX = touchStartX.current - e.changedTouches[0].clientX

    if (Math.abs(diffY) > 40 && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 0) {
        // Swiped UP -> View NEXT photo
        goNext()
      } else {
        // Swiped DOWN -> View PREVIOUS photo (or back to camera if at top)
        goPrev()
      }
    }

    touchStartY.current = null
    touchStartX.current = null
  }

  // Mouse Wheel Handling (Desktop)
  const wheelCooldownRef = useRef(false)
  const handleWheel = (e) => {
    if (wheelCooldownRef.current) return

    if (e.deltaY > 25) {
      wheelCooldownRef.current = true
      goNext()
      setTimeout(() => {
        wheelCooldownRef.current = false
      }, 350)
    } else if (e.deltaY < -25) {
      wheelCooldownRef.current = true
      goPrev()
      setTimeout(() => {
        wheelCooldownRef.current = false
      }, 350)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        goNext()
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        goPrev()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev])

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

  // Send photo comment or reaction attached specifically to the photo
  const handleSendComment = async ({ text, post = currentPost, targetFriendId = null }) => {
    const content = text?.trim()
    if (!content || !user || !post) return

    const isMine = post.isMine
    let recipientId = isMine ? targetFriendId : post.sender_id
    if (!recipientId) {
      if (friends.length > 0) {
        recipientId = friends[0].profile?.id || friends[0].friendId
      } else {
        toast.error('Bạn chưa có bạn bè để gửi bình luận')
        return
      }
    }

    const imageUrl =
      post.signedImageUrl ||
      (post.image_path
        ? supabase.storage.from('photos').getPublicUrl(post.image_path).data?.publicUrl
        : '')

    if (!imageUrl) {
      toast.error('Không tìm thấy ảnh của khoảnh khắc')
      return
    }

    const authorName = isMine
      ? (profile?.full_name || profile?.username || 'Bạn')
      : (post.senderName || 'Bạn bè')
    const authorAvatar = isMine
      ? (profile?.avatar_url || user?.user_metadata?.avatar_url)
      : post.senderAvatar

    const mediaUrl = encodePostCommentMediaUrl({
      imageUrl,
      postId: post.id,
      authorId: post.sender_id,
      authorName,
      authorAvatar,
      postCreatedAt: post.created_at,
      caption: post.caption,
    })

    try {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `msg-${Date.now()}`

      const { error } = await supabase.from('messages').insert({
        id,
        sender_id: user.id,
        receiver_id: recipientId,
        content,
        media_url: mediaUrl,
        is_read: false,
      })

      if (error) throw error

      const friendObj = friends.find(
        (f) => f.profile?.id === recipientId || f.friendId === recipientId
      )
      const recipientDisplayName =
        friendObj?.profile?.full_name || friendObj?.profile?.username || 'bạn bè'

      toast.success(
        (t) => (
          <div className="flex items-center justify-between gap-3 select-none">
            <span>Đã gửi tới {recipientDisplayName}! 💬</span>
            <button
              onClick={() => {
                toast.dismiss(t.id)
                navigate(`/messages/${recipientId}`)
              }}
              className="text-amber-400 font-bold underline text-xs cursor-pointer"
            >
              Xem chat
            </button>
          </div>
        ),
        { duration: 4000 }
      )

      setMessageInput('')
    } catch (err) {
      console.error('Send comment error:', err)
      toast.error('Không thể gửi bình luận. Thử lại sau!')
      throw err
    }
  }

  // Double tap on photo to react with heart
  const handlePhotoDoubleTap = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      setShowHeartBurst(true)
      setTimeout(() => setShowHeartBurst(false), 900)
      handleSendComment({ text: '❤️', post: currentPost })
    }
    lastTapRef.current = now
  }

  // Delete own post
  const handleDelete = async (postId) => {
    if (!postId) return
    const ok = window.confirm('Bạn có chắc chắn muốn xóa khoảnh khắc này?')
    if (!ok) return

    try {
      await deletePost(postId)
      toast.success('Đã xóa khoảnh khắc')
      if (safeIndex >= activeFeed.length - 1 && safeIndex > 0) {
        setCurrentIndex(safeIndex - 1)
      }
    } catch {
      toast.error('Không thể xóa ảnh')
    }
  }

  if (loading && feed.length === 0) {
    return (
      <div className="flex flex-col h-full px-4 pt-3 pb-24 bg-[#12120e]">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-full skeleton" />
          <div className="h-8 w-28 rounded-full skeleton" />
          <div className="w-10 h-10 rounded-full skeleton" />
        </div>
        <FeedSkeleton />
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full px-4 pt-3 pb-24 select-none overflow-hidden bg-[#12120e] relative"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top Bar matching Locket ── */}
      <div className="flex items-center justify-between mb-3 z-30 flex-shrink-0 animate-fade-in relative">
        {/* Left: Megaphone / Announcement */}
        <button
          onClick={() => toast('Tính năng thông báo mới sắp ra mắt! 📢')}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center btn-press text-white/90"
          aria-label="Thông báo"
        >
          <Megaphone size={19} />
        </button>

        {/* Center: "Mọi người ⌵" Filter Pill */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="h-10 px-4 rounded-full bg-white/12 hover:bg-white/20 border border-white/10 flex items-center gap-1.5 btn-press shadow-md"
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
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-56 rounded-2xl bg-[#1c1c1a]/95 backdrop-blur-xl border border-white/15 shadow-2xl p-1.5 z-50 animate-fade-in">
              <button
                onClick={() => {
                  setFilter('all')
                  setCurrentIndex(0)
                  setShowFilterDropdown(false)
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  filter === 'all'
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span>Mọi người</span>
                </div>
                {filter === 'all' && <Check size={16} className="text-[#E8A020]" />}
              </button>

              <button
                onClick={() => {
                  setFilter('mine')
                  setCurrentIndex(0)
                  setShowFilterDropdown(false)
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  filter === 'mine'
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Camera size={16} />
                  <span>Ảnh của tôi</span>
                </div>
                {filter === 'mine' && <Check size={16} className="text-[#E8A020]" />}
              </button>

              {friends.length > 0 && (
                <div className="my-1 border-t border-white/10" />
              )}

              {friends.map((friend) => {
                const friendId = friend.profile?.id || friend.friendId
                const isSelected = filter === friendId
                return (
                  <button
                    key={friendId}
                    onClick={() => {
                      setFilter(friendId)
                      setCurrentIndex(0)
                      setShowFilterDropdown(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
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
                        {friend.profile?.full_name || friend.profile?.username || 'Bạn bè'}
                      </span>
                    </div>
                    {isSelected && <Check size={16} className="text-[#E8A020]" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Current User Avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/20 btn-press"
          aria-label="Trang cá nhân"
        >
          <Avatar
            src={profile?.avatar_url || user?.user_metadata?.avatar_url}
            alt={profile?.full_name || 'Me'}
            size={40}
          />
        </button>
      </div>

      {/* Backdrop click to close dropdown */}
      {showFilterDropdown && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowFilterDropdown(false)}
        />
      )}

      {/* ── Main Content Area ── */}
      {activeFeed.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full max-w-[380px] mx-auto">
          {/* ── Photo Card matching Locket ── */}
          <div
            key={currentPost?.id || safeIndex}
            onClick={handlePhotoDoubleTap}
            className={`relative w-full aspect-square rounded-[32px] overflow-hidden bg-dark-800 shadow-2xl ring-1 ring-white/10 ${
              direction === 'down'
                ? 'animate-slide-up'
                : direction === 'up'
                ? 'animate-slide-down'
                : 'animate-fade-in'
            }`}
          >
            {/* Loading skeleton */}
            {!loadedImages[currentPost?.id] && (
              <div className="absolute inset-0 skeleton rounded-[32px] z-0" />
            )}

            {/* Photo Image */}
            {currentPost?.signedImageUrl ? (
              <img
                src={currentPost.signedImageUrl}
                alt={currentPost.caption || 'Khoảnh khắc'}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  loadedImages[currentPost.id] ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() =>
                  setLoadedImages((prev) => ({ ...prev, [currentPost.id]: true }))
                }
                onError={(e) => handleImageError(e, currentPost)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-dark-800 text-white/50">
                <Camera size={36} className="mb-2 opacity-50" />
                <p className="text-xs">Không thể tải ảnh</p>
              </div>
            )}

            {/* Double Tap Heart Burst Animation */}
            {showHeartBurst && (
              <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none animate-ping">
                <span className="text-6xl drop-shadow-2xl">❤️</span>
              </div>
            )}

            {/* ── Iconic Floating Caption Pill inside Photo ── */}
            {currentPost?.caption && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 px-4 pointer-events-none">
                <div
                  className="px-4 py-1.5 rounded-full text-white text-sm font-semibold shadow-lg text-center max-w-[88%] truncate backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(130, 100, 40, 0.88)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  {currentPost.caption}
                </div>
              </div>
            )}

            {/* Comment button on photo */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsReplyModalOpen(true)
              }}
              className="absolute bottom-3.5 right-3.5 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 active:scale-95 text-white/90 flex items-center justify-center btn-press z-20 border border-white/10 shadow-lg cursor-pointer"
              title="Bình luận ảnh này"
              aria-label="Bình luận ảnh"
            >
              <MessageCircle size={18} />
            </button>

            {/* Delete button if user's own post */}
            {currentPost?.isMine && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(currentPost?.id)
                }}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md hover:bg-red-500/30 text-white/80 hover:text-red-400 flex items-center justify-center btn-press z-20 border border-white/10"
                title="Xóa khoảnh khắc"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          {/* ── Author & Time directly under photo ── */}
          <div className="flex items-center justify-center gap-2 mt-3 mb-2.5 z-10">
            <Avatar
              src={
                currentPost?.isMine
                  ? (profile?.avatar_url || currentPost?.senderAvatar)
                  : currentPost?.senderAvatar
              }
              alt={currentPost?.senderName}
              size={24}
              className="ring-1 ring-white/20"
            />
            <span className="text-white text-sm font-bold tracking-tight">
              {currentPost?.senderName || 'Bạn bè'}
            </span>
            <span className="text-white/50 text-xs font-normal">
              {formatLocketTime(currentPost?.created_at)}
            </span>
          </div>

          {/* ── Message / Quick Reaction Bar directly below ── */}
          <div className="w-full flex items-center bg-[#202020] rounded-full h-12 px-3.5 border border-white/5 shadow-lg z-10 mt-1">
            <button
              type="button"
              onClick={() => setIsReplyModalOpen(true)}
              className="flex-1 flex items-center min-w-0 text-left text-white/40 text-sm hover:text-white/70 transition-colors cursor-pointer py-2 pl-1"
            >
              <MessageCircle size={17} className="mr-2 text-white/40 flex-shrink-0" />
              <span className="truncate">
                {currentPost?.isMine
                  ? 'Gửi tin nhắn về ảnh này...'
                  : `Trả lời ${currentPost?.senderName || 'bạn bè'}...`}
              </span>
            </button>

            {/* Quick Emoji Reactions matching screenshot */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => handleSendComment({ text: '🍲', post: currentPost })}
                className="text-lg hover:scale-125 transition-transform btn-press p-1 cursor-pointer"
                aria-label="Thả emoji lẩu"
              >
                🍲
              </button>
              <button
                onClick={() => handleSendComment({ text: '🥄', post: currentPost })}
                className="text-lg hover:scale-125 transition-transform btn-press p-1 cursor-pointer"
                aria-label="Thả emoji thìa"
              >
                🥄
              </button>
              <button
                onClick={() => handleSendComment({ text: '🫶', post: currentPost })}
                className="text-lg hover:scale-125 transition-transform btn-press p-1 cursor-pointer"
                aria-label="Thả emoji trái tim tay"
              >
                🫶
              </button>
              <button
                onClick={() => setIsReplyModalOpen(true)}
                className="p-1 text-white/50 hover:text-white transition-colors btn-press cursor-pointer"
                aria-label="Thêm bình luận"
              >
                <Smile size={19} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Comment Reply Modal (Screenshot 1 Style) ── */}
      <PhotoReplyModal
        isOpen={isReplyModalOpen}
        post={currentPost}
        currentUser={user}
        currentProfile={profile}
        friends={friends}
        onClose={() => setIsReplyModalOpen(false)}
        onSend={handleSendComment}
      />
    </div>
  )
}
