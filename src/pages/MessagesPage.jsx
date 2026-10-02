import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConversations } from '../hooks/useMessages'
import { useFriends } from '../hooks/useFriends'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from '../components/ui/Avatar'
import { Spinner } from '../components/ui/Spinner'
import { formatConversationTime } from '../lib/dateUtils'
import {
  ChevronRight,
  Pencil,
  Search,
  X,
  MessageCircle,
  UserPlus,
  Users,
} from 'lucide-react'

export function MessagesPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { conversations, loading } = useConversations()
  const { friends, loading: friendsLoading } = useFriends()

  // New Chat Bottom Sheet / Modal state
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [friendSearch, setFriendSearch] = useState('')

  const filteredFriends = friends.filter((f) => {
    if (!friendSearch.trim()) return true
    const q = friendSearch.toLowerCase()
    const name = f.profile?.full_name?.toLowerCase() || ''
    const user = f.profile?.username?.toLowerCase() || ''
    return name.includes(q) || user.includes(q)
  })

  return (
    <div className="relative flex flex-col h-full bg-black text-white px-4 pt-4">
      {/* Header */}
      <div className="relative flex items-center justify-between mb-4 min-h-[44px]">
        {/* Left Friends Button */}
        <button
          onClick={() => navigate('/friends')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          aria-label="Danh sách bạn bè"
          title="Bạn bè"
        >
          <Users size={20} />
        </button>

        {/* Center Title */}
        <h1 className="text-xl font-bold tracking-tight text-white select-none">
          Trò chuyện
        </h1>

        {/* Right User Avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="focus:outline-none btn-press cursor-pointer"
          aria-label="Hồ sơ cá nhân"
        >
          <Avatar
            src={profile?.avatar_url}
            alt={profile?.full_name || 'Tôi'}
            size={36}
            className="ring-1 ring-white/15"
          />
        </button>
      </div>

      {/* Main Conversation List */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size={32} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-[#181818] flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-[#888888]" />
            </div>
            <p className="text-base font-semibold text-white">Chưa có cuộc trò chuyện nào</p>
            <p className="text-xs text-[#888888] mt-1 max-w-[260px]">
              Nhấn nút bút màu vàng bên dưới để bắt đầu nhắn tin với bạn bè của bạn!
            </p>
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="mt-6 px-5 py-2.5 rounded-full bg-[#EAB308] hover:bg-[#FACC15] text-black text-sm font-semibold flex items-center gap-2 btn-press"
            >
              <Pencil size={15} />
              Bắt đầu trò chuyện
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {conversations.map(({ partnerId, partner, lastMessage, unreadCount }) => {
              const displayName = partner?.full_name || partner?.username || 'Bạn bè'
              const timeDisplay = formatConversationTime(lastMessage?.created_at)
              const isMedia = Boolean(lastMessage?.media_url)
              const previewText = isMedia
                ? lastMessage?.content ? `📷 ${lastMessage.content}` : '📷 [Hình ảnh]'
                : lastMessage?.content || ''

              return (
                <div
                  key={partnerId}
                  onClick={() => navigate(`/messages/${partnerId}`, { state: { friendProfile: partner } })}
                  className="flex items-center gap-3.5 py-3 px-2 rounded-2xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer select-none"
                >
                  {/* Left Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={partner?.avatar_url}
                      alt={displayName}
                      size={52}
                      className="ring-1 ring-white/10"
                    />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F43F5E] text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-black">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Middle Content */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-[15px] text-white truncate max-w-[180px]">
                        {displayName}
                      </span>
                      {timeDisplay && (
                        <span className="text-xs text-[#8E8E93] font-normal flex-shrink-0">
                          {timeDisplay}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm mt-0.5 truncate ${
                        unreadCount > 0
                          ? 'text-white font-medium'
                          : 'text-[#8E8E93] font-normal'
                      }`}
                    >
                      {previewText}
                    </p>
                  </div>

                  {/* Right Chevron */}
                  <ChevronRight size={18} className="text-[#555555] flex-shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Yellow Action Button (Pencil icon as in Screenshot 1) */}
      <button
        onClick={() => setIsNewChatOpen(true)}
        className="fixed bottom-24 right-5 z-30 w-13 h-13 rounded-full bg-[#EAB308] hover:bg-[#FACC15] active:scale-95 text-black shadow-lg shadow-amber-500/20 flex items-center justify-center transition-transform cursor-pointer"
        aria-label="Tin nhắn mới"
      >
        <Pencil size={22} strokeWidth={2.4} />
      </button>

      {/* New Chat Modal / Bottom Sheet */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[430px] max-h-[85vh] bg-[#141414] rounded-t-[28px] border-t border-white/10 flex flex-col overflow-hidden animate-slide-in-bottom">
            {/* Sheet Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-lg font-bold text-white">Tin nhắn mới</h2>
              <button
                onClick={() => setIsNewChatOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Friends Input */}
            <div className="px-5 pb-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
                <input
                  type="text"
                  placeholder="Tìm bạn bè..."
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#222222] border border-white/10 rounded-full text-sm text-white placeholder-[#888888] focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1">
              {friendsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size={24} />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-[#888888]">
                    {friends.length === 0
                      ? 'Bạn chưa có bạn bè nào.'
                      : 'Không tìm thấy bạn bè phù hợp.'}
                  </p>
                  {friends.length === 0 && (
                    <button
                      onClick={() => {
                        setIsNewChatOpen(false)
                        navigate('/friends')
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-400 font-semibold hover:underline"
                    >
                      <UserPlus size={14} />
                      Tìm bạn mới
                    </button>
                  )}
                </div>
              ) : (
                filteredFriends.map((f) => {
                  const friendUser = f.profile
                  const name = friendUser?.full_name || friendUser?.username || 'Bạn bè'
                  return (
                    <div
                      key={f.friendshipId || friendUser?.id}
                      onClick={() => {
                        setIsNewChatOpen(false)
                        navigate(`/messages/${friendUser.id}`, { state: { friendProfile: friendUser } })
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.06] active:bg-white/[0.1] cursor-pointer transition-colors"
                    >
                      <Avatar
                        src={friendUser?.avatar_url}
                        alt={name}
                        size={44}
                        className="ring-1 ring-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{name}</p>
                        <p className="text-xs text-[#888888] truncate">@{friendUser?.username}</p>
                      </div>
                      <ChevronRight size={16} className="text-[#555555]" />
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
