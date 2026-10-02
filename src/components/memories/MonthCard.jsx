import { memo } from 'react'
import { Plus } from 'lucide-react'

export const MonthCard = memo(function MonthCard({
  monthData,
  onSelectPhoto,
  onTakePhoto,
}) {
  const { title, days } = monthData

  return (
    <section className="w-full bg-[#161616] rounded-[28px] sm:rounded-[32px] p-4 sm:p-5 shadow-2xl border border-white/[0.04]">
      {/* Month Header (e.g. "tháng 9 2026", "tháng 10 2026") */}
      <h2 className="text-white font-bold text-[17px] sm:text-[18px] tracking-tight mb-3.5 px-0.5 select-none">
        {title}
      </h2>

      {/* 7-column calendar grid matching Locket Widget */}
      <div className="grid grid-cols-7 gap-2 sm:gap-2.5 items-center justify-items-center">
        {days.map((cell) => {
          // 1. Leading empty cells before the 1st of the month
          if (cell.type === 'empty') {
            return (
              <div
                key={cell.id}
                className="w-full aspect-square pointer-events-none select-none"
                aria-hidden="true"
              />
            )
          }

          // 2. Day has photos (user's photo thumbnail)
          if (cell.hasPhoto) {
            return (
              <button
                key={cell.id}
                onClick={() => onSelectPhoto(cell.posts, cell.dateKey)}
                className="w-full aspect-square rounded-[11px] sm:rounded-[13px] overflow-hidden relative group active:scale-95 transition-transform cursor-pointer shadow-md bg-dark-800 ring-1 ring-white/10 hover:ring-white/30"
                aria-label={`Xem ảnh ngày ${cell.day}`}
                title={`Ngày ${cell.day}`}
              >
                <img
                  src={cell.thumbnail}
                  alt={`Kỷ niệm ${cell.dateKey}`}
                  loading="lazy"
                  className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-200 group-hover:scale-105"
                />

                {/* If multiple photos on that date, show a subtle pill badge */}
                {cell.posts.length > 1 && (
                  <span className="absolute top-1 right-1 px-1 py-0.2 rounded-full bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white leading-none">
                    {cell.posts.length}
                  </span>
                )}

                {/* If it's today with photo, wrap with a subtle gold accent ring */}
                {cell.isToday && (
                  <div className="absolute inset-0 rounded-[11px] sm:rounded-[13px] border-[2px] border-[#F59E0B] pointer-events-none" />
                )}
              </button>
            )
          }

          // 3. TODAY without photo -> Yellow rounded square with "+"
          if (cell.isToday) {
            return (
              <button
                key={cell.id}
                onClick={onTakePhoto}
                className="w-full aspect-square rounded-[11px] sm:rounded-[13px] border-[2.5px] border-[#F59E0B] bg-[#1d190d] flex items-center justify-center transition-all active:scale-90 hover:scale-105 shadow-lg shadow-[#F59E0B]/20 cursor-pointer"
                aria-label="Chụp ảnh hôm nay"
                title="Chụp ảnh hôm nay (+)"
              >
                <Plus size={20} strokeWidth={3} className="text-[#F59E0B]" />
              </button>
            )
          }

          // 4. Past day without photo -> Circular dot
          if (cell.isPast) {
            return (
              <div
                key={cell.id}
                className="w-full aspect-square flex items-center justify-center select-none"
                aria-label={`Ngày ${cell.day} không có ảnh`}
              >
                <div className="w-2 h-2 rounded-full bg-white/20" />
              </div>
            )
          }

          // 5. Future day -> Sleek grey rounded square (with pumpkin on Oct 31)
          return (
            <div
              key={cell.id}
              className="w-full aspect-square rounded-[11px] sm:rounded-[13px] bg-[#242424] flex items-center justify-center select-none shadow-inner"
              aria-label={`Ngày ${cell.day}`}
            >
              {cell.isOct31 && (
                <span
                  className="text-[16px] sm:text-[17px] leading-none"
                  role="img"
                  aria-label="Halloween 🎃"
                >
                  🎃
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
})
