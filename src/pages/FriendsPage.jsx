import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFriends } from '../hooks/useFriends'
import { Avatar } from '../components/ui/Avatar'
import { Spinner } from '../components/ui/Spinner'
import {
  Search,
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  Users,
  Inbox,
  Trash2,
  MessageCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'friends', label: 'Bạn bè', icon: Users },
  { key: 'requests', label: 'Lời mời', icon: Inbox },
  { key: 'search', label: 'Tìm kiếm', icon: Search },
]

export function FriendsPage() {
  const navigate = useNavigate()
  const {
    friends,
    pendingReceived,
    pendingSent,
    loading,
    searchUsers,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    getFriendshipStatus,
  } = useFriends()

  const [activeTab, setActiveTab] = useState('friends')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // friendshipId or userId

  // Debounced search
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (activeTab !== 'search' || !trimmed) return

    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const results = await searchUsers(trimmed)
        setSearchResults(results)
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, activeTab, searchUsers])

  const handleSendRequest = async (userId) => {
    setActionLoading(userId)
    try {
      await sendFriendRequest(userId)
      toast.success('Đã gửi lời mời kết bạn!')
    } catch (err) {
      toast.error(err.message || 'Không thể gửi lời mời')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAccept = async (friendshipId) => {
    setActionLoading(friendshipId)
    try {
      await acceptRequest(friendshipId)
      toast.success('Đã chấp nhận kết bạn!')
    } catch {
      toast.error('Không thể chấp nhận lời mời')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (friendshipId) => {
    setActionLoading(friendshipId)
    try {
      await rejectRequest(friendshipId)
      toast('Đã từ chối lời mời')
    } catch {
      toast.error('Không thể từ chối lời mời')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemove = async (friendshipId, name) => {
    if (!window.confirm(`Xóa ${name} khỏi danh sách bạn bè?`)) return
    setActionLoading(friendshipId)
    try {
      await removeFriend(friendshipId)
      toast('Đã hủy kết bạn')
    } catch {
      toast.error('Không thể hủy kết bạn')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex flex-col h-full px-4 pt-6">
      {/* Header */}
      <div className="mb-4 animate-fade-in">
        <h1 className="text-2xl font-bold text-white">Bạn bè</h1>
        <p className="text-dark-300 text-sm mt-1">
          {friends.length} người bạn
          {pendingReceived.length > 0 && (
            <span className="text-accent-rose ml-2">
              • {pendingReceived.length} lời mời mới
            </span>
          )}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-dark-800 rounded-xl p-1 mb-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
              activeTab === key
                ? 'bg-[#CCFF00] text-black font-extrabold shadow-md'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <Icon size={14} />
            {label}
            {key === 'requests' && pendingReceived.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-accent-rose text-[10px] flex items-center justify-center text-white font-bold">
                {pendingReceived.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        {/* ===== MY FRIENDS TAB ===== */}
        {activeTab === 'friends' && (
          <div className="space-y-2 pb-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner size={28} />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-dark-400" />
                </div>
                <p className="text-white text-base font-semibold">Chưa có bạn bè nào</p>
                <p className="text-dark-300 text-xs mt-1 mb-5">
                  Tìm kiếm username bạn bè hoặc gửi link để kết nối!
                </p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs btn-press shadow-lg hover:bg-white/90 transition-all"
                >
                  <Search size={14} />
                  Tìm bạn bè ngay
                </button>
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.friendshipId}
                  className="flex items-center gap-3 p-3 rounded-2xl glass hover:bg-glass-hover transition-colors"
                >
                  <Avatar
                    src={friend.profile?.avatar_url}
                    alt={friend.profile?.full_name}
                    size={44}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {friend.profile?.full_name}
                    </p>
                    <p className="text-dark-300 text-xs truncate">
                      @{friend.profile?.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        navigate(`/messages/${friend.profile?.id}`, {
                          state: { friendProfile: friend.profile },
                        })
                      }
                      className="w-8 h-8 rounded-full bg-dark-700 hover:bg-white/10 flex items-center justify-center transition-colors btn-press text-white"
                      title="Nhắn tin"
                      aria-label="Nhắn tin"
                    >
                      <MessageCircle size={15} />
                    </button>
                    <button
                      onClick={() => handleRemove(friend.friendshipId, friend.profile?.full_name)}
                      disabled={actionLoading === friend.friendshipId}
                      className="w-8 h-8 rounded-full bg-dark-700 hover:bg-red-500/20 flex items-center justify-center transition-colors btn-press"
                      title="Xóa bạn"
                      aria-label="Xóa bạn"
                    >
                      {actionLoading === friend.friendshipId ? (
                        <Spinner size={14} />
                      ) : (
                        <Trash2 size={14} className="text-dark-400 hover:text-red-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ===== REQUESTS TAB ===== */}
        {activeTab === 'requests' && (
          <div className="space-y-4 pb-4">
            {/* Incoming Requests */}
            <div>
              <h3 className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-3">
                Đã nhận ({pendingReceived.length})
              </h3>
              {pendingReceived.length === 0 ? (
                <p className="text-dark-400 text-sm text-center py-6">
                  Không có lời mời kết bạn nào
                </p>
              ) : (
                <div className="space-y-2">
                  {pendingReceived.map((req) => (
                    <div
                      key={req.friendshipId}
                      className="flex items-center gap-3 p-3 rounded-2xl glass"
                    >
                      <Avatar
                        src={req.profile?.avatar_url}
                        alt={req.profile?.full_name}
                        size={44}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">
                          {req.profile?.full_name}
                        </p>
                        <p className="text-dark-300 text-xs truncate">
                          @{req.profile?.username}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(req.friendshipId)}
                          disabled={actionLoading === req.friendshipId}
                          className="w-9 h-9 rounded-full bg-accent-emerald/20 hover:bg-accent-emerald/30 flex items-center justify-center transition-colors btn-press"
                          title="Chấp nhận"
                        >
                          {actionLoading === req.friendshipId ? (
                            <Spinner size={14} />
                          ) : (
                            <Check size={16} className="text-accent-emerald" />
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(req.friendshipId)}
                          disabled={actionLoading === req.friendshipId}
                          className="w-9 h-9 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors btn-press"
                          title="Từ chối"
                        >
                          <X size={16} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Requests */}
            <div>
              <h3 className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-3">
                Đã gửi ({pendingSent.length})
              </h3>
              {pendingSent.length === 0 ? (
                <p className="text-dark-400 text-sm text-center py-6">
                  Chưa gửi lời mời nào
                </p>
              ) : (
                <div className="space-y-2">
                  {pendingSent.map((req) => (
                    <div
                      key={req.friendshipId}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-dark-800"
                    >
                      <Avatar
                        src={req.profile?.avatar_url}
                        alt={req.profile?.full_name}
                        size={44}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">
                          {req.profile?.full_name}
                        </p>
                        <p className="text-dark-300 text-xs truncate">
                          @{req.profile?.username}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-dark-400 bg-dark-700 px-3 py-1.5 rounded-full">
                        <Clock size={12} />
                        Đang chờ
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== SEARCH TAB ===== */}
        {activeTab === 'search' && (
          <div className="pb-4">
            {/* Search Input */}
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                placeholder="Tìm theo @username hoặc tên..."
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value
                  setSearchQuery(val)
                  if (!val.trim()) {
                    setSearchResults([])
                  }
                }}
                className="w-full bg-dark-800 border border-dark-600 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-accent-violet/50 focus:ring-1 focus:ring-accent-violet/30 transition-all"
                autoFocus
              />
            </div>

            {/* Results */}
            {searchLoading ? (
              <div className="flex justify-center py-10">
                <Spinner size={28} />
              </div>
            ) : searchQuery.trim() && searchResults.length === 0 ? (
              <p className="text-dark-400 text-sm text-center py-10">
                Không tìm thấy người dùng &quot;{searchQuery}&quot;
              </p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((profile) => {
                  const status = getFriendshipStatus(profile.id)
                  return (
                    <div
                      key={profile.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-dark-800 hover:bg-dark-700 transition-colors"
                    >
                      <Avatar
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        size={44}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">
                          {profile.full_name}
                        </p>
                        <p className="text-dark-300 text-xs truncate">
                          @{profile.username}
                        </p>
                      </div>

                      {status === 'accepted' ? (
                        <span className="flex items-center gap-1 text-xs text-accent-emerald bg-accent-emerald/10 px-3 py-1.5 rounded-full">
                          <UserCheck size={12} />
                          Bạn bè
                        </span>
                      ) : status === 'pending_sent' ? (
                        <span className="flex items-center gap-1 text-xs text-dark-400 bg-dark-700 px-3 py-1.5 rounded-full">
                          <Clock size={12} />
                          Đang chờ
                        </span>
                      ) : status === 'pending_received' ? (
                        <span className="flex items-center gap-1 text-xs text-accent-violet bg-accent-violet/10 px-3 py-1.5 rounded-full">
                          <Inbox size={12} />
                          Chấp nhận?
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(profile.id)}
                          disabled={actionLoading === profile.id}
                          className="flex items-center gap-1.5 text-xs font-extrabold text-black bg-[#CCFF00] hover:bg-[#b8e600] px-3.5 py-2 rounded-full btn-press disabled:opacity-50"
                        >
                          {actionLoading === profile.id ? (
                            <Spinner size={12} className="text-white" />
                          ) : (
                            <>
                              <UserPlus size={13} />
                              Kết bạn
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
