import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { reverseGeocode } from '../../hooks/useGeolocation.js'
import { dbOperations } from '../../lib/db'
import { getUser } from '../../lib/auth'
import { FARM_STATUS, ASSESSMENT_CONDITION } from '../../lib/statuses'

export default function AssessmentForm({ farm, onBack, onSubmitted }) {
  const user = getUser()
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [notification, setNotification] = useState({ type: '', message: '' })
  
  const [form, setForm] = useState({
    condition: ASSESSMENT_CONDITION.Good,
    chickenCount: farm?.estimatedChickens || 0,
    latitude: farm?.latitude || 0,
    longitude: farm?.longitude || 0,
    address: farm?.address || '',
    notes: '',
    photos: []
  })

  useEffect(() => {
    loadDraft()
  }, [farm?.id])

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification({ type: '', message: '' }), 4000)
  }

  const loadDraft = async () => {
    try {
      const assessments = await dbOperations.getByFarmId(farm?.id)
      const draft = assessments.find(a => !a.submitted)
      
      if (draft) {
        setForm({
          condition: draft.condition || ASSESSMENT_CONDITION.Good,
          chickenCount: draft.chickenCount || farm?.estimatedChickens || 0,
          latitude: draft.latitude || farm?.latitude || 0,
          longitude: draft.longitude || farm?.longitude || 0,
          address: draft.address || farm?.address || '',
          notes: draft.notes || '',
          photos: draft.photos || []
        })
      }
    } catch (err) {
      console.error('Failed to load draft:', err)
    }
  }

  const captureGPSLocation = async () => {
    setGpsLoading(true)
    try {
      if (!navigator.geolocation) {
showNotification('error', 'GPS not supported on this device')
      return
    }
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000 }
        )
      })
