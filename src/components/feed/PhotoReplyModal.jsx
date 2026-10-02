import { useState, useRef, useEffect } from 'react'
import { X, ArrowUp } from 'lucide-react'
import { Avatar } from '../ui/Avatar'

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '🥹', '🫶', '👍']

export function PhotoReplyModal({
  isOpen,
  post,
  currentUser,
  currentProfile,
  friends = [],
  onClose,
  onSend,
}) {
  const [commentText, setCommentText] = useState('')
  const [selectedFriendId, setSelectedFriendId] = useState(() => {
    if (friends.length > 0) {
      return friends[0].profile?.id || friends[0].friendId
    }
    return null
  })
  const [sending, setSending] = useState(false)
  const inputRef = useRef(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen || !post) return null

  // Author details
  const isMine = post.isMine
  const authorName = isMine
    ? (currentProfile?.full_name || 'Bạn')
    : (post.senderName || 'Bạn bè')
  const authorAvatar = isMine
    ? (currentProfile?.avatar_url || currentUser?.user_metadata?.avatar_url)
    : post.senderAvatar

  // Target friend (if mine, pick from friends; if friend's post, target is friend)
  const targetFriend = isMine
    ? friends.find(
        (f) =>
          f.profile?.id === selectedFriendId || f.friendId === selectedFriendId
      )
    : null
  const targetName = isMine
    ? (targetFriend?.profile?.full_name || 'Bạn bè')
    : authorName

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const trimmed = commentText.trim()
    if (!trimmed || sending) return

    setSending(true)
    try {
      await onSend({
        text: trimmed,
        post,
        targetFriendId: isMine ? selectedFriendId : post.sender_id,
      })
      onClose()
    } catch (err) {
      console.error('PhotoReplyModal submit error:', err)
    } finally {
      setSending(false)
    }
  }

  const handleEmojiClick = (emoji) => {
    setCommentText((prev) => prev + emoji)
    inputRef.current?.focus()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-2xl px-4 pt-3 pb-6 animate-fade-in select-none"
      onClick={onClose}
    >
      {/* ── Top Header with Close Button ── */}
      <div className="flex items-center justify-between w-full max-w-[420px] mx-auto z-10">
        <div className="w-10" />
        <span className="text-xs font-semibold text-white/50 tracking-wider uppercase">
          Bình luận khoảnh khắc
        </span>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>
      </div>

      {/* ── Center Content: Photo + Author + Input (Matching Screenshot 1) ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center max-w-[360px] w-full mx-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo Card Preview */}
        <div className="relative w-full aspect-square rounded-[30px] overflow-hidden bg-dark-800 shadow-2xl ring-1 ring-white/15 mb-3.5">
          <img
            src={post.signedImageUrl}
            alt={post.caption || 'Khoảnh khắc'}
            className="w-full h-full object-cover"
          />

          {/* Floating Caption inside Photo if any */}
          {post.caption && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center px-4 pointer-events-none">
              <div
                className="px-3.5 py-1 rounded-full text-white text-xs font-semibold shadow-lg text-center max-w-[90%] truncate backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(130, 100, 40, 0.88)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                }}
              >
                {post.caption}
              </div>
            </div>
          )}
        </div>

        {/* Author Avatar + "Đang trả lời [Name]" (Screenshot 1 Style) */}
        <div className="flex flex-col items-center mb-3">
          <Avatar
            src={authorAvatar}
            alt={authorName}
            size={38}
            className="ring-2 ring-white/20 shadow-md mb-1.5"
          />
          <p className="text-[12px] text-white/55 font-medium leading-none">
            Đang trả lời
          </p>
          <p className="text-base font-bold text-white tracking-tight mt-0.5">
            {authorName}
          </p>
        </div>

        {/* If own post, choose friend recipient */}
        {isMine && friends.length > 0 && (
          <div className="w-full mb-3 px-1">
            <p className="text-[11px] text-white/60 text-center mb-1.5 font-medium">
              Gửi tin nhắn kèm ảnh này tới:
            </p>
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
              {friends.map((f) => {
                const fId = f.profile?.id || f.friendId
                const isSelected = selectedFriendId === fId
                return (
                  <button
                    key={fId}
                    type="button"
                    onClick={() => setSelectedFriendId(fId)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#CCFF00] text-black border-[#CCFF00] font-extrabold shadow-md'
                        : 'bg-white/10 text-white/80 border-white/15 hover:bg-white/15'
                    }`}
                  >
                    <Avatar src={f.profile?.avatar_url} size={16} />
                    <span className="text-xs truncate max-w-[90px]">
                      {f.profile?.full_name || f.profile?.username || 'Bạn'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Input Pill Bar (Screenshot 1 Style) */}
        <form
          onSubmit={handleSubmit}
          className="w-full bg-[#242426] border border-white/12 rounded-full h-12 px-3.5 flex items-center gap-2 shadow-xl focus-within:border-white/30 transition-all"
        >
          <input
            ref={inputRef}
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={`Trả lời ${targetName}...`}
            className="flex-1 bg-transparent text-white placeholder-white/35 text-sm focus:outline-none min-w-0 pr-1"
          />

          {/* Upward Arrow Send Button (Screenshot 1 Style) */}
          <button
            type="submit"
            disabled={!commentText.trim() || sending}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              commentText.trim()
                ? 'bg-white hover:bg-white/90 text-black shadow-md scale-100 active:scale-95'
                : 'bg-white/15 text-white/40 cursor-not-allowed'
            }`}
            aria-label="Gửi bình luận"
          >
            <ArrowUp size={18} strokeWidth={2.6} />
          </button>
        </form>

        {/* Photo Caption displayed below input (Screenshot 1 Style: "Má kh dám ngủ 🥹🥹🥹") */}
        {post.caption && (
          <p className="text-white/60 text-xs mt-2.5 text-center truncate max-w-[90%] font-medium">
            {post.caption}
          </p>
        )}

        {/* Quick Emoji Strip */}
        <div className="flex items-center justify-center gap-2 mt-3.5">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="text-lg hover:scale-125 active:scale-90 transition-transform cursor-pointer p-1"
              aria-label={`Thêm ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* ── Footer Hint ── */}
      <div className="w-full text-center z-10">
        <p className="text-[11px] text-white/40">
          Nhấn Enter hoặc biểu tượng ↑ để gửi vào cuộc trò chuyện
        </p>
      </div>
    </div>
  )
}
