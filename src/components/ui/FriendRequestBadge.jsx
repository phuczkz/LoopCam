import React from 'react'

/**
 * Badge showing the count of pending friend requests (1, 2, ... or 99+)
 * Designed with Apple/Locket aesthetics: crisp rose pill/circle, bold number, ring outline.
 */
export function FriendRequestBadge({
  count,
  className = '-top-1 -right-1 ring-2 ring-black',
}) {
  if (!count || count <= 0) return null

  return (
    <span
      className={`absolute min-w-[19px] h-[19px] px-1 rounded-full bg-accent-rose text-white text-[10px] font-bold leading-none flex items-center justify-center shadow-md pointer-events-none z-20 animate-scale-in select-none ${className}`}
      aria-label={`${count} lời mời kết bạn mới`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
