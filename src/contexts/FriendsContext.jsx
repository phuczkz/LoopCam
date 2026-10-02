import { createContext, useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export const FriendsContext = createContext(null)

export function FriendsProvider({ children }) {
  const { user } = useAuth()
  const [friends, setFriends] = useState([])
  const [pendingReceived, setPendingReceived] = useState([])
  const [pendingSent, setPendingSent] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch accepted friends (both directions)
  const fetchFriends = useCallback(async () => {
    if (!user) {
      setFriends([])
      return
    }

    try {
      // Friends where I'm user_id
      const { data: asSender, error: e1 } = await supabase
        .from('friendships')
        .select('id, friend_id, created_at, profiles:friend_id(id, username, full_name, avatar_url)')
        .eq('user_id', user.id)
        .eq('status', 'accepted')

      // Friends where I'm friend_id
      const { data: asReceiver, error: e2 } = await supabase
        .from('friendships')
        .select('id, user_id, created_at, profiles:user_id(id, username, full_name, avatar_url)')
        .eq('friend_id', user.id)
        .eq('status', 'accepted')

      if (e1) console.error('fetchFriends e1:', e1)
      if (e2) console.error('fetchFriends e2:', e2)

      const friendsList = [
        ...(asSender || []).map((f) => {
          const prof = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
          const friendId = f.friend_id
          return {
            friendshipId: f.id,
            friendId,
            profile: prof || { id: friendId, full_name: 'Bạn bè', username: 'friend', avatar_url: null },
            createdAt: f.created_at,
          }
        }),
        ...(asReceiver || []).map((f) => {
          const prof = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
          const friendId = f.user_id
          return {
            friendshipId: f.id,
            friendId,
            profile: prof || { id: friendId, full_name: 'Bạn bè', username: 'friend', avatar_url: null },
            createdAt: f.created_at,
          }
        }),
      ]

      setFriends(friendsList)
    } catch (err) {
      console.error('fetchFriends error:', err)
    }
  }, [user])

  // Fetch pending requests received
  const fetchPendingReceived = useCallback(async () => {
    if (!user) {
      setPendingReceived([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, user_id, created_at, profiles:user_id(id, username, full_name, avatar_url)')
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('fetchPendingReceived error:', error)
        return
      }

      setPendingReceived(
        (data || []).map((f) => ({
          friendshipId: f.id,
          profile: Array.isArray(f.profiles) ? f.profiles[0] : f.profiles,
          createdAt: f.created_at,
        }))
      )
    } catch (err) {
      console.error('fetchPendingReceived error:', err)
    }
  }, [user])

  // Fetch pending requests sent
  const fetchPendingSent = useCallback(async () => {
    if (!user) {
      setPendingSent([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, friend_id, created_at, profiles:friend_id(id, username, full_name, avatar_url)')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('fetchPendingSent error:', error)
        return
      }

      setPendingSent(
        (data || []).map((f) => ({
          friendshipId: f.id,
          profile: Array.isArray(f.profiles) ? f.profiles[0] : f.profiles,
          createdAt: f.created_at,
        }))
      )
    } catch (err) {
      console.error('fetchPendingSent error:', err)
    }
  }, [user])

  // Refresh all friends-related data
  const refreshFriends = useCallback(async () => {
    await Promise.all([fetchFriends(), fetchPendingReceived(), fetchPendingSent()])
  }, [fetchFriends, fetchPendingReceived, fetchPendingSent])

  // Search users by username or full name
  const searchUsers = useCallback(
    async (query) => {
      if (!query.trim() || !user) return []
      const clean = query.trim().replace(/^@/, '')

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${clean}%,full_name.ilike.%${clean}%`)
        .neq('id', user.id)
        .limit(20)

      if (error) {
        console.error('searchUsers error:', error)
        return []
      }

      return data || []
    },
    [user]
  )

  // Send friend request
  const sendFriendRequest = useCallback(
    async (friendId) => {
      if (!user) throw new Error('Not authenticated')

      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
        )
        .limit(1)

      if (existing && existing.length > 0) {
        const status = existing[0].status
        if (status === 'accepted') throw new Error('Already friends!')
        if (status === 'pending') throw new Error('Request already sent!')
        if (status === 'blocked') throw new Error('Cannot send request')
      }

      const { error } = await supabase.from('friendships').insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending',
      })

      if (error) throw error
      await fetchPendingSent()
    },
    [user, fetchPendingSent]
  )

  // Accept friend request
  const acceptRequest = useCallback(
    async (friendshipId) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)

      if (error) throw error
      await Promise.all([fetchFriends(), fetchPendingReceived()])
    },
    [fetchFriends, fetchPendingReceived]
  )

  // Reject friend request
  const rejectRequest = useCallback(
    async (friendshipId) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) throw error
      await fetchPendingReceived()
    },
    [fetchPendingReceived]
  )

  // Remove friend
  const removeFriend = useCallback(
    async (friendshipId) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) throw error
      await fetchFriends()
    },
    [fetchFriends]
  )

  // Get friendship status with a specific user
  const getFriendshipStatus = useCallback(
    (userId) => {
      if (friends.some((f) => f.profile?.id === userId)) return 'accepted'
      if (pendingSent.some((f) => f.profile?.id === userId)) return 'pending_sent'
      if (pendingReceived.some((f) => f.profile?.id === userId)) return 'pending_received'
      return 'none'
    },
    [friends, pendingSent, pendingReceived]
  )

  // Sync and Realtime setup
  useEffect(() => {
    if (!user) {
      setFriends([])
      setPendingReceived([])
      setPendingSent([])
      return
    }

    setLoading(true)
    Promise.all([fetchFriends(), fetchPendingReceived(), fetchPendingSent()]).finally(() => {
      setLoading(false)
    })

    // Setup Supabase Realtime subscription for friendships
    const channelName = `friendships_realtime_${user.id}_${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        (payload) => {
          const row = payload.new || payload.old
          if (!row || row.user_id === user.id || row.friend_id === user.id) {
            fetchFriends()
            fetchPendingReceived()
            fetchPendingSent()
          }
        }
      )
      .subscribe()

    // Sync when returning to tab
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        fetchFriends()
        fetchPendingReceived()
        fetchPendingSent()
      }
    }
    window.addEventListener('focus', handleSync)
    document.addEventListener('visibilitychange', handleSync)

    // Periodic sync interval (every 12 seconds when page is visible)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPendingReceived()
      }
    }, 12000)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('focus', handleSync)
      document.removeEventListener('visibilitychange', handleSync)
      clearInterval(interval)
    }
  }, [user, fetchFriends, fetchPendingReceived, fetchPendingSent])

  const pendingReceivedCount = pendingReceived.length

  const value = {
    friends,
    pendingReceived,
    pendingSent,
    pendingReceivedCount,
    loading,
    searchUsers,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    getFriendshipStatus,
    fetchFriends,
    fetchPendingReceived,
    fetchPendingSent,
    refreshFriends,
  }

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>
}
