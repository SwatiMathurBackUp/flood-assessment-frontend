import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

export default function AssignFarmModal({ 
  isOpen, 
  onClose, 
  farm, 
  assessors, 
  onAssigned 
}) {
  const [selectedAssessor, setSelectedAssessor] = useState(farm?.assignedToUserId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (farm) {
      setSelectedAssessor(farm.assignedToUserId || '')
      setError('')
    }
  }, [farm, isOpen])

  const handleAssign = async () => {
    if (!selectedAssessor) {
      setError('Please select an assessor')
      return
    }

    if (parseInt(selectedAssessor) === farm?.assignedToUserId) {
      setError('Farm already assigned to this assessor')
      return
    }

    setLoading(true)
    try {
      const updatedFarm = await api.assignFarm(farm.id, parseInt(selectedAssessor))
      console.log('✓ Farm assigned:', updatedFarm)
      onAssigned(updatedFarm)
      onClose()
    } catch (err) {
      console.error('Failed to assign farm:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !farm) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-white mb-2">Assign Farm</h2>
        <p className="text-gray-400 text-sm mb-4 font-semibold">{farm.farmName}</p>

        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-400 block mb-2">
            Select Assessor *
          </label>
          <select
            value={selectedAssessor}
            onChange={(e) => {
              setSelectedAssessor(e.target.value)
              setError('')
            }}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
          >
            <option value="">-- Choose Assessor --</option>
            {assessors.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 text-gray-300 py-2 rounded hover:bg-gray-700 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || !selectedAssessor}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold"
          >
            {loading ? 'Assigning...' : '✓ Assign'}
          </button>
        </div>
      </div>
    </div>
  )
}