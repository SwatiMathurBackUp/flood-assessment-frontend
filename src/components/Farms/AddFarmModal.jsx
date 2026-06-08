import { useState } from 'react'
import { api } from '../../lib/api'

export default function AddFarmModal({ isOpen, onClose, onFarmAdded }) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    farmName: '',
    ownerName: '',
    address: '',
    latitude: '',
    longitude: '',
    estimatedChickens: ''
  })

  const validateForm = () => {
    const errs = {}
    if (!form.farmName.trim()) errs.farmName = 'Farm name required'
    if (!form.ownerName.trim()) errs.ownerName = 'Owner name required'
    if (!form.address.trim()) errs.address = 'Address required'
    if (!form.estimatedChickens || isNaN(form.estimatedChickens) || parseInt(form.estimatedChickens) <= 0)
      errs.estimatedChickens = 'Valid chicken count required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateForm()
    
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)
    try {
      const newFarm = await api.createFarm({
        farmName: form.farmName,
        ownerName: form.ownerName,
        address: form.address,
        latitude: form.latitude ? parseFloat(form.latitude) : 0,
        longitude: form.longitude ? parseFloat(form.longitude) : 0,
        estimatedChickens: parseInt(form.estimatedChickens)
      })

      console.log('✓ Farm created:', newFarm)
      
      // Reset form
      setForm({
        farmName: '',
        ownerName: '',
        address: '',
        latitude: '',
        longitude: '',
        estimatedChickens: ''
      })
      setErrors({})
      
      onFarmAdded(newFarm)
      onClose()
    } catch (err) {
      console.error('Failed to create farm:', err)
      setErrors({ submit: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Add New Farm</h2>

        {errors.submit && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4 text-sm">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-400">Farm Name *</label>
            <input
              type="text"
              value={form.farmName}
              onChange={(e) => handleChange('farmName', e.target.value)}
              placeholder="e.g., Green Acres Farm"
              className={`w-full bg-gray-800 border rounded px-3 py-2 text-white text-sm
                ${errors.farmName ? 'border-red-500' : 'border-gray-700'}`}
            />
            {errors.farmName && <span className="text-xs text-red-400">{errors.farmName}</span>}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400">Owner Name *</label>
            <input
              type="text"
              value={form.ownerName}
              onChange={(e) => handleChange('ownerName', e.target.value)}
              placeholder="e.g., John Smith"
              className={`w-full bg-gray-800 border rounded px-3 py-2 text-white text-sm
                ${errors.ownerName ? 'border-red-500' : 'border-gray-700'}`}
            />
            {errors.ownerName && <span className="text-xs text-red-400">{errors.ownerName}</span>}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400">Address *</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="e.g., 123 Farm Road, Madison County, NC"
              className={`w-full bg-gray-800 border rounded px-3 py-2 text-white text-sm
                ${errors.address ? 'border-red-500' : 'border-gray-700'}`}
            />
            {errors.address && <span className="text-xs text-red-400">{errors.address}</span>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-400">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={form.latitude}
                onChange={(e) => handleChange('latitude', e.target.value)}
                placeholder="12.8583"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={form.longitude}
                onChange={(e) => handleChange('longitude', e.target.value)}
                placeholder="77.6141"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400">Estimated Chickens *</label>
            <input
              type="number"
              value={form.estimatedChickens}
              onChange={(e) => handleChange('estimatedChickens', e.target.value)}
              placeholder="e.g., 10000"
              min="1"
              className={`w-full bg-gray-800 border rounded px-3 py-2 text-white text-sm
                ${errors.estimatedChickens ? 'border-red-500' : 'border-gray-700'}`}
            />
            {errors.estimatedChickens && 
              <span className="text-xs text-red-400">{errors.estimatedChickens}</span>}
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
              className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm font-semibold"
            >
              {loading ? 'Creating...' : '✓ Add Farm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}