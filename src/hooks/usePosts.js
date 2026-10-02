import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { compressPostImage } from '../lib/imageCompression'
import { removeStorageFile } from '../lib/storageUtils'

// In-memory cache for resolved image URLs
const resolvedUrlCache = new Map()

export function usePosts() {
  const { user } = useAuth()
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const channelRef = useRef(null)

  // Resolve image URL (checks cache -> tries signed URL -> falls back to public URL)
  const getSignedUrl = useCallback(async (imagePath) => {
    if (!imagePath) return ''

    // 1. Direct absolute URL
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath
    }

    // 2. Check in-memory cache
    const cached = resolvedUrlCache.get(imagePath)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url
    }

    // 3. Prefer permanent public URL ('photos' bucket is public and permanent)
    const { data: pubData } = supabase.storage.from('photos').getPublicUrl(imagePath)
    const publicUrl = pubData?.publicUrl || ''

    if (publicUrl) {
      resolvedUrlCache.set(imagePath, {
        url: publicUrl,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      })
      return publicUrl
    }

    // 4. Fallback to signed URL (if photos bucket is private)
    try {
      const { data, error } = await supabase.storage
        .from('photos')
        .createSignedUrl(imagePath, 86400) // 24 hours

      if (!error && data?.signedUrl) {
        resolvedUrlCache.set(imagePath, {
          url: data.signedUrl,
          expiresAt: Date.now() + 23 * 60 * 60 * 1000,
        })
        return data.signedUrl
      }
    } catch (err) {
      console.warn('createSignedUrl error:', err)
    }

    return ''
  }, [])

  // Fetch feed: includes user's own posts, posts sent directly to user, and posts by accepted friends
  const fetchFeed = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      // 1. Fetch posts received by current user via post_recipients
      const { data: recipientRows, error: rErr } = await supabase
        .from('post_recipients')
        .select(`
          created_at,
          posts (
            id, image_path, caption, created_at, sender_id,
            profiles:sender_id (id, full_name, username, avatar_url)
          )
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (rErr) {
        console.warn('fetchFeed recipients error:', rErr)
      }

      // 2. Fetch posts created by current user
      const { data: myPosts, error: mErr } = await supabase
        .from('posts')
        .select(`
          id, image_path, caption, created_at, sender_id,
          profiles:sender_id (id, full_name, username, avatar_url)
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (mErr) {
        console.warn('fetchFeed myPosts error:', mErr)
      }

      // 3. Fetch friend IDs to also include recent posts from accepted friends
      let friendsPosts = []
      try {
        const { data: asSender } = await supabase
          .from('friendships')
          .select('friend_id')
          .eq('user_id', user.id)
          .eq('status', 'accepted')

        const { data: asReceiver } = await supabase
          .from('friendships')
          .select('user_id')
          .eq('friend_id', user.id)
          .eq('status', 'accepted')

        const friendIds = Array.from(
          new Set([
            ...(asSender || []).map((f) => f.friend_id),
            ...(asReceiver || []).map((f) => f.user_id),
          ].filter(Boolean))
        )

        if (friendIds.length > 0) {
          const { data: fPosts, error: fErr } = await supabase
            .from('posts')
            .select(`
              id, image_path, caption, created_at, sender_id,
              profiles:sender_id (id, full_name, username, avatar_url)
            `)
            .in('sender_id', friendIds)
            .order('created_at', { ascending: false })
            .limit(100)

          if (!fErr && fPosts) {
            friendsPosts = fPosts
          }
        }
      } catch (fErr) {
        console.warn('fetchFeed friends query error:', fErr)
      }

      // Combine and deduplicate by post id
      const postMap = new Map()

      // Add posts received via recipients
      for (const item of (recipientRows || [])) {
        if (item.posts && !postMap.has(item.posts.id)) {
          postMap.set(item.posts.id, {
            ...item.posts,
            receivedAt: item.created_at,
          })
        }
      }

      // Add friends' posts
      for (const p of friendsPosts) {
        if (p && !postMap.has(p.id)) {
          postMap.set(p.id, p)
        }
      }

      // Add my own posts
      for (const p of (myPosts || [])) {
        if (p && !postMap.has(p.id)) {
          postMap.set(p.id, p)
        }
      }

      // Sort newest first
      const allPosts = Array.from(postMap.values()).sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )

      // Resolve signed/public URLs and format sender info
      const postsWithUrls = await Promise.all(
        allPosts.map(async (post) => {
          const resolvedUrl = await getSignedUrl(post.image_path)
          const isMine = post.sender_id === user.id
          const senderProfile = post.profiles || {}

          return {
            ...post,
            signedImageUrl: resolvedUrl,
            isMine,
            senderName: isMine
              ? 'Bạn'
              : (senderProfile.full_name || senderProfile.username || 'Bạn bè'),
            senderAvatar: senderProfile.avatar_url || null,
          }
        })
      )

      setFeed(postsWithUrls)
    } catch (err) {
      console.error('fetchFeed error:', err)
    } finally {
      setLoading(false)
    }
  }, [user, getSignedUrl])

  // Send a post: compress → upload → insert post → insert recipients
  const sendPost = useCallback(
    async ({ imageFile, caption, recipientIds = [] }) => {
      if (!user) throw new Error('Not authenticated')
      if (!imageFile) throw new Error('No image provided')

      setSending(true)

      try {
        // 1. Ensure image is compressed to WebP (1080px max, ~90-200KB, saves ~95% storage)
        const compressedFile = await compressPostImage(imageFile)

        // 2. Upload to storage (ArrayBuffer for universal compatibility)
        const timestamp = Date.now()
        const ext = compressedFile.type === 'image/webp' ? 'webp' : 'jpg'
        const filePath = `${user.id}/${timestamp}.${ext}`
        const arrayBuffer = await compressedFile.arrayBuffer()
        const contentType = compressedFile.type || 'image/webp'

        const { data: storageData, error: storageError } = await supabase.storage
          .from('photos')
          .upload(filePath, arrayBuffer, {
            contentType,
            cacheControl: '3600',
            upsert: true,
          })

        if (storageError) {
          console.error('Storage upload error:', storageError)
          if (storageError.message?.toLowerCase().includes('bucket not found')) {
            throw new Error("Chưa tạo bucket 'photos' trên Supabase Storage. Hãy tạo bucket 'photos'!")
          }
          throw new Error(`Lỗi tải ảnh (${storageError.message || storageError.error || 'Storage error'})`)
        }

        // 3. Insert post
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .insert({
            sender_id: user.id,
            image_path: storageData.path,
            caption: caption?.trim() || null,
          })
          .select(`
            id, image_path, caption, created_at, sender_id,
            profiles:sender_id (id, full_name, username, avatar_url)
          `)
          .single()

        if (postError) throw postError

        // 4. Insert recipients: all selected friends + current user so recipient queries find it
        const cleanRecipients = Array.from(
          new Set([...(recipientIds || []), user.id].filter(Boolean))
        )

        if (cleanRecipients.length > 0) {
          const recipientRows = cleanRecipients.map((recipientId) => ({
            post_id: postData.id,
            recipient_id: recipientId,
          }))

          const { error: recipientError } = await supabase
            .from('post_recipients')
            .insert(recipientRows)

          if (recipientError) {
            console.warn('post_recipients insert warning:', recipientError)
          }
        }

        // 5. Resolve image URL and prepend immediately to local feed
        const resolvedUrl = await getSignedUrl(postData.image_path)
        const newPostItem = {
          ...postData,
          signedImageUrl: resolvedUrl,
          isMine: true,
          senderName: 'Bạn',
          senderAvatar: postData.profiles?.avatar_url || null,
        }

        setFeed((prev) => [newPostItem, ...prev.filter((p) => p.id !== postData.id)])

        return postData
      } finally {
        setSending(false)
      }
    },
    [user, getSignedUrl]
  )

  // Delete a post (only allowed for posts authored by user)
  const deletePost = useCallback(
    async (postId) => {
      if (!user || !postId) return

      try {
        // 1. Locate post to get image_path for storage cleanup
        let imagePath = feed.find((p) => p.id === postId)?.image_path
        if (!imagePath) {
          const { data: existingPost } = await supabase
            .from('posts')
            .select('image_path')
            .eq('id', postId)
            .eq('sender_id', user.id)
            .maybeSingle()
          imagePath = existingPost?.image_path
        }

        // Optimistic remove from local feed
        setFeed((prev) => prev.filter((p) => p.id !== postId))

        // 2. Remove from post_recipients
        await supabase.from('post_recipients').delete().eq('post_id', postId)

        // 3. Remove from posts
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId)
          .eq('sender_id', user.id)

        if (error) throw error

        // 4. CLEAN UP STORAGE: Remove photo file from Supabase Storage bucket 'photos'
        if (imagePath) {
          await removeStorageFile(imagePath, 'photos')
        }
      } catch (err) {
        console.error('deletePost error:', err)
        await fetchFeed()
        throw err
      }
    },
    [user, feed, fetchFeed]
  )

  // Subscribe to realtime new posts and recipients
  const subscribeToNewPosts = useCallback(() => {
    if (!user || channelRef.current) return

    const channel = supabase
      .channel('feed-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_recipients',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const { data, error } = await supabase
            .from('posts')
            .select('id, image_path, caption, created_at, sender_id, profiles:sender_id(id, full_name, username, avatar_url)')
            .eq('id', payload.new.post_id)
            .single()

          if (!error && data) {
            const resolvedUrl = await getSignedUrl(data.image_path)
            const isMine = data.sender_id === user.id
            const newPost = {
              ...data,
              signedImageUrl: resolvedUrl,
              receivedAt: payload.new.created_at,
              isMine,
              senderName: isMine ? 'Bạn' : (data.profiles?.full_name || data.profiles?.username || 'Bạn bè'),
              senderAvatar: data.profiles?.avatar_url || null,
            }

            setFeed((prev) => {
              if (prev.some((p) => p.id === newPost.id)) return prev
              return [newPost, ...prev]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        async (payload) => {
          // If post is by me, or if we want to check it
          const newId = payload.new?.id
          if (!newId) return

          // Fetch full post with profiles
          const { data, error } = await supabase
            .from('posts')
            .select('id, image_path, caption, created_at, sender_id, profiles:sender_id(id, full_name, username, avatar_url)')
            .eq('id', newId)
            .single()

          if (!error && data) {
            const resolvedUrl = await getSignedUrl(data.image_path)
            const isMine = data.sender_id === user.id
            const newPost = {
              ...data,
              signedImageUrl: resolvedUrl,
              isMine,
              senderName: isMine ? 'Bạn' : (data.profiles?.full_name || data.profiles?.username || 'Bạn bè'),
              senderAvatar: data.profiles?.avatar_url || null,
            }

            setFeed((prev) => {
              if (prev.some((p) => p.id === newPost.id)) return prev
              return [newPost, ...prev]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          const deletedId = payload.old?.id
          if (deletedId) {
            setFeed((prev) => prev.filter((p) => p.id !== deletedId))
          }
        }
      )
      .subscribe()

    channelRef.current = channel
  }, [user, getSignedUrl])

  // Unsubscribe from realtime
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  // Auto fetch and subscribe on mount
  useEffect(() => {
    if (!user) return

    let cancelled = false
    const load = async () => {
      await fetchFeed()
      if (!cancelled) {
        subscribeToNewPosts()
      }
    }

    load()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [user, fetchFeed, subscribeToNewPosts, unsubscribe])

  return {
    feed,
    loading,
    sending,
    fetchFeed,
    sendPost,
    deletePost,
    getSignedUrl,
  }
}
