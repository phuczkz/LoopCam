/**
 * Date formatting helpers for LoopCam messaging
 */

export function formatConversationTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  if (isYesterday) {
    return 'Hôm qua'
  }

  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()

  if (year === now.getFullYear()) {
    return `${day} thg ${month}`
  }
  return `${day}/${month}/${year}`
}

export function formatChatDivider(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const isPM = hours >= 12
  const hour12 = hours % 12 || 12
  const period = isPM ? 'CH' : 'SA'
  const timeStr = `${hour12}:${minutes} ${period}`

  if (isToday) {
    return `Hôm nay ${timeStr}`
  }
  if (isYesterday) {
    return `Hôm qua ${timeStr}`
  }

  const day = date.getDate()
  const month = date.getMonth() + 1
  return `${day} thg ${month} ${timeStr}`
}
