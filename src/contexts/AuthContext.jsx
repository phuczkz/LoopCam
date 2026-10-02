import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'
import { getDefaultAvatar } from '../lib/avatarUtils'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const userRef = useRef(null)

  useEffect(() => {
    userRef.current = user
  }, [user])

  // Fetch user profile from profiles table with fallback
  const fetchProfile = useCallback(async (userId, currentUser = null) => {
    if (!userId) return null
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) {
        setProfile(data)
        return data
      }

      // If no profile found in table, try to auto-create from currentUser / metadata
      const activeUser = currentUser || userRef.current
      const meta = activeUser?.user_metadata || {}
      const fallbackUsername = (meta.username || activeUser?.email?.split('@')[0] || 'user').toLowerCase().trim()
      const fallbackFullName = meta.full_name || fallbackUsername
      const fallbackAvatar = meta.avatar_url || getDefaultAvatar(fallbackUsername || fallbackFullName)

      const newProfile = {
        id: userId,
        username: fallbackUsername,
        full_name: fallbackFullName,
        avatar_url: fallbackAvatar,
      }

      supabase
        .from('profiles')
        .upsert(newProfile)
        .select()
        .maybeSingle()
        .then(({ data: inserted }) => {
          if (inserted) setProfile(inserted)
        })
        .catch(() => {})

      setProfile(newProfile)
      return newProfile
    } catch {
      const activeUser = currentUser || userRef.current
      if (activeUser) {
        const meta = activeUser.user_metadata || {}
        const fallbackUser = (meta.username || activeUser.email?.split('@')[0] || 'user').toLowerCase().trim()
        const fallback = {
          id: userId,
          username: fallbackUser,
          full_name: meta.full_name || activeUser.email?.split('@')[0] || 'User',
          avatar_url: meta.avatar_url || getDefaultAvatar(fallbackUser),
        }
        setProfile(fallback)
        return fallback
      }
      return null
    }
  }, [])

  // Initialize auth state and listen for changes (runs once on mount)
  useEffect(() => {
    let isMounted = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!isMounted) return
      setSession(currentSession)
      const sessionUser = currentSession?.user ?? null
      setUser(sessionUser)
      if (sessionUser) {
        fetchProfile(sessionUser.id, sessionUser).finally(() => {
          if (isMounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return
        setSession(newSession)
        const sessionUser = newSession?.user ?? null
        setUser(sessionUser)

        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && sessionUser) {
          fetchProfile(sessionUser.id, sessionUser)
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // Sign up with email + password, then create profile with metadata
  const signUp = async ({ email, password, username, fullName }) => {
    const trimmedUsername = username.toLowerCase().trim()
    const trimmedFullName = fullName?.trim() || username.trim()
    const initialAvatar = getDefaultAvatar(trimmedUsername || trimmedFullName)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: trimmedUsername,
          full_name: trimmedFullName,
          avatar_url: initialAvatar,
        },
      },
    })

    if (error) throw error

    // Create profile row
    if (data.user) {
      try {
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: trimmedUsername,
            full_name: trimmedFullName,
            avatar_url: initialAvatar,
          })
      } catch (profileError) {
        console.warn('Initial profile upsert notice:', profileError)
      }

      await fetchProfile(data.user.id, data.user)
    }

    return data
  }

  // Sign in with email + password
  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Update profile
  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not authenticated')

    // Keep auth user metadata synced
    try {
      await supabase.auth.updateUser({
        data: {
          ...(updates.full_name ? { full_name: updates.full_name } : {}),
          ...(updates.username ? { username: updates.username } : {}),
          ...(updates.avatar_url ? { avatar_url: updates.avatar_url } : {}),
        },
      })
    } catch (e) {
      console.warn('Metadata sync notice:', e)
    }

    // Prepare database payload with only verified profile columns
    const payload = {
      id: user.id,
    }
    if (updates.full_name !== undefined) payload.full_name = updates.full_name
    if (updates.username !== undefined) payload.username = updates.username
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url
    if (updates.birthday !== undefined) payload.birthday = updates.birthday

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload)
        .select()
        .single()

      if (error) {
        console.error('Lỗi khi lưu profile vào Supabase database:', error)
        throw error
      }

      if (data) {
        setProfile(data)
        return data
      }
    } catch (dbErr) {
      console.error('Profiles table update notice:', dbErr)
      throw dbErr
    }

    const merged = { ...profile, ...updates }
    setProfile(merged)
    return merged
  }

  const value = {
    session,
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    fetchProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
