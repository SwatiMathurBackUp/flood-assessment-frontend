import { useState, useEffect } from 'react'
import { getAllAssessments, deleteAssessment, getStats } from '../lib/db'
import { api } from '../lib/api'
import { getPendingAssessments, markAsSynced, getPhotosForAssessment } from '../lib/db'

const COND_COLOR = {
  Good: 'text-green-400',
  Moderate: 'text-yellow-400',
  Bad: 'text-red-400'
}

const COND_BG = {
  Good: 'bg-green-500',
  Moderate: 'bg-yellow-500',
  Bad: 'bg-red-500'
}

export default function Dashboard({ onNew, onEdit }) {
  const [assessments, setAssessments] = useState([])
  const [stats, setStats] = useState(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCondition, setFilterCondition] = useState('All')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = async () => {
    const [all, s] = await Promise.all([getAllAssessments(), getStats()])
    setAssessments(all)
    setStats(s)
  }

  useEffect(() => {
    load()
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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

          photos.forEach((photo) => {
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
      await load()
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (id) => {
    await deleteAssessment(id)
    setConfirmDelete(null)
    await load()
  }

  const filtered = assessments.filter(a => {
    const matchSearch = !search ||
      a.address?.toLowerCase().includes(search.toLowerCase()) ||
      a.assessorName?.toLowerCase().includes(search.toLowerCase())
    const matchCond = filterCondition === 'All' || a.condition === filterCondition
    return matchSearch && matchCond
  })

  const fmtDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">

      {/* Header */}
    <div className="bg-gray-900 border-b border-gray-800 px-6 md:px-12 lg:px-20 pt-5 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-mono font-semibold text-blue-400 tracking-widest uppercase mb-1">
              Flood Assessment
            </p>
            <h1 className="text-xl font-bold">Madison County, NC</h1>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold ${online ? 'bg-green-900/40 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${online ? 'bg-green-400' : 'bg-red-400'}`} />
            {online ? 'Online' : 'Offline'}
          </div>
        </div>

        {/* Stats */}
        {stats && (
         <div className="grid grid-cols-3 gap-2 mb-3 w-full">
            <div className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
              <div className="text-xl font-mono font-bold">{stats.total}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">Total Sites</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center border border-yellow-900/40">
              <div className="text-xl font-mono font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">Pending</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center border border-blue-900/40">
              <div className="text-xl font-mono font-bold text-blue-400">
                {stats.totalChickens.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">Chickens</div>
            </div>
          </div>
        )}

        {/* Condition Summary */}
        {stats && stats.total > 0 && (
          <div className="flex gap-3">
            {['good', 'moderate', 'bad'].map(c => (
              <div key={c} className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className={`w-2 h-2 rounded-full ${COND_BG[c.charAt(0).toUpperCase() + c.slice(1)]}`} />
                <span>{stats[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sync Banner */}
      {stats?.pending > 0 && (
        <div className={`flex items-center justify-between px-4 py-2.5 text-sm ${online ? 'bg-blue-950/50 text-blue-300 border-b border-blue-900/40' : 'bg-yellow-950/30 text-yellow-400 border-b border-yellow-900/30'}`}>
          <span>
            {online
              ? `${stats.pending} assessment${stats.pending > 1 ? 's' : ''} ready to sync`
              : `${stats.pending} saved offline`}
          </span>
          {online && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
            >
              {syncing ? 'Syncing...' : '↑ Sync Now'}
            </button>
          )}
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className={`px-4 py-2 text-xs font-mono ${syncResult.failed > 0 ? 'bg-yellow-950/30 text-yellow-400' : 'bg-green-950/30 text-green-400'}`}>
          {syncResult.synced > 0 && `✓ ${syncResult.synced} synced. `}
          {syncResult.failed > 0 && `✗ ${syncResult.failed} failed.`}
        </div>
      )}

      {/* Search & Filter */}
     <div className="px-6 md:px-12 lg:px-20 pt-3 pb-2 flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="search"
          placeholder="Search by address or assessor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-2">
          {['All', 'Good', 'Moderate', 'Bad'].map(c => (
            <button
              key={c}
              onClick={() => setFilterCondition(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterCondition === c
                ? c === 'All' ? 'bg-blue-600 border-blue-600 text-white'
                  : c === 'Good' ? 'bg-green-600 border-green-600 text-white'
                    : c === 'Moderate' ? 'bg-yellow-600 border-yellow-600 text-white'
                      : 'bg-red-600 border-red-600 text-white'
                : 'bg-transparent border-gray-700 text-gray-400'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Assessment List */}
     <div className="px-6 md:px-12 lg:px-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
        {filtered.length === 0 ? (
         <div className="text-center py-16 text-gray-500 md:col-span-2 lg:col-span-3">
            {assessments.length === 0 ? (
              <>
                <div className="text-5xl mb-3">🐔</div>
                <p className="font-semibold text-gray-400 mb-1">No assessments yet</p>
                <p className="text-sm">Tap + to start your first assessment</p>
              </>
            ) : (
              <p>No results for current filter</p>
            )}
          </div>
        ) : (
          filtered.map(a => (
            <div
              key={a.id}
              onClick={() => onEdit(a)}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex cursor-pointer hover:border-gray-600 active:scale-99 transition-all"
            >
              <div className={`w-1 flex-shrink-0 ${COND_BG[a.condition] || 'bg-gray-600'}`} />
              <div className="flex-1 p-3 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wide ${COND_COLOR[a.condition] || 'text-gray-400'}`}>
                    {a.condition || 'Unknown'}
                  </span>
                  <span className={`text-xs font-mono ${a.syncStatus === 'synced' ? 'text-green-400' : 'text-gray-500'}`}>
                    {a.syncStatus === 'synced' ? '✓ Synced' : '⏱ Pending'}
                  </span>
                </div>
                <p className="text-sm text-white truncate mb-1">{a.address || 'No address'}</p>
                <div className="flex gap-3 text-xs text-gray-500 mb-2">
                  <span>🐔 {parseInt(a.chickenCount || 0).toLocaleString()}</span>
                  <span>📍 {a.latitude ? `${parseFloat(a.latitude).toFixed(4)}, ${parseFloat(a.longitude).toFixed(4)}` : 'No coords'}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 font-mono">
                  <span>{a.assessorName || 'Unknown'}</span>
                  <span>{fmtDate(a.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(a.id) }}
                className="px-3 text-gray-600 hover:text-red-400 text-lg self-start pt-3"
              >×</button>
            </div>
          ))
        )}
      </div>

      {/* Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-5">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">Delete Assessment?</h3>
            <p className="text-sm text-gray-400 mb-5">
              This will permanently delete the assessment and all associated photos.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-gray-700 text-sm font-medium"
              >Cancel</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold"
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={onNew}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/50 hover:bg-blue-700 active:scale-95 transition-all z-40"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}