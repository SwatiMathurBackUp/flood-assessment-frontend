import Sidebar from './Sidebar'
import OnlineStatus from './OnlineStatus'

export default function Layout({ currentPage, onNavigate, onLogout, children }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      {/* Top bar with online status */}
      <div className="md:ml-64">
        <div className="flex justify-end px-4 py-2 bg-gray-950 border-b
            border-gray-800 sticky top-0 z-10">
          <OnlineStatus />
        </div>
        {/* Main content */}
        <div className="pb-20 md:pb-0">
          {children}
        </div>
      </div>
    </div>
  )
}