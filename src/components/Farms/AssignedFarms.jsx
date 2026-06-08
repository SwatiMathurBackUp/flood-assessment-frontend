import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { dbOperations } from '../../lib/db'
import { getUser } from '../../lib/auth'
import { FARM_STATUS, FARM_STATUS_LIST } from '../../lib/statuses'
import AddFarmModal from './AddFarmModal'
import AssignFarmModal from './AssignFarmModal'
import AssessmentForm from './AssessmentForm'

export default function AssignedFarms() {
  const user = getUser()
  const [farms, setFarms] = useState([])
  const [assessors, setAssessors] = useState([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedFarmForAssessment, setSelectedFarmForAssessment] = useState(null)

  useEffect(() => {
    loadFarms()
    if (user?.role === 'Manager') {
      loadAssessors()
    }
  }, [])

  const loadFarms = async () => {
    setLoading(true)
    debugger
    try {
      if (user?.role === 'Manager') {
        const data = await api.getAllFarms()
        setFarms(data)
      } else {
        const data = await api.getMyFarms()
        setFarms(data)
      }
    } catch (err) {
      console.error('Failed to load farms:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAssessors = async () => {
    try {
      const data = await api.getAssessors()
      setAssessors(data)
    } catch (err) {
      console.error('Failed to load assessors:', err)
    }
  }

  const handleAddFarm = (newFarm) => {
    setFarms([newFarm, ...farms])
  }

  const handleAssignFarm = async () => {
    setShowAssignModal(false)
    debugger
    setSelectedFarm(null)
    await loadFarms()
  }

  const openAssignModal = (farm) => {
    setSelectedFarm(farm)
    setShowAssignModal(true)
  }

  const handleSyncNow = async (farm) => {
    try {
      debugger
      const assessments = await dbOperations.getByFarmId(farm.id)
      const pendingAssessment = assessments.find(a => a.submitted && !a.synced)
      
      if (pendingAssessment) {
        const formData = new FormData()
        formData.append('assessment', JSON.stringify({
          farmId: farm.id,
          condition: pendingAssessment.condition,
          chickenCount: pendingAssessment.chickenCount,
          latitude: pendingAssessment.latitude,
          longitude: pendingAssessment.longitude,
          address: pendingAssessment.address,
          notes: pendingAssessment.notes
        }))

        await api.syncAssessment(formData)
        
        await dbOperations.saveAssessment({ ...pendingAssessment, synced: true })
        await api.updateFarmStatus(farm.id, FARM_STATUS.Completed)
        await loadFarms()
        alert('✓ Assessment synced successfully!')
      }
    } catch (err) {
      console.error('Sync error:', err)
      alert('Failed to sync: ' + err.message)
    }
  }

  const filteredFarms = farms
    .filter(f => {
      if (filter !== 'All' && f.status !== filter) return false
      if (!search) return true
      return f.farmName.toLowerCase().includes(search.toLowerCase()) ||
             f.ownerName.toLowerCase().includes(search.toLowerCase())
    })
    debugger

  // Show full assessment form
  if (selectedFarmForAssessment) {
    return (
      <AssessmentForm
        farm={selectedFarmForAssessment}
        onBack={() => {
          setSelectedFarmForAssessment(null)
          loadFarms()
        }}
        onSubmitted={() => {
          setSelectedFarmForAssessment(null)
          loadFarms()
        }}
      />
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading farms...</div>
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-400 text-sm">
            {user?.role === 'Manager' ? 'ALL FARMS' : 'ASSIGNED TO YOU'}
          </p>
          <h1 className="text-2xl font-bold text-white">
            {user?.role === 'Manager' ? 'Farm Management' : 'My Assessments'}
          </h1>
        </div>
        
        {user?.role === 'Manager' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold"
          >
            + Add Farm
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Search farms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white"
        />
        
        <div className="flex gap-2 flex-wrap">
          {FARM_STATUS_LIST.map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded text-sm font-medium transition
                ${filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              {status === 'InProgress' ? 'In Progress' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Farms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFarms.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-400">
            No farms found
          </div>
        ) : (
          filteredFarms.map(farm => (
            <div key={farm.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-bold text-white">{farm.farmName}</h3>
                  <p className="text-sm text-gray-400">{farm.ownerName}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded whitespace-nowrap
                  ${farm.status === FARM_STATUS.Completed ? 'bg-green-900/30 text-green-400' :
                    farm.status === FARM_STATUS.InProgress ? 'bg-blue-900/30 text-blue-400' :
                    farm.status === FARM_STATUS.Pending ? 'bg-yellow-900/30 text-yellow-400' :
                    farm.status === FARM_STATUS.PendingSync ? 'bg-white-900/30 text-yellow-400' :
                    'bg-gray-800 text-gray-400'}`}
                >
                  {farm.status}
                </span>
              </div>

              <p className="text-xs text-gray-500 mb-3">📍 {farm.address}</p>
              <p className="text-sm text-gray-300 mb-4">🐔 Est. {farm.estimatedChickens?.toLocaleString()} chickens</p>

              {/* Current Assignment (Manager view) */}
              {user?.role === 'Manager' && (
                <div className="mb-4 text-sm">
                  <p className="text-gray-400">
                    Assigned to: 
                    <span className="text-white font-semibold ml-1">
                      {farm.assignedToUserName || 'Unassigned'}
                    </span>
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {user?.role === 'Manager' ? (
                  <button
                    onClick={() => openAssignModal(farm)}
                    disabled={farm.assignedToUserId}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {farm.assignedToUserId ? '✓ Assigned' : 'Assign →'}
                  </button>
                ) : (
                  <>
                    {/* ✅ Hide button if Completed */}
                    {farm.status === FARM_STATUS.Completed ? (
                      <button disabled className="flex-1 bg-green-600 text-white py-2 rounded text-sm font-semibold">
                        ✓ Completed
                      </button>
                    ) : farm.status === FARM_STATUS.PendingSync ? (
                      // ✅ Show Sync Now if Pending Sync
                      <button
                        onClick={() => handleSyncNow(farm)}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded text-sm font-semibold"
                      >
                        ⟳ Sync Now
                      </button>
                    ) : (
                      // ✅ Show Start Assessment for Pending and InProgress
                      <button
                        onClick={() => setSelectedFarmForAssessment(farm)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-semibold"
                      >
                        Start Assessment →
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <AddFarmModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onFarmAdded={handleAddFarm}
      />

      <AssignFarmModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        farm={selectedFarm}
        assessors={assessors}
        onAssigned={handleAssignFarm}
      />
    </div>
  )
}
