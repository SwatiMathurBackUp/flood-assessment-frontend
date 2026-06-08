import { getToken } from './auth'
import { SYNC_STATUS } from './statuses'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5167'

// Helper to get auth headers
const authHeaders = () => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json'
})

export const api = {
  // ── Auth ──────────────────────────────
  login: async (name, pin) => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin })
    })
    if (!response.ok) throw new Error('Invalid name or PIN')
    return response.json()
  },

  // ── Farms ─────────────────────────────
  getMyFarms: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/farm/my`, {
        headers: authHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch farms')
      const farms = await response.json()
      // Save to IndexedDB for offline use
      const { saveFarms } = await import('./db')
      await saveFarms(farms)
      return farms
    } catch (err) {
      // Fallback to IndexedDB when offline
      console.log('Offline: fetching from IndexedDB')
      const { getFarmsByAssignee } = await import('./db')
      const { getUser } = await import('./auth')
      const user = getUser()
      return await getFarmsByAssignee(user.name)
    }
  },
// Create new farm
createFarm: async (farmData) => {
  const response = await fetch(`${BASE_URL}/api/farm/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(farmData)
  })
  if (!response.ok) {
    const error = await response.text()
    throw new Error(error)
  }
  return response.json()
},

// Get list of assessors for assignment dropdown
getAssessors: async () => {
  const response = await fetch(`${BASE_URL}/api/user/assessors`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) throw new Error('Failed to fetch assessors')
  return response.json()
},

// Assign farm to assessor
assignFarm: async (farmId, assessorUserId) => {
  const response = await fetch(`${BASE_URL}/api/farm/${farmId}/assign`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ assessorUserId })
  })
  if (!response.ok) throw new Error('Failed to assign farm')
  return response.json()
},

  getAllFarms: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/farm/all`, {
        headers: authHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch farms')
      const farms = await response.json()
      // Save to IndexedDB for offline use
      const { saveFarms } = await import('./db')
      await saveFarms(farms)
      return farms
    } catch (err) {
      // Fallback to IndexedDB when offline
      console.log('Offline: fetching all farms from IndexedDB')
      const { getAllFarms } = await import('./db')
      return await getAllFarms()
    }
  },

  updateFarmStatus: async (farmId, status) => { debugger
    try {
      const response = await fetch(`${BASE_URL}/api/farm/${farmId}/status`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status })
      })
      if (!response.ok) throw new Error('Failed to update status')
        debugger
      return response.json()
    } catch (err) {
      // Save locally for sync later
      console.log('Offline: saving status update locally')
      const { getDB } = await import('./db')
      const db = await getDB()
      const farm = await db.get('farms', farmId)
      if (farm) {
        farm.status = status
        farm.syncPending = true
        await db.put('farms', farm)
      }
      return { message: 'Status saved locally' }
    }
  },

  getMapPins: async () => {
    const response = await fetch(`${BASE_URL}/api/farm/map`, {
      headers: authHeaders()
    })
    if (!response.ok) throw new Error('Failed to fetch map data')
    return response.json()
  },

  // ── Assessments ───────────────────────
  syncAssessment: async (formData) => {
    const response = await fetch(`${BASE_URL}/api/assessment/sync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    })
    if (!response.ok) throw new Error('Sync failed')
    return response.json()
  },

  createAssessment: async (assessmentData) => {
    const formData = new FormData()
    formData.append('assessment', JSON.stringify(assessmentData))
    return await api.syncAssessment(formData)
  },

  getAll: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/assessment`, {
        headers: authHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch assessments')
      return response.json()
    } catch (err) {
      // Fallback to IndexedDB when offline
      console.log('Offline: fetching from IndexedDB')
      const { getDB } = await import('./db')
      const db = await getDB()
      const assessments = await db.getAll('assessments')
      return assessments.filter(a => a.syncStatus === 'synced')
    }
  },

getStats: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/assessment/stats`, {
        headers: authHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    } catch (err) {
      // Fallback to local stats
      console.log('Offline: calculating stats from IndexedDB')
      const { getStats } = await import('./db')
      return getStats()
    }
  },

 getReport: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/assessment/report`, {
        headers: authHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch report')
      return response.json()
    } catch (err) {
      // Fallback to local data
      console.log('Offline: fetching report from IndexedDB')
      const { getDB } = await import('./db')
      const db = await getDB()
      const assessments = await db.getAll('assessments')
      return assessments.filter(a => a.syncStatus === 'synced')
    }
  },

  delete: async (id) => {
    const response = await fetch(`${BASE_URL}/api/assessment/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (!response.ok) throw new Error('Failed to delete')
    return response.json()
  }
}