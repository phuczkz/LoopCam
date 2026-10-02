import { useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function MobileLayout({ children }) {
  const location = useLocation()
  const isChatDetail = location.pathname.startsWith('/messages/') && location.pathname !== '/messages'
  const isFeed = location.pathname === '/feed'

  return (
    <div className="relative w-full h-full max-w-[430px] mx-auto bg-black overflow-hidden flex flex-col">
      {/* Page Content */}
      <main className={`h-full ${isChatDetail || isFeed ? 'overflow-hidden flex flex-col' : 'overflow-y-auto pb-24 safe-top'}`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {!isChatDetail && <BottomNav />}
    </div>
  )
}

