import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { FullScreenSpinner } from './components/ui/Spinner'
import { MobileLayout } from './components/layout/MobileLayout'
import { AuthPage } from './pages/AuthPage'
import { FeedPage } from './pages/FeedPage'
import { CameraPage } from './pages/CameraPage'
import { MemoriesPage } from './pages/MemoriesPage'
import { FriendsPage } from './pages/FriendsPage'
import { MessagesPage } from './pages/MessagesPage'
import { ChatPage } from './pages/ChatPage'
import { ProfilePage } from './pages/ProfilePage'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) return <FullScreenSpinner />
  if (!session) return <Navigate to="/auth" replace />

  return <MobileLayout>{children}</MobileLayout>
}

function AuthRoute() {
  const { session, loading } = useAuth()

  if (loading) return <FullScreenSpinner />
  if (session) return <Navigate to="/camera" replace />

  return (
    <div className="relative w-full h-full max-w-[430px] mx-auto bg-dark-900 overflow-hidden flex flex-col">
      <AuthPage />
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/camera" element={<ProtectedRoute><CameraPage /></ProtectedRoute>} />
      <Route path="/memories" element={<ProtectedRoute><MemoriesPage /></ProtectedRoute>} />
      <Route path="/history" element={<Navigate to="/feed" replace />} />
      <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
      <Route path="/messages/:friendId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/camera" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1a1a1a',
              color: '#f0f0f0',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              fontSize: '14px',
              padding: '12px 16px',
              backdropFilter: 'blur(20px)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#1a1a1a' },
            },
            error: {
              iconTheme: { primary: '#f43f5e', secondary: '#1a1a1a' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
