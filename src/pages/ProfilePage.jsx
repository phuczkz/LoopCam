import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useFriends } from '../hooks/useFriends'
import { supabase } from '../lib/supabase'
import { compressAvatar } from '../lib/imageCompression'
import { getAvatarUrl } from '../lib/avatarUtils'
import { cleanupOldAvatars, removeStorageFile } from '../lib/storageUtils'
import {
  Users,
  Link2,
  Upload,
  Heart,
  Camera,
  Layers,
  Bell,
  Cake,
  Type,
  User,
  Mail,
  Info,
  ShieldCheck,
  AlertCircle,
  LogOut,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

export function ProfilePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const { user, profile, signOut, updateProfile } = useAuth()
  const { friends } = useFriends()

  // Fallback data if profile table hasn't populated yet
  const fallbackUsername = (
    profile?.username ||
    user?.user_metadata?.username ||
    user?.email?.split('@')[0] ||
    'user'
  ).toLowerCase().trim()

  const fallbackFullName = (
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'LoopCam User'
  ).trim()

  const fallbackAvatar = getAvatarUrl(
    profile?.avatar_url || user?.user_metadata?.avatar_url,
    fallbackFullName || fallbackUsername
  )

  const userEmail = profile?.email || user?.email || ''

  // Local state for modals & editing
  const [modalType, setModalType] = useState(null) // 'name' | 'avatar' | 'birthday' | 'widget' | 'gold' | 'notifications' | 'support'
  const [nameInput, setNameInput] = useState(fallbackFullName)
  const [birthdayInput, setBirthdayInput] = useState(profile?.birthday || '2002-01-01')
  const [avatarPreview, setAvatarPreview] = useState(fallbackAvatar)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Sync inputs if profile updates from network
  useEffect(() => {
    Promise.resolve().then(() => {
      if (profile?.full_name) {
        setNameInput(profile.full_name)
      }
      if (profile?.avatar_url) {
        setAvatarPreview(profile.avatar_url)
      }
      if (profile?.birthday) {
        setBirthdayInput(profile.birthday)
      }
    })
  }, [profile?.full_name, profile?.avatar_url, profile?.birthday])

  // Profile link
  const profileLink = `loopcam.com/${fallbackUsername}`
  const fullProfileUrl = `https://${profileLink}`

  // Copy profile link
  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullProfileUrl)
        toast.success(`Đã sao chép: ${profileLink}`)
      } else {
        toast.success(`Liên kết: ${profileLink}`)
      }
    } catch {
      toast.success(`Liên kết: ${profileLink}`)
    }
  }

  // Share profile link
  const handleShareLink = async () => {
    if (navigator?.share) {
      try {
        await navigator.share({
          title: `LoopCam - ${fallbackFullName}`,
          text: `Kết bạn với mình trên LoopCam nhé!`,
          url: fullProfileUrl,
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink()
        }
      }
    } else {
      handleCopyLink()
    }
  }

  // Save Name
  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      toast.error('Tên không được để trống')
      return
    }
    setSaving(true)
    try {
      await updateProfile({ full_name: nameInput.trim() })
      toast.success('Đã cập nhật tên! ✅')
      setModalType(null)
    } catch (err) {
      console.error(err)
      toast.error('Không thể cập nhật tên')
    } finally {
      setSaving(false)
    }
  }

  // Save Birthday
  const handleSaveBirthday = async () => {
    setSaving(true)
    try {
      await updateProfile({ birthday: birthdayInput })
      toast.success('Đã lưu ngày sinh! 🎂')
      setModalType(null)
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi lưu ngày sinh')
    } finally {
      setSaving(false)
    }
  }

  // Handle Avatar file selection
  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    const previousAvatarUrl = profile?.avatar_url
    setSaving(true)
    try {
      // 1. Compress avatar to WebP (max 256x256, ~15-35KB, huge storage savings)
      const compressed = await compressAvatar(file)

      // 2. Upload avatar to Supabase Storage bucket 'photos'
      const timestamp = Date.now()
      const ext = compressed.type === 'image/webp' ? 'webp' : 'jpg'
      const fileName = `${timestamp}.${ext}`
      const filePath = `avatars/${user.id}/${fileName}`
      const arrayBuffer = await compressed.arrayBuffer()
      const contentType = compressed.type || 'image/webp'

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('photos')
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: true,
        })

      if (uploadErr) {
        console.error('Lỗi upload avatar lên Supabase Storage:', uploadErr)
        if (uploadErr.message?.toLowerCase().includes('bucket not found')) {
          throw new Error("Chưa tạo bucket 'photos' trên Supabase Storage. Hãy tạo bucket 'photos'!")
        }
        throw new Error(`Lỗi tải avatar (${uploadErr.message || uploadErr.error || 'Upload error'})`)
      }

      // 3. Get public URL
      const { data: pubData } = supabase.storage.from('photos').getPublicUrl(uploadData.path)
      const publicUrl = pubData?.publicUrl

      if (!publicUrl) throw new Error('Không lấy được public URL ảnh')

      setAvatarPreview(publicUrl)
      await updateProfile({ avatar_url: publicUrl })

      // 4. CLEAN UP OLD AVATARS:
      // A. Remove specifically previous avatar URL if it was in Supabase storage
      if (previousAvatarUrl && (previousAvatarUrl.includes('/photos/') || previousAvatarUrl.includes('avatars/'))) {
        await removeStorageFile(previousAvatarUrl, 'photos')
      }
      // B. Remove any lingering previous avatar files for this user in storage
      await cleanupOldAvatars(user.id, fileName)

      toast.success('Đã cập nhật ảnh đại diện! 📸')
      setModalType(null)
    } catch (err) {
      console.error('handleAvatarFileSelect error:', err)
      toast.error(err.message || 'Không thể cập nhật ảnh đại diện')
    } finally {
      setSaving(false)
    }
  }

  // Sign out
  const handleSignOut = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      toast.success('Đã đăng xuất!')
      navigate('/auth')
    } catch {
      toast.error('Lỗi khi đăng xuất')
      setLoggingOut(false)
    }
  }

  return (
    <div className="w-full min-h-full flex flex-col bg-black text-white px-4 pt-2 select-none">
      {/* Top Handle / Dismiss Indicator */}
      <div className="flex flex-col items-center justify-center pt-1 pb-3 relative">
        <button
          onClick={() => navigate('/camera')}
          className="w-10 h-1.5 bg-white/25 rounded-full hover:bg-white/40 transition-colors btn-press"
          aria-label="Quay lại máy ảnh"
        />
        <button
          onClick={() => navigate('/camera')}
          className="absolute right-0 top-0 p-1.5 text-white/50 hover:text-white transition-colors btn-press"
          aria-label="Đóng"
        >
          <ChevronDown size={22} />
        </button>
      </div>

      {/* ── Avatar Section ── */}
      <div className="flex flex-col items-center mt-2">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative w-28 h-28 rounded-full border-[3.5px] border-[#E8A020] p-0.5 cursor-pointer btn-press group"
        >
          <img
            src={avatarPreview}
            alt={fallbackFullName}
            className="w-full h-full rounded-full object-cover bg-[#242426]"
          />
          <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera size={24} className="text-white" />
          </div>
        </div>

        {/* Hidden File Input for Avatar */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFileSelect}
        />

        {/* User Name */}
        <h1 className="text-2xl font-bold text-white mt-3.5 tracking-tight text-center">
          {fallbackFullName}
        </h1>

        {/* Username Badge & Profile Link */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-center">
          <button
            onClick={() => {
              if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(fallbackUsername)
              }
              toast.success(`Đã sao chép: @${fallbackUsername}`)
            }}
            className="text-[#E8A020] hover:text-[#f3b544] bg-[#E8A020]/15 hover:bg-[#E8A020]/25 text-[12px] font-semibold px-2.5 py-0.5 rounded-full transition-colors flex items-center gap-1 btn-press"
            title="Bấm để sao chép username"
          >
            <span>@{fallbackUsername}</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="text-white/45 hover:text-white/80 text-[12px] font-medium flex items-center gap-1 transition-colors btn-press"
            title="Sao chép liên kết"
          >
            <span>{profileLink}</span>
            <Link2 size={12} className="text-white/40" />
          </button>
        </div>
      </div>

      {/* ── 3 Action Buttons ── */}
      <div className="flex items-start justify-center gap-6 mt-6 px-2">
        {/* Button 1: Friends count */}
        <div className="flex flex-col items-center gap-1.5 w-[76px]">
          <button
            onClick={() => navigate('/friends')}
            className="w-14 h-14 rounded-full bg-[#242426] hover:bg-[#2E2E32] flex items-center justify-center text-white transition-colors btn-press"
            aria-label="Bạn bè"
          >
            <Users size={22} />
          </button>
          <span className="text-[12px] text-white/80 font-medium text-center leading-tight">
            {friends.length} người bạn
          </span>
        </div>

        {/* Button 2: Copy link */}
        <div className="flex flex-col items-center gap-1.5 w-[76px]">
          <button
            onClick={handleCopyLink}
            className="w-14 h-14 rounded-full bg-[#242426] hover:bg-[#2E2E32] flex items-center justify-center text-white transition-colors btn-press"
            aria-label="Sao chép liên kết"
          >
            <Link2 size={22} />
          </button>
          <span className="text-[12px] text-white/80 font-medium text-center leading-tight truncate w-full">
            Sao chép liên...
          </span>
        </div>

        {/* Button 3: Share link */}
        <div className="flex flex-col items-center gap-1.5 w-[76px]">
          <button
            onClick={handleShareLink}
            className="w-14 h-14 rounded-full bg-[#242426] hover:bg-[#2E2E32] flex items-center justify-center text-white transition-colors btn-press"
            aria-label="Chia sẻ liên kết"
          >
            <Upload size={22} />
          </button>
          <span className="text-[12px] text-white/80 font-medium text-center leading-tight">
            Chia sẻ liên kết
          </span>
        </div>
      </div>

      {/* ── LoopCam Gold Banner ── */}
      <div
        onClick={() => setModalType('gold')}
        className="mt-7 rounded-[26px] border-2 border-[#E8A020]/75 bg-gradient-to-r from-[#1E190E] via-[#1A1813] to-[#141416] p-4 flex items-center justify-between cursor-pointer btn-press hover:border-[#E8A020] transition-all"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#2A2312] border border-[#E8A020]/40 flex items-center justify-center flex-shrink-0">
            <Heart size={22} className="fill-[#E8A020] text-[#E8A020]" />
          </div>
          <div>
            <h3 className="text-white font-bold text-[15px]">LoopCam Gold</h3>
            <p className="text-white/60 text-xs mt-0.5">
              Mở khóa các tính năng tốt nhất của LoopCam
            </p>
          </div>
        </div>
        <ChevronRight size={20} className="text-white/40 flex-shrink-0 ml-2" />
      </div>

      {/* ── Tiện ích (Widgets) Section ── */}
      <div className="mt-7">
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-white/90" />
            <h2 className="text-[15px] font-bold text-white">Tiện ích</h2>
          </div>
          <button
            onClick={() => setModalType('widget')}
            className="text-[12px] font-bold text-[#E8A020] bg-[#2A2210] hover:bg-[#382E16] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors btn-press"
          >
            Mới +
          </button>
        </div>

        {/* 2-column Widget Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Mọi người */}
          <div className="bg-[#1C1C1E] rounded-3xl p-4 flex flex-col items-center justify-between aspect-square border border-white/5">
            {/* Overlapping Friend Avatars */}
            <div className="flex items-center justify-center -space-x-3 pt-2">
              <div className="w-12 h-12 rounded-full border-2 border-[#E8A020] overflow-hidden bg-[#2C2C2E] shadow-lg">
                <img
                  src={getAvatarUrl(
                    friends[0]?.profile?.avatar_url,
                    friends[0]?.profile?.full_name || friends[0]?.profile?.username || 'Friend1'
                  )}
                  alt="Friend 1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-[#E8A020] overflow-hidden bg-[#2C2C2E] shadow-lg">
                <img
                  src={getAvatarUrl(
                    friends[1]?.profile?.avatar_url,
                    friends[1]?.profile?.full_name || friends[1]?.profile?.username || 'Friend2'
                  )}
                  alt="Friend 2"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <span className="text-[14px] font-bold text-white mt-1">Mọi người</span>

            <button
              onClick={() => navigate('/friends')}
              className="w-full py-2 bg-[#2C2C2E] hover:bg-[#38383B] text-white text-xs font-semibold rounded-xl text-center transition-colors btn-press"
            >
              Sửa
            </button>
          </div>

          {/* Card 2: Tạo Widget */}
          <div className="bg-[#1C1C1E] rounded-3xl p-4 flex flex-col items-center justify-between aspect-square border border-white/5">
            <div className="pt-2 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#E8A020] flex items-center justify-center text-[#E8A020] text-2xl font-light">
                +
              </div>
            </div>

            <span className="text-[14px] font-bold text-transparent select-none">Tạo</span>

            <button
              onClick={() => setModalType('widget')}
              className="w-full py-2 bg-[#2C2C2E] hover:bg-[#38383B] text-white text-xs font-semibold rounded-xl text-center transition-colors btn-press"
            >
              Tạo
            </button>
          </div>
        </div>
      </div>

      {/* ── LoopCam Gold Grouped List ── */}
      <div className="mt-7">
        <h3 className="text-xs text-white/45 font-medium px-2 mb-2">LoopCam Gold</h3>
        <div className="bg-[#1C1C1E] rounded-3xl divide-y divide-white/5 overflow-hidden border border-white/5">
          {/* Row 1 */}
          <div
            onClick={() => setModalType('gold')}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <Heart size={18} className="fill-[#E8A020] text-[#E8A020]" />
              <span className="text-[14px] text-white font-medium">Đổi biểu tượng ứng dụng</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/70">
              <span className="flex items-center gap-1">💛 Vàng</span>
              <ChevronRight size={16} className="text-white/30" />
            </div>
          </div>

          {/* Row 2 */}
          <div
            onClick={() => setModalType('gold')}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <Camera size={18} className="text-[#E8A020]" />
              <span className="text-[14px] text-white font-medium">Chủ đề máy ảnh</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/70">
              <span className="flex items-center gap-1">💛 Vàng</span>
              <ChevronRight size={16} className="text-white/30" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Thiết lập tiện ích ── */}
      <div className="mt-7">
        <h3 className="text-xs text-white/45 font-medium px-2 mb-2">Thiết lập tiện ích</h3>
        <div className="bg-[#1C1C1E] rounded-3xl overflow-hidden border border-white/5">
          <div
            onClick={() => setModalType('widget')}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <Smartphone size={18} className="text-white/90" />
              <span className="text-[14px] text-white font-medium">Cách thêm tiện ích</span>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </div>
        </div>
      </div>

      {/* ── Tổng quát (General Settings) ── */}
      <div className="mt-7">
        <h3 className="text-xs text-white/45 font-medium px-2 mb-2">Tổng quát</h3>
        <div className="bg-[#1C1C1E] rounded-3xl divide-y divide-white/5 overflow-hidden border border-white/5">
          {/* Thông báo */}
          <div
            onClick={() => setModalType('notifications')}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-white/90" />
              <span className="text-[14px] text-white font-medium">Thông báo</span>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </div>

          {/* Sửa ngày sinh */}
          <div
            onClick={() => setModalType('birthday')}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <Cake size={18} className="text-white/90" />
              <span className="text-[14px] text-white font-medium">Sửa ngày sinh</span>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </div>

          {/* Sửa tên */}
          <div
            onClick={() => setModalType('name')}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <Type size={18} className="text-white/90" />
              <span className="text-[14px] text-white font-medium">Sửa tên</span>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </div>

          {/* Tên người dùng (@username) */}
          <div
            onClick={() => {
              if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(fallbackUsername)
              }
              toast.success(`Đã sao chép: @${fallbackUsername}`)
            }}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <span className="text-white/90 text-sm font-bold w-[18px] text-center">@</span>
              <span className="text-[14px] text-white font-medium">Tên người dùng (@username)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#E8A020] font-semibold">
              <span>@{fallbackUsername}</span>
              <ChevronRight size={16} className="text-white/30" />
            </div>
          </div>

          {/* Chỉnh sửa ảnh đại diện */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <User size={18} className="text-white/90" />
              <span className="text-[14px] text-white font-medium">Chỉnh sửa ảnh đại diện</span>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </div>

          {/* Địa chỉ email */}
          <div
            onClick={() => toast.success(`Email: ${userEmail || 'Chưa đăng nhập'}`)}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-white/90" />
              <span className="text-[14px] text-white font-medium">Thêm địa chỉ email</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <span className="max-w-[120px] truncate">{userEmail}</span>
              <ChevronRight size={16} className="text-white/30" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Hỗ trợ (Support) ── */}
      <div className="mt-7">
        <h3 className="text-xs text-white/45 font-medium px-2 mb-2">Hỗ trợ</h3>
        <div className="bg-[#1C1C1E] rounded-3xl divide-y divide-white/5 overflow-hidden border border-white/5">
          <div
            onClick={() => toast.success('Trung tâm trợ giúp LoopCam luôn sẵn sàng!')}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <Info size={18} className="text-white/90" />
              <span className="text-[14px] text-white font-medium">Trung tâm trợ giúp</span>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </div>

          <div
            onClick={() => toast.success('LoopCam cam kết môi trường an toàn và lành mạnh.')}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <Users size={18} className="text-white/90" />
              <span className="text-[14px] text-white font-medium">Trung tâm phụ huynh</span>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </div>

          <div
            onClick={() => toast.success('Tài khoản của bạn được bảo mật bởi Supabase Auth.')}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-white/90" />
              <span className="text-[14px] text-white font-medium">Trung tâm an toàn</span>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </div>

          <div
            onClick={() => toast.success('Đã gửi phản hồi đến đội ngũ hỗ trợ LoopCam.')}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-white/90" />
              <span className="text-[14px] text-white font-medium">Báo cáo sự cố</span>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </div>
        </div>
      </div>

      {/* ── Đăng xuất (Sign Out) ── */}
      <div className="mt-7 mb-4">
        <div className="bg-[#1C1C1E] rounded-3xl overflow-hidden border border-white/5">
          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-red-500/10 text-red-400 font-semibold transition-colors btn-press"
          >
            <div className="flex items-center gap-3">
              <LogOut size={18} />
              <span className="text-[14px]">Đăng xuất</span>
            </div>
            {loggingOut && <span className="text-xs opacity-70">Đang thoát...</span>}
          </button>
        </div>
      </div>

      {/* ══════════ MODALS / SHEETS ══════════ */}

      {/* Modal: Sửa Tên */}
      {modalType === 'name' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Sửa tên hiển thị</h3>
              <button
                onClick={() => setModalType(null)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Nhập tên mới..."
              className="w-full bg-[#2C2C2E] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#E8A020] text-sm mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setModalType(null)}
                className="flex-1 py-3 rounded-xl bg-[#2C2C2E] text-white font-medium text-sm hover:bg-[#38383C]"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sửa Ngày Sinh */}
      {modalType === 'birthday' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Sửa ngày sinh</h3>
              <button
                onClick={() => setModalType(null)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <input
              type="date"
              value={birthdayInput}
              onChange={(e) => setBirthdayInput(e.target.value)}
              className="w-full bg-[#2C2C2E] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#E8A020] text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setModalType(null)}
                className="flex-1 py-3 rounded-xl bg-[#2C2C2E] text-white font-medium text-sm hover:bg-[#38383C]"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveBirthday}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu ngày sinh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cách thêm tiện ích */}
      {modalType === 'widget' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone size={20} className="text-[#E8A020]" />
                <h3 className="text-lg font-bold text-white">Cách thêm tiện ích</h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 text-xs text-white/70 mb-5">
              <div className="p-3 bg-[#2C2C2E] rounded-xl flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E8A020] text-black font-bold flex items-center justify-center flex-shrink-0 text-[11px]">1</span>
                <p>Ra màn hình chính của điện thoại, nhấn giữ vào khoảng trống.</p>
              </div>
              <div className="p-3 bg-[#2C2C2E] rounded-xl flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E8A020] text-black font-bold flex items-center justify-center flex-shrink-0 text-[11px]">2</span>
                <p>Nhấn vào dấu <strong>+</strong> ở góc trên màn hình.</p>
              </div>
              <div className="p-3 bg-[#2C2C2E] rounded-xl flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E8A020] text-black font-bold flex items-center justify-center flex-shrink-0 text-[11px]">3</span>
                <p>Tìm kiếm <strong>LoopCam</strong> và chọn kích thước tiện ích bạn muốn đặt.</p>
              </div>
            </div>
            <button
              onClick={() => setModalType(null)}
              className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Modal: LoopCam Gold */}
      {modalType === 'gold' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1C1C1E] border border-[#E8A020]/50 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-[#E8A020]" />
                <h3 className="text-lg font-bold text-white">LoopCam Gold</h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-white/60 mb-4">
              Trải nghiệm độc quyền không giới hạn khoảnh khắc cùng bạn bè.
            </p>
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2.5 text-xs text-white/90">
                <Check size={16} className="text-[#E8A020]" />
                <span>Đổi biểu tượng ứng dụng độc quyền</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-white/90">
                <Check size={16} className="text-[#E8A020]" />
                <span>Mở khóa toàn bộ chủ đề máy ảnh cao cấp</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-white/90">
                <Check size={16} className="text-[#E8A020]" />
                <span>Không giới hạn số lượng bạn bè và tiện ích</span>
              </div>
            </div>
            <button
              onClick={() => {
                toast.success('Tính năng LoopCam Gold đã được kích hoạt miễn phí! 💛')
                setModalType(null)
              }}
              className="w-full py-3 rounded-xl bg-[#E8A020] text-black font-bold text-sm hover:bg-[#E8A020]/90 btn-press"
            >
              Mở khóa ngay
            </button>
          </div>
        </div>
      )}

      {/* Modal: Thông báo */}
      {modalType === 'notifications' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-white" />
                <h3 className="text-lg font-bold text-white">Cài đặt thông báo</h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-white/70 mb-4">
              Nhận thông báo khi bạn bè gửi ảnh mới hoặc có yêu cầu kết bạn.
            </p>
            <button
              onClick={() => {
                toast.success('Đã bật thông báo LoopCam! 🔔')
                setModalType(null)
              }}
              className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90"
            >
              Bật thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
