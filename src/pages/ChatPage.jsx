import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useChat } from '../hooks/useMessages'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from '../components/ui/Avatar'
import { Spinner } from '../components/ui/Spinner'
import { formatChatDivider } from '../lib/dateUtils'
import { parseMessageMedia, formatPostCommentDate } from '../lib/messageUtils'
import { PhotoViewerModal } from '../components/memories/PhotoViewerModal'
import {
  ChevronLeft,
  ChevronRight,
  Send,
  ImagePlus,
  X,
  Smile,
} from 'lucide-react'
import toast from 'react-hot-toast'

const QUICK_EMOJIS = ['💛', '🔥', '😍']
const EXTRA_EMOJIS = ['😂', '🥺', '🎉', '👍', '👏', '👀', '💯', '✨', '💀', '🥰']

export function ChatPage() {
  const { friendId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const initialFriendProfile = location.state?.friendProfile || null
  const {
    messages,
    friendProfile,
    loading,
    sending,
    uploadingImage,
    sendMessage,
    sendQuickEmoji,
  } = useChat(friendId, initialFriendProfile)

  const [inputText, setInputText] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [viewerPhoto, setViewerPhoto] = useState(null)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll to bottom whenever messages change
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    })
  }

  useEffect(() => {
    scrollToBottom(false)
  }, [loading])

  useEffect(() => {
    scrollToBottom(true)
  }, [messages])

  // Handle image file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh')
      return
    }

    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleClearImage = () => {
    setSelectedImage(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle sending a message
  const handleSend = async (e) => {
    e?.preventDefault()
    const textToSend = inputText.trim()
    const fileToSend = selectedImage

    if (!textToSend && !fileToSend) return

    setInputText('')
    handleClearImage()
    setShowEmojiPicker(false)

    try {
      await sendMessage(textToSend, fileToSend)
    } catch {
      toast.error('Không thể gửi tin nhắn. Vui lòng thử lại!')
    }
  }

  // Quick Emoji click
  const handleQuickEmojiClick = async (emoji) => {
    try {
      await sendQuickEmoji(emoji)
    } catch {
      toast.error('Không thể gửi emoji')
    }
  }

  const friendName = friendProfile?.full_name || friendProfile?.username || 'Bạn bè'

  const uniqueMessages = messages.filter(
    (m, i, arr) => !m.id || arr.findIndex((x) => x.id === m.id) === i
  )

  return (
    <div className="relative flex flex-col h-full bg-black text-white overflow-hidden">
      {/* ===== Chat Header ===== */}
      <div className="relative flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.06] bg-black/90 backdrop-blur-md z-20">
        {/* Back Button */}
        <button
          onClick={() => navigate('/messages')}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          aria-label="Quay lại"
        >
          <ChevronLeft size={28} />
        </button>

        {/* Center Friend Profile Info */}
        <div
          onClick={() => friendProfile?.username && navigate(`/friends`)}
          className="flex flex-col items-center cursor-pointer group"
        >
          <Avatar
            src={friendProfile?.avatar_url}
            alt={friendName}
            size={48}
            className="ring-2 ring-white/15 group-hover:ring-amber-400 transition-all shadow-md"
          />
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-xs font-semibold text-white/95 group-hover:text-amber-400 transition-colors">
              {friendName}
            </span>
            <ChevronRight size={13} className="text-[#888888]" />
          </div>
        </div>

        {/* Empty space for symmetrical alignment */}
        <div className="w-10" />
      </div>

      {/* ===== Message Stream Area ===== */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner size={30} />
          </div>
        ) : uniqueMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <Avatar
              src={friendProfile?.avatar_url}
              alt={friendName}
              size={72}
              className="mb-3 ring-2 ring-white/15 shadow-xl"
            />
            <p className="text-base font-bold text-white">{friendName}</p>
            {friendProfile?.username && (
              <p className="text-xs text-[#8E8E93] mt-1">@{friendProfile.username}</p>
            )}
            <p className="text-xs text-[#8E8E93] mt-3 max-w-[240px]">
              Gửi tin nhắn hoặc thả biểu cảm để bắt đầu trò chuyện!
            </p>
            <div className="flex items-center gap-3 mt-5">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleQuickEmojiClick(emoji)}
                  className="w-11 h-11 rounded-full bg-[#222222] hover:bg-[#333333] active:scale-90 flex items-center justify-center text-xl transition-all cursor-pointer shadow-md"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          uniqueMessages.map((msg, idx) => {
            const isMe = msg.sender_id === user?.id
            const prevMsg = idx > 0 ? uniqueMessages[idx - 1] : null

            // Show time divider if > 30 minutes from prev msg or first msg
            const showDivider =
              !prevMsg ||
              new Date(msg.created_at) - new Date(prevMsg.created_at) > 30 * 60 * 1000

            // Show friend avatar only on the last message of consecutive friend messages
            const nextMsg = idx < uniqueMessages.length - 1 ? uniqueMessages[idx + 1] : null
            const isLastOfGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id

            return (
              <div key={msg.id || `msg-${idx}`} className="space-y-2">
                {/* Time Divider */}
                {showDivider && (
                  <div className="text-center my-3 select-none">
                    <span className="text-[11px] font-medium text-[#8E8E93] px-3 py-1">
                      {formatChatDivider(msg.created_at)}
                    </span>
                  </div>
                )}

                {/* Message Bubble Row */}
                <div
                  className={`flex items-end gap-2 ${
                    isMe ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Friend Avatar on Left */}
                  {!isMe && (
                    <div className="w-8 h-8 flex-shrink-0">
                      {isLastOfGroup ? (
                        <Avatar
                          src={friendProfile?.avatar_url}
                          alt={friendName}
                          size={32}
                          className="ring-1 ring-white/10"
                        />
                      ) : (
                        <div className="w-8 h-8" />
                      )}
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    className={`max-w-[78%] flex flex-col ${
                      isMe ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* Media Card (If image attached or photo comment) */}
                    {(() => {
                      if (!msg.media_url) return null
                      const { imageUrl, isPostComment, meta } = parseMessageMedia(msg.media_url)
                      if (!imageUrl) return null

                      const authorAvatar = isPostComment
                        ? (meta?.authorAvatar || (isMe ? profile?.avatar_url : friendProfile?.avatar_url))
                        : (isMe ? profile?.avatar_url : friendProfile?.avatar_url)
                      const authorName = isPostComment
                        ? (meta?.authorName || (isMe ? 'Bạn' : friendName))
                        : (isMe ? 'Bạn' : friendName)
                      const dateText = formatPostCommentDate(meta?.postCreatedAt || msg.created_at)

                      return (
                        <div
                          onClick={() =>
                            setViewerPhoto({
                              signedImageUrl: imageUrl,
                              caption: meta?.caption || null,
                              created_at: meta?.postCreatedAt || msg.created_at,
                            })
                          }
                          className="relative rounded-[26px] overflow-hidden border border-white/10 max-w-[280px] bg-[#1a1a1a] shadow-xl cursor-pointer group active:scale-[0.98] transition-all"
                        >
                          <img
                            src={imageUrl}
                            alt="Đính kèm"
                            className="w-full h-auto max-h-[340px] object-cover block"
                            loading="lazy"
                          />

                          {/* Author info pill overlay at top-left of photo card (Screenshot 2 style: [Avatar] Hiii 14 thg 9) */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 select-none shadow-md">
                            <Avatar
                              src={authorAvatar}
                              alt={authorName}
                              size={18}
                            />
                            <span className="text-white text-[11px] font-semibold">
                              {authorName}
                            </span>
                            <span className="text-white/60 text-[10px] font-normal">
                              {dateText}
                            </span>
                          </div>

                          {/* Original post caption overlay if present */}
                          {meta?.caption && (
                            <div className="absolute top-11 left-2.5 right-2.5 flex justify-center pointer-events-none">
                              <span className="bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white/85 text-[11px] font-medium truncate max-w-[90%] shadow-sm">
                                {meta.caption}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Comment Bubble BELOW the photo (Separate from photo, matching Screenshot 2) */}
                    {msg.media_url && msg.content && (
                      <div
                        className={`mt-1.5 px-4 py-2 rounded-[20px] text-[15px] leading-relaxed break-words shadow-md transition-all ${
                          isMe
                            ? 'bg-[#555557] text-white rounded-br-sm self-end'
                            : 'bg-[#404042] text-white rounded-bl-sm self-start'
                        } ${msg.sending ? 'opacity-65' : 'opacity-100'}`}
                      >
                        {msg.content}
                      </div>
                    )}

                    {/* Standard Text Message Bubble (Only for messages without photo) */}
                    {!msg.media_url && msg.content && (
                      <div
                        className={`px-4 py-2 rounded-[20px] text-[15px] leading-relaxed break-words shadow-sm transition-all ${
                          isMe
                            ? 'bg-[#EDEDED] text-[#0A0A0A] font-normal rounded-br-sm'
                            : 'bg-[#383838] text-white font-normal rounded-bl-sm'
                        } ${msg.sending ? 'opacity-65' : 'opacity-100'}`}
                      >
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ===== Selected Image Attachment Preview ===== */}
      {imagePreview && (
        <div className="px-4 py-2 bg-[#181818] border-t border-white/10 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-12 h-12 rounded-xl object-cover border border-white/20"
            />
            <div className="text-xs text-[#8E8E93]">
              <p className="text-white font-medium">Đã chọn ảnh</p>
              <p>{uploadingImage ? 'Đang tải lên...' : 'Sẵn sàng gửi'}</p>
            </div>
          </div>
          <button
            onClick={handleClearImage}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ===== Extra Emoji Picker Popup ===== */}
      {showEmojiPicker && (
        <div className="px-4 py-2.5 bg-[#1a1a1a] border-t border-white/10 flex items-center justify-around flex-wrap gap-2 animate-fade-in">
          {EXTRA_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setInputText((prev) => prev + emoji)
                setShowEmojiPicker(false)
                inputRef.current?.focus()
              }}
              className="text-2xl p-1.5 hover:scale-125 active:scale-95 transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* ===== Bottom Input Bar (Screenshot 2 style) ===== */}
      <div className="p-3 bg-black border-t border-white/[0.06] safe-bottom">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 bg-[#242426] border border-white/10 rounded-full px-3.5 py-1.5"
        >
          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Tin nhắn..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-[#8E8E93] text-sm focus:outline-none min-w-0"
          />

          {/* Quick Emoji Reaction Buttons (Screenshot 2) */}
          {!inputText.trim() && !selectedImage && (
            <div className="flex items-center gap-2">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleQuickEmojiClick(emoji)}
                  className="text-lg hover:scale-125 active:scale-90 transition-transform cursor-pointer"
                  aria-label={`Gửi ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Attachment / Smiley Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className={`w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer ${
              showEmojiPicker ? 'text-amber-400' : ''
            }`}
            aria-label="Chọn biểu cảm"
          >
            <Smile size={18} />
          </button>

          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Gửi ảnh"
          >
            <ImagePlus size={18} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Send Button (Active when typing or image attached) */}
          {(inputText.trim() || selectedImage) && (
            <button
              type="submit"
              disabled={sending || uploadingImage}
              className="w-8 h-8 rounded-full bg-[#EAB308] hover:bg-[#FACC15] active:scale-95 text-black flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
              aria-label="Gửi tin nhắn"
            >
              {sending || uploadingImage ? (
                <Spinner size={14} />
              ) : (
                <Send size={15} className="translate-x-[1px]" />
              )}
            </button>
          )}
        </form>
      </div>

      {/* Fullscreen Photo Viewer Modal */}
      {viewerPhoto && (
        <PhotoViewerModal
          posts={[viewerPhoto]}
          initialIndex={0}
          onClose={() => setViewerPhoto(null)}
        />
      )}
    </div>
  )
}
