import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { getDB, getPendingAssessments, getPhotosForAssessment, markAsSynced } from '../../lib/db'
import { getUser } from '../../lib/auth'
import { generateAssessmentPDF } from '../../lib/pdf'

const STATUS_STYLES = {
  Pending: {
    bg: 'bg-gray-800',
    border: 'border-gray-700',
    badge: 'bg-gray-700 text-gray-300',
    dot: 'bg-gray-400',
    label: 'Pending'
  },
  InProgress: {
    bg: 'bg-blue-950/30',
    border: 'border-blue-900/40',
    badge: 'bg-blue-900/50 text-blue-300',
    dot: 'bg-blue-400',
    label: 'In Progress'
  },
  Completed: {
    bg: 'bg-green-950/20',
    border: 'border-green-900/30',
    badge: 'bg-green-900/50 text-green-300',
    dot: 'bg-green-400',
    label: 'Completed'
  }
}

export default function AssignedFarms({ onStartAssessment }) {
  const [farms, setFarms] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [assignedToFilter, setAssignedToFilter] = useState('')
  const [error, setError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  
  const userAssignedTo = getUser() || { name: '', role: '' }
  const isManager = userAssignedTo.role === 'Manager'

  useEffect(() => {
    loadFarms()
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadFarms = async () => {
    setLoading(true)
    try {
      const data = isManager
        ? await api.getAllFarms()
        : await api.getMyFarms()
      
      // Merge with local IndexedDB data
      const db = await getDB()
      const localAssessments = await db.getAll('assessments')

      const merged = data.map(farm => {
        const local = localAssessments.find(
          a => a.address === farm.address
        )
        return {
          ...farm,
          localData: local || null
        }
      })
      setFarms(merged)
    } catch {
      setError('Could not load farms. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    let synced = 0
    let failed = 0
    try {
      const pending = await getPendingAssessments()
      for (const assessment of pending) {
        try {
          const photos = await getPhotosForAssessment(assessment.id)
          const formData = new FormData()
          formData.append('clientId', assessment.id)
          formData.append('assessorName', assessment.assessorName)
          formData.append('address', assessment.address)
          formData.append('latitude', assessment.latitude)
          formData.append('longitude', assessment.longitude)
          formData.append('condition', assessment.condition)
          formData.append('chickenCount', assessment.chickenCount)
          formData.append('notes', assessment.notes || '')
          formData.append('createdAt', assessment.createdAt)
          photos.forEach(photo => {
            if (photo.blob) formData.append('photos', photo.blob, photo.filename)
          })
          const result = await api.syncAssessment(formData)
          if (result) {
            await markAsSynced(assessment.id)
            synced++
          }
        } catch (err) {
          console.error('Sync failed:', err)
          failed++
        }
      }
      setSyncResult({ synced, failed })
      await loadFarms()
    } finally {
      setSyncing(false)
    }
  }

  const handleDownloadPDF = async (farm) => {
    setPdfLoading(farm.id)
    try {
      const assessments = await api.getAll()
      const farmAssessment = assessments.find(
        a => a.address === farm.address
      )
      if (farmAssessment) {
        await generateAssessmentPDF(farmAssessment)
      } else {
        alert('No assessment data found for this farm')
      }
    } catch (err) {
      console.error('PDF failed:', err)
    } finally {
      setPdfLoading(null)
    }
  }

  // Count pending syncs (assessor only)
  const pendingSyncCount = !isManager
    ? farms.filter(f => f.localData?.syncStatus === 'pending').length
    : 0

  const assignedToOptions = Array.from(
    new Set(
      farms
        .map(f => f.assignedToName)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
    )
  )

  const filtered = farms.filter(f => {
    const matchFilter = filter === 'All' || f.status === filter
    const matchSearch = !search ||
      f.farmName.toLowerCase().includes(search.toLowerCase()) ||
      f.address.toLowerCase().includes(search.toLowerCase()) ||
      f.ownerName.toLowerCase().includes(search.toLowerCase())
    const matchAssignedTo = !assignedToFilter ||
      (f.assignedToName || '').toLowerCase() === assignedToFilter.toLowerCase()
    return matchFilter && matchSearch && matchAssignedTo
  })

  const getActionButton = (farm) => {
    // Completed — Download PDF
    if (farm.status === 'Completed') {
      return (
        <button
          onClick={() => handleDownloadPDF(farm)}
          disabled={pdfLoading === farm.id}
          className="w-full bg-green-900/30 border border-green-800
              text-green-400 text-xs font-bold py-2.5 rounded-lg
              hover:bg-green-900/50 transition-all disabled:opacity-60"
        >
          {pdfLoading === farm.id ? 'Generating PDF...' : '↓ Download PDF'}
        </button>
      )
    }

    // Manager — no action buttons
    if (isManager) return null

    // Pending sync — Review & Sync
    if (farm.localData?.syncStatus === 'pending') {
      return (
        <button
          onClick={() => onStartAssessment(farm)}
          className="w-full bg-yellow-600 text-white text-xs font-bold
              py-2.5 rounded-lg hover:bg-yellow-700 transition-all"
        >
          Review & Sync →
        </button>
      )
    }

    // In progress or has draft — Continue
    if (farm.status === 'InProgress' || farm.localData) {
      return (
        <button
          onClick={() => onStartAssessment(farm)}
          className="w-full bg-blue-600 text-white text-xs font-bold
              py-2.5 rounded-lg hover:bg-blue-700 transition-all"
        >
          Continue Assessment →
        </button>
      )
    }

    // Pending — Start Assessment
    return (
      <button
        onClick={() => onStartAssessment(farm)}
        className="w-full bg-gray-700 text-white text-xs font-bold
            py-2.5 rounded-lg hover:bg-gray-600 transition-all"
      >
        Start Assessment →
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 font-mono text-sm">
          Loading farms...
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8">

      {/* Header */}
      <div className="mb-5">
        <p className="text-xs font-mono text-blue-400 uppercase
            tracking-widest mb-1">
          {isManager ? 'All Assessors' : 'Assigned to you'}
        </p>
        <h1 className="text-2xl font-bold">
          {isManager ? 'Team Assessments' : 'My Assessments'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {farms.length} farms assigned
        </p>
      </div>

      {/* Sync Banner — Assessors only */}
      {!isManager && pendingSyncCount > 0 && (
        <div className={`flex items-center justify-between px-4 py-2.5
            text-sm rounded-xl mb-4
            ${online
              ? 'bg-blue-950/50 text-blue-300 border border-blue-900/40'
              : 'bg-yellow-950/30 text-yellow-400 border border-yellow-900/30'
            }`}>
          <span>
            {online
              ? `${pendingSyncCount} assessment${pendingSyncCount > 1 ? 's' : ''} ready to sync`
              : `${pendingSyncCount} saved offline`}
          </span>
          {online && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-blue-600 text-white text-xs font-bold px-3
                  py-1.5 rounded-lg disabled:opacity-60"
            >
              {syncing ? 'Syncing...' : '↑ Sync Now'}
            </button>
          )}
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className={`px-4 py-2 text-xs font-mono rounded-xl mb-4
            ${syncResult.failed > 0
              ? 'bg-yellow-950/30 text-yellow-400'
              : 'bg-green-950/30 text-green-400'
            }`}>
          {syncResult.synced > 0 && `✓ ${syncResult.synced} synced. `}
          {syncResult.failed > 0 && `✗ ${syncResult.failed} failed.`}
        </div>
      )}

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {['Pending', 'InProgress', 'Completed'].map(s => (
          <div
            key={s}
            className={`rounded-xl p-3 text-center border
                ${STATUS_STYLES[s].bg} ${STATUS_STYLES[s].border}`}
          >
            <div className="text-xl font-mono font-bold text-white">
              {farms.filter(f => f.status === s).length}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {STATUS_STYLES[s].label}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Search farms..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg
            px-3 py-2.5 text-sm text-white placeholder-gray-600
            focus:outline-none focus:border-blue-500 mb-3"
      />

      {/* Filter Tabs */}
      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {['All', 'Pending', 'InProgress', 'Completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold
                  border transition-all
                  ${filter === f
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-transparent border-gray-700 text-gray-400'
                  }`}
            >
              {f === 'InProgress' ? 'In Progress' : f}
            </button>
          ))}
        </div>
        
        {/* Manager Assessor Filter Dropdown */}
        {isManager && (
          <select
            value={assignedToFilter}
            onChange={e => setAssignedToFilter(e.target.value)}
            className="w-full md:w-64 bg-gray-900 border border-gray-700 rounded-lg
                px-3 py-2.5 text-sm text-white placeholder-gray-600
                focus:outline-none focus:border-blue-500"
          >
            <option value="">All assigned</option>
            {assignedToOptions.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/40 rounded-lg
            p-3 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* Farm List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-gray-500">
            <div className="text-4xl mb-2">🌾</div>
            <p>No farms found</p>
          </div>
        ) : (
          filtered.map(farm => {
            const style = STATUS_STYLES[farm.status] || STATUS_STYLES.Pending
            return (
              <div
                key={farm.id}
                className={`rounded-xl border p-4 flex flex-col gap-3
                    ${style.bg} ${style.border}`}
              >
                {/* Farm Header */}
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">
                      {farm.farmName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {farm.ownerName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Assigned to : {farm.assignedToName}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1
                      rounded-full flex items-center gap-1.5
                      ${style.badge} ml-2 flex-shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full
                        ${style.dot}`} />
                    {style.label}
                  </span>
                </div>

                {/* Farm Details */}
                <div className="flex flex-col gap-1.5 text-xs text-gray-400">
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5">📍</span>
                    <span className="line-clamp-2">{farm.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>🐔</span>
                    <span>Est. {farm.estimatedChickens.toLocaleString()} chickens</span>
                  </div>
                  
                  {/* Pending Sync Status */}
                  {farm.localData?.syncStatus === 'pending' && farm.status !== 'Completed' && (
                    <div className="flex items-center gap-1.5 text-yellow-400">
                      <span>⏱</span>
                      <span>Pending sync</span>
                    </div>
                  )}
                  
                  {/* Draft Status */}
                  {farm.localData?.syncStatus !== 'pending' && farm.localData && farm.status !== 'Completed' && (
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <span>📝</span>
                      <span>Draft in progress</span>
                    </div>
                  )}
                  
                  {/* Completed Status */}
                  {farm.completedAt && (
                    <div className="flex items-center gap-1.5 text-green-400">
                      <span>✓</span>
                      <span>
                        Completed {new Date(farm.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                {getActionButton(farm)}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}