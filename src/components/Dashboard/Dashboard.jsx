import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { getUser } from '../../lib/auth'
import { getStats, getPendingAssessments, getPhotosForAssessment, markAsSynced } from '../../lib/db'
import { generateFullReport } from '../../lib/pdf'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = {
  Good: '#22c55e',
  Moderate: '#f59e0b',
  Bad: '#ef4444'
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [localStats, setLocalStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const user = getUser() || { name: '', role: '' }

  useEffect(() => {
    loadStats()
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [serverStats, local] = await Promise.all([
        api.getStats(),
        getStats()
      ])
      setStats(serverStats)
      setLocalStats(local)
    } catch {
      const local = await getStats()
      setLocalStats(local)
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
      await loadStats()
    } finally {
      setSyncing(false)
    }
  }

  const handleDownloadReport = async () => {
    setReportLoading(true)
    try {
      const assessments = await api.getReport()
      await generateFullReport(assessments)
    } catch (err) {
      console.error('Report failed:', err)
    } finally {
      setReportLoading(false)
    }
  }

  const conditionData = stats ? [
    { name: 'Good', value: stats.good },
    { name: 'Moderate', value: stats.moderate },
    { name: 'Bad', value: stats.bad }
  ].filter(d => d.value > 0) : []

  const farmStatusData = stats ? [
    { name: 'Pending', value: stats.pendingFarms, fill: '#6b7280' },
    { name: 'In Progress', value: stats.inProgressFarms, fill: '#3b82f6' },
    { name: 'Completed', value: stats.completedFarms, fill: '#22c55e' }
  ] : []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 font-mono text-sm">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs font-mono text-blue-400 uppercase tracking-widest mb-1">
            Welcome back
          </p>
          <h1 className="text-2xl font-bold">{user?.name}</h1>
          <p className="text-sm text-gray-500">{user?.role} · Madison County, NC</p>
        </div>
        {/* <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
            text-xs font-mono font-semibold
            ${online ? 'bg-green-900/40 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full animate-pulse
              ${online ? 'bg-green-400' : 'bg-red-400'}`} />
          {online ? 'Online' : 'Offline'}
        </div> */}
      </div>

      {/* Sync Banner */}
    {localStats?.pending > 0 && user?.role !== 'Manager' && (
        <div className={`flex items-center justify-between px-4 py-2.5
            text-sm rounded-xl mb-4
            ${online
              ? 'bg-blue-950/50 text-blue-300 border border-blue-900/40'
              : 'bg-yellow-950/30 text-yellow-400 border border-yellow-900/30'
            }`}>
          <span>
            {online
              ? `${localStats.pending} assessment${localStats.pending > 1 ? 's' : ''} ready to sync`
              : `${localStats.pending} saved offline`}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-mono font-bold text-white">
            {stats?.totalFarms || 0}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">
            Total Farms
          </div>
        </div>
        <div className="bg-gray-900 border border-yellow-900/40 rounded-xl p-4">
          <div className="text-2xl font-mono font-bold text-yellow-400">
            {stats?.pendingFarms || 0}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">
            Pending
          </div>
        </div>
        <div className="bg-gray-900 border border-blue-900/40 rounded-xl p-4">
          <div className="text-2xl font-mono font-bold text-blue-400">
            {stats?.inProgressFarms || 0}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">
            In Progress
          </div>
        </div>
        <div className="bg-gray-900 border border-green-900/40 rounded-xl p-4">
          <div className="text-2xl font-mono font-bold text-green-400">
            {stats?.completedFarms || 0}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">
            Completed
          </div>
        </div>
      </div>

      {/* Chickens + Pending Sync */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-900 border border-blue-900/40 rounded-xl p-4">
          <div className="text-2xl font-mono font-bold text-blue-400">
            {(stats?.totalChickens || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">
            Chickens Assessed
          </div>
        </div>
        <div className="bg-gray-900 border border-yellow-900/40 rounded-xl p-4">
          <div className="text-2xl font-mono font-bold text-yellow-400">
            {localStats?.pending || 0}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">
            Pending Sync
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            Farm Condition Breakdown
          </h3>
          {conditionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={conditionData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value"
                >
                  {conditionData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{
                  background: '#1f2937', border: '1px solid #374151',
                  borderRadius: '8px', color: '#fff'
                }} />
                <Legend formatter={(value) => (
                  <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                    {value}
                  </span>
                )} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
              No assessment data yet
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            Farm Status Overview
          </h3>
          {stats?.totalFarms > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={farmStatusData}>
                <XAxis dataKey="name"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false} />
                <Tooltip contentStyle={{
                  background: '#1f2937', border: '1px solid #374151',
                  borderRadius: '8px', color: '#fff'
                }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {farmStatusData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
              No farm data yet
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <button
            onClick={() => onNavigate('farms')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700
                rounded-lg p-3 text-left transition-all"
          >
            <div className="text-xl mb-1">📋</div>
            <div className="text-xs font-semibold text-white">My Assessments</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {stats?.pendingFarms || 0} pending
            </div>
          </button>
          <button
            onClick={() => onNavigate('map')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700
                rounded-lg p-3 text-left transition-all"
          >
            <div className="text-xl mb-1">🗺️</div>
            <div className="text-xs font-semibold text-white">Map View</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {stats?.totalFarms || 0} farms
            </div>
          </button>
          <button
            onClick={handleDownloadReport}
            disabled={reportLoading}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700
                rounded-lg p-3 text-left transition-all disabled:opacity-60"
          >
            <div className="text-xl mb-1">📄</div>
            <div className="text-xs font-semibold text-white">Download Report</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {reportLoading ? 'Generating...' : 'PDF export'}
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}