console.log('GPS position captured:', position)
      setForm(f => ({
        ...f,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }))
      debugger
      const addr = await reverseGeocode(position.coords.latitude, position.coords.longitude)
        setForm(f => ({ ...f, address: addr }))
        setTimeout(() => setNotification({ type: '', message: '' }), 3000)
      // ✅ Show success toast
      showNotification('success', '✓ GPS location captured')
    } catch (err) {
      showNotification('error', 'Failed to capture GPS: ' + err.message)
      console.error('GPS error:', err)
    } finally {
      setGpsLoading(false)
    }
  }

  const saveDraft = async () => {
    setLoading(true)
    try {
      const draftData = {
        id: `draft-${farm.id}-${Date.now()}`,
        farmId: farm.id,
        condition: form.condition,
        chickenCount: form.chickenCount,
        latitude: form.latitude,
        longitude: form.longitude,
        address: form.address,
        notes: form.notes,
        photos: form.photos,
        submitted: false,
        synced: false,
        createdAt: new Date().toISOString()
      }

      // ✅ Save to IndexedDB
      await dbOperations.saveAssessment(draftData)
      
      // ✅ Update farm status to InProgress
      await api.updateFarmStatus(farm.id, FARM_STATUS.InProgress)
      
      // ✅ Show toast notification
      showNotification('success', '✓ Draft saved locally')
      
      // ✅ Redirect back to My Assessment after 1.5 seconds
      setTimeout(() => onBack(), 1500)
    } catch (err) {
      showNotification('error', 'Failed to save draft')
      console.error('Save error:', err)
    } finally {
      setLoading(false)
    }
  }

  const submitAssessment = async () => {
    if (!form.condition) {
      showNotification('error', 'Please select farm condition')
      return
    }

    setLoading(true)
    try {
      const assessmentData = {
        farmId: farm.id,
        condition: form.condition,
        chickenCount: form.chickenCount,
        latitude: form.latitude,
        longitude: form.longitude,
        address: form.address,
        notes: form.notes
      }

      const dbData = {
        id: `submission-${farm.id}-${Date.now()}`,
        ...assessmentData,
        submitted: true,
        synced: false,
        createdAt: new Date().toISOString()
      }

      // ✅ Save to IndexedDB first
      await dbOperations.saveAssessment(dbData)
debugger
      // ✅ Check if online
      if (navigator.onLine) {
        try {
          // ✅ Try to sync - convert to FormData for multipart upload
          const formData = new FormData()
          formData.append('assessment', JSON.stringify(assessmentData))
          
          await api.syncAssessment(formData)
          
          // ✅ Update assessment as synced
          await dbOperations.saveAssessment({ ...dbData, synced: true })
          
          // ✅ Update farm status to Completed
          await api.updateFarmStatus(farm.id, FARM_STATUS.Completed)
          
          // ✅ Show correct message for online sync
          showNotification('success', '✓ Assessment submitted and synced successfully!')
          
          // ✅ Redirect to My Assessment page
          setTimeout(() => onSubmitted(), 1500)
        } catch (syncErr) {
          // ✅ Online but API failed - save as pending-sync
          await api.updateFarmStatus(farm.id, FARM_STATUS.PendingSync)
          
          showNotification('warning', '⟳ Assessment saved offline. Will sync when online.')
          console.error('Sync error:', syncErr)
          
          // ✅ Still redirect back
          setTimeout(() => onSubmitted(), 1500)
        }
      } else {
        // ✅ Offline mode
        await api.updateFarmStatus(farm.id, FARM_STATUS.PendingSync)
        
        showNotification('info', '⟳ Assessment saved offline. Will sync when online.')
        
        // ✅ Redirect to My Assessment page
        setTimeout(() => onSubmitted(), 1500)
      }
    } catch (err) {
      showNotification('error', 'Failed to submit assessment')
      console.error('Submit error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 pb-20">
      {/* ✅ Toast Notification */}
      {notification.message && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in
          ${notification.type === 'success' ? 'bg-green-600 text-white' :
            notification.type === 'error' ? 'bg-red-600 text-white' :
            notification.type === 'warning' ? 'bg-yellow-600 text-white' :
            'bg-blue-600 text-white'}`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-4"
        >
          ← Back
        </button>
        <h1 className="text-2xl md:text-3xl font-bold">{farm?.farmName}</h1>
        <p className="text-gray-400">{farm?.ownerName}</p>
      </div>

      {/* Form Container */}
      <div className="bg-gray-900 rounded-lg p-4 md:p-6 space-y-6">
        {/* Farm Info */}
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">ASSIGNED FARM</h3>
          <p className="font-semibold text-lg">{farm?.farmName}</p>
          <p className="text-sm text-gray-400">{farm?.address}</p>
          <p className="text-right text-sm text-gray-400 mt-2">Est. chickens: <span className="text-white font-semibold">{farm?.estimatedChickens?.toLocaleString()}</span></p>
        </div>

        {/* Assessor Info */}
        <div>
          <label className="text-xs font-semibold text-gray-400 block mb-2">ASSESSOR NAME *</label>
          <input
            type="text"
            value={user?.name || ''}
            disabled
            className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white"
          />
        </div>

        {/* GPS Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-400 block mb-2">GPS LOCATION *</label>
            <button
              type="button"
              onClick={captureGPSLocation}
              disabled={gpsLoading}
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-blue-400 hover:text-blue-300 flex items-center justify-center gap-2 mb-3 disabled:opacity-50 transition"
            >
              📍 {gpsLoading ? 'Capturing...' : 'Capture GPS Location'}
            </button>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-2">Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={form.latitude}
              onChange={(e) => setForm(f => ({ ...f, latitude: parseFloat(e.target.value) || 0 }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-mono text-sm"
            />
          </div>
          
          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-2">Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={form.longitude}
              onChange={(e) => setForm(f => ({ ...f, longitude: parseFloat(e.target.value) || 0 }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-mono text-sm"
            />
          </div>
        </div>

        {/* Farm Address */}
        <div>
          <label className="text-xs font-semibold text-gray-400 block mb-2">FARM ADDRESS *</label>
          <input
            type="text"
            value={form.address || farm?.address || ''}
            disabled
            className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white"
          />
        </div>

        {/* Chicken Count */}
        <div>
          <label className="text-xs font-semibold text-gray-400 block mb-2">TOTAL CHICKEN COUNT *</label>
          <input
            type="number"
            value={form.chickenCount}
            onChange={(e) => setForm(f => ({ ...f, chickenCount: parseInt(e.target.value) || 0 }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white"
          />
        </div>

        {/* Farm Condition */}
        <div>
          <label className="text-xs font-semibold text-gray-400 block mb-3">FARM CONDITION *</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { value: ASSESSMENT_CONDITION.Good, label: 'Good', desc: 'Minor or no damage, operational', color: 'green' },
              { value: ASSESSMENT_CONDITION.Moderate, label: 'Moderate', desc: 'Partial damage, limited operation', color: 'yellow' },
              { value: ASSESSMENT_CONDITION.Bad, label: 'Bad', desc: 'Severe damage, not operational', color: 'red' }
            ].map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, condition: option.value }))}
                className={`p-4 rounded border-2 text-left transition ${
                  form.condition === option.value
                    ? `border-${option.color}-500 bg-${option.color}-900/30 ring-2 ring-${option.color}-500`
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className={`font-semibold flex items-center gap-2 ${
                  option.color === 'green' ? 'text-green-400' :
                  option.color === 'yellow' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  <span className={`w-3 h-3 rounded-full bg-${option.color}-500`}></span>
                  {option.label}
                </div>
                <p className="text-xs text-gray-400 mt-1">{option.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Field Notes */}
        <div>
          <label className="text-xs font-semibold text-gray-400 block mb-2">FIELD NOTES</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Describe visible damage, infrastructure status, immediate concerns..."
            className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white h-32 md:h-40 resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={saveDraft}
            disabled={loading}
            className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 text-white py-3 rounded font-semibold transition"
          >
            {loading ? 'Saving...' : '💾 Save Draft'}
          </button>
          <button
            type="button"
            onClick={submitAssessment}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600 disabled:opacity-50 text-white py-3 rounded font-semibold transition"
          >
            {loading ? 'Submitting...' : '✓ Submit Assessment'}
          </button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-gray-500 text-center">
          {navigator.onLine 
            ? '✓ Online - Assessment will sync immediately'
            : '⟳ Offline - Assessment will sync when online'}
        </p>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
