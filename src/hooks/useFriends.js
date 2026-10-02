import { useContext } from 'react'
import { FriendsContext } from '../contexts/FriendsContext'

/**
 * Hook to access friends list, incoming/outgoing friend requests, and action handlers.
 * Backed by FriendsContext to ensure synchronized state and realtime updates everywhere.
 */
export function useFriends() {
  const context = useContext(FriendsContext)
  if (!context) {
    throw new Error('useFriends must be used within a FriendsProvider')
  }
  return context
}

export { FriendsContext, FriendsProvider } from '../contexts/FriendsContext'
