import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useFriends() {
  const { user } = useAuth()
  const [friends, setFriends] = useState([])
  const [pendingReceived, setPendingReceived] = useState([])
  const [pendingSent, setPendingSent] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch accepted friends (both directions)
  const fetchFriends = useCallback(async () => {
    if (!user) return
    setLoading(true)

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

      if (e1) console.error(e1)
      if (e2) console.error(e2)

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
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fetch pending requests received
  const fetchPendingReceived = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('friendships')
      .select('id, user_id, created_at, profiles:user_id(id, username, full_name, avatar_url)')
      .eq('friend_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('fetchPendingReceived:', error)
      return
    }

    setPendingReceived(
      (data || []).map((f) => ({
        friendshipId: f.id,
        profile: f.profiles,
        createdAt: f.created_at,
      }))
    )
  }, [user])

  // Fetch pending requests sent
  const fetchPendingSent = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('friendships')
      .select('id, friend_id, created_at, profiles:friend_id(id, username, full_name, avatar_url)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('fetchPendingSent:', error)
      return
    }

    setPendingSent(
      (data || []).map((f) => ({
        friendshipId: f.id,
        profile: f.profiles,
        createdAt: f.created_at,
      }))
    )
  }, [user])

  // Search users by username or full name
  const searchUsers = async (query) => {
    if (!query.trim() || !user) return []
    const clean = query.trim().replace(/^@/, '')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.%${clean}%,full_name.ilike.%${clean}%`)
      .neq('id', user.id)
      .limit(20)

    if (error) {
      console.error('searchUsers:', error)
      return []
    }

    return data || []
  }

  // Send friend request
  const sendFriendRequest = async (friendId) => {
    if (!user) throw new Error('Not authenticated')

    // Check if friendship already exists (both directions)
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
  }

  // Accept friend request
  const acceptRequest = async (friendshipId) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)

    if (error) throw error
    await Promise.all([fetchFriends(), fetchPendingReceived()])
  }

  // Reject friend request
  const rejectRequest = async (friendshipId) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)

    if (error) throw error
    await fetchPendingReceived()
  }

  // Remove friend
  const removeFriend = async (friendshipId) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)

    if (error) throw error
    await fetchFriends()
  }

  // Get friendship status with a specific user
  const getFriendshipStatus = (userId) => {
    if (friends.some((f) => f.profile?.id === userId)) return 'accepted'
    if (pendingSent.some((f) => f.profile?.id === userId)) return 'pending_sent'
    if (pendingReceived.some((f) => f.profile?.id === userId)) return 'pending_received'
    return 'none'
  }

  // Load all data on mount
  useEffect(() => {
    if (!user) return

    let cancelled = false
    const load = async () => {
      await fetchFriends()
      if (!cancelled) {
        await fetchPendingReceived()
        await fetchPendingSent()
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user, fetchFriends, fetchPendingReceived, fetchPendingSent])

  return {
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
    fetchFriends,
    fetchPendingReceived,
    fetchPendingSent,
  }
}
