import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { compressPostImage } from '../lib/imageCompression'

/**
 * Hook to manage the conversation list (Trò chuyện)
 */
export function useConversations() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([])
      setLoading(false)
      return
    }

    try {
      // 1. Fetch all messages involving the current user
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching messages for conversations:', error)
        return
      }

      if (!msgs || msgs.length === 0) {
        setConversations([])
        setTotalUnreadCount(0)
        return
      }

      // 2. Group by partner ID and extract the latest message + unread count
      const partnerMap = new Map()
      let unreadSum = 0

      for (const msg of msgs) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        const isUnread = msg.receiver_id === user.id && !msg.is_read

        if (isUnread) {
          unreadSum++
        }

        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, {
            partnerId,
            lastMessage: msg,
            unreadCount: isUnread ? 1 : 0,
          })
        } else {
          const item = partnerMap.get(partnerId)
          if (isUnread) {
            item.unreadCount++
          }
        }
      }

      setTotalUnreadCount(unreadSum)

      const partnerIds = Array.from(partnerMap.keys())
      if (partnerIds.length === 0) {
        setConversations([])
        return
      }

      // 3. Fetch profiles for all conversation partners
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', partnerIds)

      if (profileErr) {
        console.error('Error fetching partner profiles:', profileErr)
      }

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

      const convList = partnerIds.map((pid) => {
        const item = partnerMap.get(pid)
        const profile = profileMap.get(pid) || {
          id: pid,
          username: 'user',
          full_name: 'Người dùng',
          avatar_url: null,
        }
        return {
          partnerId: pid,
          partner: profile,
          lastMessage: item.lastMessage,
          unreadCount: item.unreadCount,
        }
      })

      // Sort by lastMessage.created_at descending
      convList.sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at))
      setConversations(convList)
    } catch (err) {
      console.error('fetchConversations error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Unique ID per hook instance to avoid duplicate Supabase channel names
  const [instanceId] = useState(() => `conv-${Date.now()}-${Math.floor(Math.random() * 10000)}`)

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchConversations()
    })

    if (!user) return

    // Use a unique channel name per hook instance to prevent
    // "cannot add callbacks after subscribe()" when multiple components
    // call useConversations() simultaneously (e.g. BottomNav + MessagesPage)
    const channelName = `conversations:${user.id}:${instanceId}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const row = payload.new || payload.old
          if (row && (row.sender_id === user.id || row.receiver_id === user.id)) {
            fetchConversations()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchConversations, instanceId])

  return {
    conversations,
    loading,
    totalUnreadCount,
    refreshConversations: fetchConversations,
  }
}

/**
 * Hook to manage a single 1-1 chat session
 */
export function useChat(friendId, initialProfile = null) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [friendProfile, setFriendProfile] = useState(initialProfile || null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const channelRef = useRef(null)

  // Sync initialProfile if provided
  useEffect(() => {
    if (initialProfile) {
      Promise.resolve().then(() => {
        setFriendProfile((prev) => ({ ...(prev || {}), ...initialProfile }))
      })
    }
  }, [initialProfile])

  // Unique instance ID to prevent channel subscription conflicts
  const [instanceId] = useState(() => `chat-${Date.now()}-${Math.floor(Math.random() * 10000)}`)

  // Helper to generate UUID for optimistic updates & insert
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  // Fetch friend profile
  const fetchFriendProfile = useCallback(async () => {
    if (!friendId) return
    try {
      // 1. Direct query from profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', friendId)
        .maybeSingle()

      if (!error && data) {
        setFriendProfile((prev) => ({
          ...(prev || {}),
          ...data,
          avatar_url: data.avatar_url || prev?.avatar_url || null,
        }))
        return
      }

      // 2. Fallback: query from friendships table if direct query returns nothing
      if (user) {
        const { data: f1 } = await supabase
          .from('friendships')
          .select('profiles:friend_id(id, username, full_name, avatar_url)')
          .eq('user_id', user.id)
          .eq('friend_id', friendId)
          .maybeSingle()

        if (f1?.profiles) {
          setFriendProfile((prev) => ({
            ...(prev || {}),
            ...f1.profiles,
            avatar_url: f1.profiles.avatar_url || prev?.avatar_url || null,
          }))
          return
        }

        const { data: f2 } = await supabase
          .from('friendships')
          .select('profiles:user_id(id, username, full_name, avatar_url)')
          .eq('friend_id', user.id)
          .eq('user_id', friendId)
          .maybeSingle()

        if (f2?.profiles) {
          setFriendProfile((prev) => ({
            ...(prev || {}),
            ...f2.profiles,
            avatar_url: f2.profiles.avatar_url || prev?.avatar_url || null,
          }))
          return
        }
      }

      setFriendProfile((prev) =>
        prev || {
          id: friendId,
          username: 'user',
          full_name: 'Bạn bè',
          avatar_url: null,
        }
      )
    } catch (err) {
      console.error('fetchFriendProfile error:', err)
    }
  }, [friendId, user])

  // Mark all unread messages from this friend as read
  const markAsRead = useCallback(async () => {
    if (!user || !friendId) return
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', friendId)
        .eq('receiver_id', user.id)
        .eq('is_read', false)
    } catch (err) {
      console.error('markAsRead error:', err)
    }
  }, [user, friendId])

  // Fetch all messages between user and friend
  const fetchMessages = useCallback(async () => {
    if (!user || !friendId) {
      setMessages([])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching chat messages:', error)
      } else {
        // Ensure no duplicate messages by id
        const seen = new Set()
        const unique = (data || []).filter((m) => {
          if (!m.id || seen.has(m.id)) return false
          seen.add(m.id)
          return true
        })
        setMessages(unique)
        markAsRead()
      }
    } catch (err) {
      console.error('fetchMessages error:', err)
    } finally {
      setLoading(false)
    }
  }, [user, friendId, markAsRead])

  // Subscribe to Realtime messages
  useEffect(() => {
    if (!friendId) return

    Promise.resolve().then(() => {
      fetchFriendProfile()
      if (user) {
        fetchMessages()
      }
    })

    if (!user) return

    const channelName = `chat:${[user.id, friendId].sort().join('-')}:${instanceId}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new
          const isRelated =
            (newMsg.sender_id === user.id && newMsg.receiver_id === friendId) ||
            (newMsg.sender_id === friendId && newMsg.receiver_id === user.id)

          if (isRelated) {
            setMessages((prev) => {
              // 1. If message with this ID already exists, update it (e.g. mark sending: false)
              const existingIdx = prev.findIndex((m) => m.id === newMsg.id)
              if (existingIdx !== -1) {
                const next = [...prev]
                next[existingIdx] = { ...next[existingIdx], ...newMsg, sending: false }
                return next
              }

              // 2. If it was sent by current user and matches a pending optimistic message
              if (newMsg.sender_id === user.id) {
                const pendingIdx = prev.findIndex(
                  (m) => m.sending && m.sender_id === user.id && m.content === newMsg.content
                )
                if (pendingIdx !== -1) {
                  const next = [...prev]
                  next[pendingIdx] = { ...newMsg, sending: false }
                  return next
                }
              }

              // 3. Otherwise append new message
              return [...prev, newMsg]
            })

            if (newMsg.sender_id === friendId) {
              // Mark as read immediately when user is in chat
              supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMsg.id)
                .then(() => {})
                .catch(console.error)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updated = payload.new
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const deletedId = payload.old?.id
          if (deletedId) {
            setMessages((prev) => prev.filter((m) => m.id !== deletedId))
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [user, friendId, fetchFriendProfile, fetchMessages, instanceId])

  // Helper to upload media (photos) to Supabase storage if provided
  const uploadChatMedia = async (file) => {
    if (!file || !user) return null
    setUploadingImage(true)
    try {
      const compressed = await compressPostImage(file)
      const timestamp = Date.now()
      const ext = compressed?.type === 'image/jpeg' ? 'jpg' : 'webp'
      const filePath = `chat/${user.id}/${timestamp}.${ext}`
      const arrayBuffer = await (compressed instanceof Blob ? compressed.arrayBuffer() : file.arrayBuffer())
      const contentType = compressed?.type || file?.type || 'image/webp'

      const { data, error } = await supabase.storage
        .from('photos')
        .upload(filePath, arrayBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: true,
        })

      if (error) throw error

      // Get public URL or signed URL
      const { data: pubData } = supabase.storage.from('photos').getPublicUrl(data.path)
      return pubData?.publicUrl || null
    } catch (err) {
      console.error('uploadChatMedia error:', err)
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  // Send message
  const sendMessage = async (content, imageFile = null) => {
    const trimmed = content?.trim() || ''
    if (!trimmed && !imageFile) return null
    if (!user || !friendId) return null

    setSending(true)
    const messageId = generateUUID()

    let mediaUrl = null
    if (imageFile) {
      mediaUrl = await uploadChatMedia(imageFile)
    }

    // Optimistic UI update with deterministic UUID
    const optimisticMessage = {
      id: messageId,
      sender_id: user.id,
      receiver_id: friendId,
      content: trimmed,
      media_url: mediaUrl,
      is_read: false,
      created_at: new Date().toISOString(),
      sending: true,
    }

    setMessages((prev) => {
      if (prev.some((m) => m.id === messageId)) return prev
      return [...prev, optimisticMessage]
    })

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          sender_id: user.id,
          receiver_id: friendId,
          content: trimmed,
          media_url: mediaUrl,
          is_read: false,
        })
        .select()
        .single()

      if (error) throw error

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...data, sending: false } : m))
      )
      return data
    } catch (err) {
      console.error('sendMessage error:', err)
      // Rollback optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      throw err
    } finally {
      setSending(false)
    }
  }

  // Quick Emoji Sender
  const sendQuickEmoji = async (emoji) => {
    return sendMessage(emoji)
  }

  return {
    messages,
    friendProfile,
    loading,
    sending,
    uploadingImage,
    sendMessage,
    sendQuickEmoji,
    markAsRead,
    refreshMessages: fetchMessages,
  }
}
