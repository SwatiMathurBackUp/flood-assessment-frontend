import { useState, useEffect } from 'react'
import { isLoggedIn, getUser, clearAuth } from './lib/auth'
import Login from './components/Auth/Login'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import AssignedFarms from './components/Farms/AssignedFarms'
import MapView from './components/Map/MapView'
import AssessmentForm from './components/AssessmentForm'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [viewMode, setViewMode] = useState(null) // 'assess' | 'view'

  useEffect(() => {
    setLoggedIn(isLoggedIn())
  }, [])

  const handleLogin = (data) => {
    setLoggedIn(true)
    setCurrentPage('dashboard')
  }

  const handleLogout = () => {
    clearAuth()
    setLoggedIn(false)
    setCurrentPage('dashboard')
  }

  const handleStartAssessment = (farm) => {
    setSelectedFarm(farm)
    setViewMode('assess')
  }

  const handleViewAssessment = (farm) => {
    setSelectedFarm(farm)
    setViewMode('view')
  }

  const handleFormSave = () => {
    setSelectedFarm(null)
    setViewMode(null)
    setCurrentPage('farms')
  }

  const handleFormCancel = () => {
    setSelectedFarm(null)
    setViewMode(null)
  }

  // Not logged in — show login
  if (!loggedIn) {
    return <Login onLogin={handleLogin} />
  }

  // Assessment form — full screen
  if (viewMode === 'assess' && selectedFarm) {
    return (
      <AssessmentForm
        farm={selectedFarm}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />
    )
  }

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onLogout={handleLogout}
    >
      {currentPage === 'dashboard' && (
        <Dashboard onNavigate={setCurrentPage} />
      )}
      {currentPage === 'farms' && (
        <AssignedFarms
          onStartAssessment={handleStartAssessment}
          onViewAssessment={handleViewAssessment}
        />
      )}
      {currentPage === 'map' && (
        <MapView />
      )}
    </Layout>
  )
}