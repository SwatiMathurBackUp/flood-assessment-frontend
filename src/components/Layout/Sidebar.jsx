import { useState } from 'react'
import { getUser, clearAuth } from '../../lib/auth'

export default function Sidebar({ currentPage, onNavigate, onLogout }) {
  const user = getUser() || { name: '', role: '' }
  const isManager = user.role === 'Manager'
  const [assessorFilter, setAssessorFilter] = useState('All assigned')

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    {
      id: 'farms',
      label: isManager ? 'Team Assessments' : 'My Assessments',
      icon: '📋'
    },
    { id: 'map', label: 'Map View', icon: '🗺️' },
  ]

  const handleLogout = () => {
    clearAuth()
    onLogout()
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-gray-900 border-r
          border-gray-800 min-h-screen fixed left-0 top-0 z-20">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800">
          <p className="text-xs font-mono font-semibold text-blue-400
              tracking-widest uppercase mb-0.5">
            Ceres Field Ops
          </p>
          <h2 className="text-sm font-bold text-white">Flood Assessment</h2>
          <p className="text-xs text-gray-500 mt-0.5">Madison County, NC</p>
        </div>

        {/* User Info */}
        <div className="px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center
                justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Manager Assessor Filter Dropdown */}
        {/* {isManager && (
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">
              Filter by Assessor
            </p>
            <select
              value={assessorFilter}
              onChange={e => {
                setAssessorFilter(e.target.value)
                // Store in localStorage so AssignedFarms can read it
                localStorage.setItem('assessorFilter', e.target.value)
                // Navigate to farms to see filtered results
                onNavigate('farms')
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg
                  px-3 py-2 text-sm text-white focus:outline-none
                  focus:border-blue-500"
            >
              <option>All assigned</option>
              <option>John Smith</option>
              <option>Sarah Johnson</option>
              <option>Mike Davis</option>
            </select>
          </div>
        )} */}

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-sm font-medium transition-all text-left w-full
                  ${currentPage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-sm font-medium text-gray-400 hover:bg-gray-800
                hover:text-red-400 transition-all w-full"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900
          border-t border-gray-800 z-20">
        <div className="flex justify-around items-center py-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5
                  rounded-lg transition-all
                  ${currentPage === item.id ? 'text-blue-400' : 'text-gray-500'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5
                text-gray-500"
          >
            <span className="text-xl">🚪</span>
            <span className="text-xs font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  )
}