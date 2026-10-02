import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useMemories } from '../hooks/useMemories'
import { useFriends } from '../hooks/useFriends'
import { MonthCard } from '../components/memories/MonthCard'
import { MonthConnector } from '../components/memories/MonthConnector'
import { PhotoViewerModal } from '../components/memories/PhotoViewerModal'
import { Avatar } from '../components/ui/Avatar'
import { FriendRequestBadge } from '../components/ui/FriendRequestBadge'
import { Spinner } from '../components/ui/Spinner'
import { Heart, Flame } from 'lucide-react'

// Generate calendar cells for a given month and year
function buildMonthData(year, month, postsByDate, todayKey) {
  // month: 1-12
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0 = Sunday
  const totalDays = new Date(year, month, 0).getDate()

  const today = new Date()
  const curYear = today.getFullYear()
  const curMonth = today.getMonth() + 1
  const curDay = today.getDate()

  const days = []

  // Empty leading days before 1st of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({
      type: 'empty',
      id: `empty-${year}-${month}-${i}`,
    })
  }

  // Days in month
  for (let d = 1; d <= totalDays; d++) {
    const dStr = String(d).padStart(2, '0')
    const mStr = String(month).padStart(2, '0')
    const dateKey = `${year}-${mStr}-${dStr}`

    const isToday = dateKey === todayKey
    const isPast =
      year < curYear ||
      (year === curYear && month < curMonth) ||
      (year === curYear && month === curMonth && d < curDay)
    const isFuture =
      year > curYear ||
      (year === curYear && month > curMonth) ||
      (year === curYear && month === curMonth && d > curDay)

    const posts = postsByDate.get(dateKey) || []
    const hasPhoto = posts.length > 0
    const isOct31 = month === 10 && d === 31

    days.push({
      type: 'day',
      id: dateKey,
      day: d,
      dateKey,
      isToday,
      isPast,
      isFuture,
      hasPhoto,
      posts,
      thumbnail: hasPhoto ? posts[posts.length - 1].signedImageUrl : null,
      isOct31,
    })
  }

  return {
    year,
    month,
    title: `tháng ${month} ${year}`,
    days,
    isCurrentMonth: year === curYear && month === curMonth,
  }
}

export function MemoriesPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { memories, postsByDate, todayKey, totalPhotos, streak, loading, deleteMemory } =
    useMemories()
  const { pendingReceivedCount } = useFriends()

  const [activePhotoGroup, setActivePhotoGroup] = useState(null) // { posts, dateKey }
  const [currentDate] = useState(() => new Date())

  // Dynamically determine months to display based on user's real posts in database + current date
  const monthsList = useMemo(() => {
    const curY = currentDate.getFullYear()
    const curM = currentDate.getMonth() + 1

    // Default start from month prior to current month
    let startY = curY
    let startM = curM - 1
    if (startM < 1) {
      startY -= 1
      startM = 12
    }

    // Expand backwards if user has earlier posts in database
    for (const post of memories) {
      if (post.created_at) {
        const pd = new Date(post.created_at)
        const py = pd.getFullYear()
        const pm = pd.getMonth() + 1
        if (py < startY || (py === startY && pm < startM)) {
          startY = py
          startM = pm
        }
      }
    }

    const list = []
    let y = startY
    let m = startM

    while (y < curY || (y === curY && m <= curM)) {
      list.push(buildMonthData(y, m, postsByDate, todayKey))
      m++
      if (m > 12) {
        m = 1
        y++
      }
    }

    return list
  }, [memories, postsByDate, todayKey, currentDate])

  return (
    <div className="w-full min-h-full flex flex-col bg-black text-white select-none">
      {/* ── Top Header matching Screenshot 1 ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-black/85 backdrop-blur-xl">
        {/* Invisible spacer for balance */}
        <div className="w-10 h-10" />

        {/* Center Title: "Kỷ niệm" */}
        <h1 className="text-white text-[19px] font-bold tracking-tight text-center">
          Kỷ niệm
        </h1>

        {/* Top-Right Avatar of Real Current User */}
        <button
          onClick={() => navigate('/profile')}
          className="relative active:scale-95 transition-transform flex-shrink-0 cursor-pointer flex items-center justify-center"
          title="Trang cá nhân"
          aria-label="Trang cá nhân"
        >
          <Avatar
            src={profile?.avatar_url}
            alt={profile?.username || 'User'}
            size={38}
            className="ring-2 ring-white/15 shadow-md"
          />
          <FriendRequestBadge count={pendingReceivedCount} />
        </button>
      </header>

      {/* ── Main Scrollable Body ── */}
      <div className="flex-1 px-3 sm:px-4 pt-1 pb-12 flex flex-col items-center max-w-[430px] mx-auto w-full">
        {loading && memories.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size={24} />
          </div>
        ) : (
          monthsList.map((monthData, idx) => {
            const isLast = idx === monthsList.length - 1

            return (
              <div
                key={`${monthData.year}-${monthData.month}`}
                className="w-full flex flex-col items-center"
              >
                {/* Month Card */}
                <MonthCard
                  monthData={monthData}
                  onSelectPhoto={(posts, dateKey) =>
                    setActivePhotoGroup({ posts, dateKey })
                  }
                  onTakePhoto={() => navigate('/camera')}
                />

                {/* Dashed curvy connector between months */}
                {!isLast && <MonthConnector />}

                {/* For the current/last month, also show connector + badge (Image 2) */}
                {isLast && (
                  <>
                    <MonthConnector />

                    {/* Real Database Locket Count & Streak Badge */}
                    <div className="w-full flex justify-center mb-6">
                      <div className="inline-flex items-center gap-3.5 px-6 py-2.5 rounded-full bg-[#141414] border border-white/10 shadow-2xl text-white text-[14px] font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Heart size={15} className="text-[#CCFF00] fill-[#CCFF00]" />
                          <span>{totalPhotos} LoopCam</span>
                        </span>
                        <span className="text-white/20 select-none">|</span>
                        <span className="flex items-center gap-1.5">
                          <Flame size={15} className="text-orange-500 fill-orange-500" />
                          <span>chuỗi {streak} ngày</span>
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── Photo Detail Lightbox Modal ── */}
      {activePhotoGroup && (
        <PhotoViewerModal
          posts={activePhotoGroup.posts}
          dateKey={activePhotoGroup.dateKey}
          onClose={() => setActivePhotoGroup(null)}
          onDelete={deleteMemory}
        />
      )}
    </div>
  )
}
