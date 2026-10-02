import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { removeStorageFile } from '../lib/storageUtils'

// Helper: Format a Date to 'YYYY-MM-DD' in local time
export function formatDateKey(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Calculate continuous photo-taking streak ending at today or yesterday from real photo dates
export function calculateStreak(dateStrings) {
  if (!dateStrings || dateStrings.length === 0) return 0

  const dateSet = new Set(dateStrings)
  const now = new Date()
  const todayKey = formatDateKey(now)

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = formatDateKey(yesterday)

  let streak = 0
  let cursor = new Date(now)

  // If user took a photo today, count backwards from today
  if (dateSet.has(todayKey)) {
    while (dateSet.has(formatDateKey(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }

  // If user hasn't taken a photo today, check if yesterday had one (streak still unbroken today)
  if (dateSet.has(yesterdayKey)) {
    cursor = yesterday
    while (dateSet.has(formatDateKey(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }

  return 0
}

export function useMemories() {
  const { user } = useAuth()
  const [realPosts, setRealPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef(null)

  // Resolve signed or public URL from Supabase storage
  const getSignedUrl = useCallback(async (imagePath) => {
    if (!imagePath) return ''
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath
    }

    try {
      const { data: pubData } = supabase.storage.from('photos').getPublicUrl(imagePath)
      if (pubData?.publicUrl) return pubData.publicUrl

      const { data, error } = await supabase.storage
        .from('photos')
        .createSignedUrl(imagePath, 3600)
      if (!error && data?.signedUrl) return data.signedUrl
    } catch {
      // fallback
    }
    return ''
  }, [])

  // Fetch only REAL posts created by CURRENT user from Supabase database
  const fetchUserPosts = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, image_path, caption, created_at, sender_id')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('fetchUserPosts error:', error)
        return
      }

      const formatted = await Promise.all(
        (data || []).map(async (p) => {
          const url = await getSignedUrl(p.image_path)
          return {
            ...p,
            signedImageUrl: url,
            isMine: true,
          }
        })
      )

      setRealPosts(formatted)
    } catch (err) {
      console.error('fetchUserPosts failed:', err)
    } finally {
      setLoading(false)
    }
  }, [user, getSignedUrl])

  // Realtime subscription for user's own new/deleted posts
  useEffect(() => {
    if (!user) return

    Promise.resolve().then(() => {
      fetchUserPosts()
    })

    const channel = supabase
      .channel(`memories-user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `sender_id=eq.${user.id}`,
        },
        async () => {
          fetchUserPosts()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [user, fetchUserPosts])

  // Map real database memories by 'YYYY-MM-DD'
  const postsByDate = useMemo(() => {
    const map = new Map()
    for (const post of realPosts) {
      const key = formatDateKey(post.created_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(post)
    }
    return map
  }, [realPosts])

  // Dates set for streak calculation (strictly from user's real photos)
  const streak = useMemo(() => {
    const dates = Array.from(postsByDate.keys())
    return calculateStreak(dates)
  }, [postsByDate])

  // Total Locket count: strictly real posts count from database
  const totalPhotos = realPosts.length

  // Delete a user post directly from database and remove image from storage
  const deleteMemory = useCallback(
    async (postId) => {
      if (!user || !postId) return

      // Find image_path before deletion
      let imagePath = realPosts.find((p) => p.id === postId)?.image_path

      // Optimistic delete
      setRealPosts((prev) => prev.filter((p) => p.id !== postId))

      try {
        if (!imagePath) {
          const { data: postRecord } = await supabase
            .from('posts')
            .select('image_path')
            .eq('id', postId)
            .eq('sender_id', user.id)
            .maybeSingle()
          imagePath = postRecord?.image_path
        }

        await supabase.from('post_recipients').delete().eq('post_id', postId)
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId)
          .eq('sender_id', user.id)

        if (error) throw error

        // CLEAN UP STORAGE: Remove photo file from Supabase Storage bucket 'photos'
        if (imagePath) {
          await removeStorageFile(imagePath, 'photos')
        }
      } catch (err) {
        console.error('deleteMemory error:', err)
        fetchUserPosts()
        throw err
      }
    },
    [user, realPosts, fetchUserPosts]
  )

  // Current calendar state
  const [todayKey] = useState(() => formatDateKey(new Date()))
  const hasPhotoToday = (postsByDate.get(todayKey) || []).length > 0

  return {
    memories: realPosts,
    postsByDate,
    loading,
    totalPhotos,
    streak,
    todayKey,
    hasPhotoToday,
    deleteMemory,
    refreshMemories: fetchUserPosts,
  }
}
