import { useState } from 'react'
import { api } from '../../lib/api'

export default function AssessmentFormModal({ isOpen, onClose, farm, onAssessmentCreated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    condition: '',
    chickenCount: farm?.estimatedChickens || 0,
    notes: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.condition) {
      setError('Please select a condition')
      return
    }

    setLoading(true)
    setError('')
    try {
      console.log('Creating assessment for farm:', farm.id)
      
      const formData = new FormData()
      formData.append('assessment', JSON.stringify({
        farmId: farm.id,
        condition: form.condition,
        chickenCount: parseInt(form.chickenCount),
        notes: form.notes
      }))

      await api.syncAssessment(formData)

      console.log('✓ Assessment created successfully')
      onAssessmentCreated()
      onClose()
    } catch (err) {
      console.error('Failed to create assessment:', err)
      setError(err.message || 'Failed to create assessment')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !farm) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-2">Start Assessment</h2>
        <p className="text-gray-400 text-sm mb-4 font-semibold">{farm.farmName}</p>

        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-2">
              Farm Condition *
            </label>
            <select
              value={form.condition}
              onChange={(e) => {
                setForm({ ...form, condition: e.target.value })
                setError('')
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
            >
              <option value="">-- Select Condition --</option>
              <option value="Good">Good</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-2">
              Chicken Count
            </label>
            <input
              type="number"
              value={form.chickenCount}
              onChange={(e) => setForm({ ...form, chickenCount: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-2">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional notes..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm h-20"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-800 text-gray-300 py-2 rounded hover:bg-gray-700 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold"
            >
              {loading ? 'Creating...' : '✓ Start Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}