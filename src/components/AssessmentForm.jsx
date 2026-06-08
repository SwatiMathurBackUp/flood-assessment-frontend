import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { saveAssessment, savePhoto, getPhotosForAssessment, deletePhoto, markAsSynced } from '../lib/db'
import { reverseGeocode } from '../hooks/useGeolocation'
import { getUser } from '../lib/auth'
import { getDB } from '../lib/db'
import { api } from '../lib/api'
import { FARM_STATUS, ASSESSMENT_CONDITION, SYNC_STATUS } from '../lib/statuses'


const CONDITIONS = [
  { value: ASSESSMENT_CONDITION.Good, color: 'border-green-500', text: 'text-green-400',
    dot: 'bg-green-500', desc: 'Minor or no damage, operational' },
  { value: ASSESSMENT_CONDITION.Moderate, color: 'border-yellow-500', text: 'text-yellow-400',
    dot: 'bg-yellow-500', desc: 'Partial damage, limited operation' },
  { value: ASSESSMENT_CONDITION.Bad, color: 'border-red-500', text: 'text-red-400',
    dot: 'bg-red-500', desc: 'Severe damage, not operational' }
]

export default function AssessmentForm({ farm, existing, onSave, onCancel }) {
  const user = getUser()
  const isEdit = !!existing

  const [form, setForm] = useState(null)
const [formLoaded, setFormLoaded] = useState(false)

  const [photos, setPhotos] = useState([])
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [errors, setErrors] = useState({})
  const [geoStatus, setGeoStatus] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
  // Load existing assessment only once when form is not loaded
  if (!formLoaded) {
    if (isEdit && existing) {
      getPhotosForAssessment(existing.id).then(setPhotos)
      setForm({
        id: existing.id,
        assessorName: existing.assessorName,
        address: existing.address,
        latitude: existing.latitude,
        longitude: existing.longitude,
        condition: existing.condition,
        chickenCount: existing.chickenCount,
        notes: existing.notes,
        syncStatus: existing.syncStatus,
        createdAt: existing.createdAt,
        farmId: farm?.id,
        farmName: farm?.farmName
      })
      setFormLoaded(true)
    } else if (farm) {
      loadExistingAssessment()
    }
  }
}, [formLoaded, isEdit, farm?.id])

const loadExistingAssessment = async () => {
  try {
    const db = await getDB()
    const allAssessments = await db.getAll('assessments')
    
    console.log('All assessments in IndexedDB:', allAssessments)
    
    // Find the LATEST assessment for this FARM (by farmId, not address!)
    const farmAssessments = allAssessments.filter(a => a.farmId === farm?.id)
    console.log('Assessments for this farm:', farmAssessments)
    
    const existing = farmAssessments.length > 0 
      ? farmAssessments.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]
      : null
    
    console.log('Latest assessment loaded:', existing)
    
    if (existing) {
      console.log('Loading existing assessment:', existing.id)
      setForm({
        id: existing.id,
        assessorName: existing.assessorName,
        address: existing.address,
        latitude: existing.latitude,
        longitude: existing.longitude,
        condition: existing.condition,
        chickenCount: existing.chickenCount,
        notes: existing.notes,
        syncStatus: existing.syncStatus,
        createdAt: existing.createdAt,
        farmId: farm?.id,
        farmName: farm?.farmName
      })
      
      const farmPhotos = await getPhotosForAssessment(existing.id)
      setPhotos(farmPhotos)
    } else {
      // NEW assessment
      console.log('Creating new assessment')
      setForm({
        id: uuidv4(),
        assessorName: user?.name || '',
        address: farm?.address || '',
        latitude: farm?.latitude || '',
        longitude: farm?.longitude || '',
        condition: '',
        chickenCount: farm?.estimatedChickens || '',
        notes: '',
        syncStatus: 'pending',
        createdAt: new Date().toISOString(),
        farmId: farm?.id,
        farmName: farm?.farmName
      })
      setPhotos([])
    }
    setFormLoaded(true)
  } catch (err) {
    console.error('Failed to load existing assessment:', err)
    setFormLoaded(true)
  }
}
  const captureLocation = async () => {
    setGeoStatus('Acquiring GPS...')
    if (!navigator.geolocation) {
      setGeoStatus('GPS not available')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setForm(f => ({
          ...f,
          latitude: latitude.toFixed(7),
          longitude: longitude.toFixed(7)
        }))
        setGeoStatus('Resolving address...')
        const addr = await reverseGeocode(latitude, longitude)
        setForm(f => ({ ...f, address: addr }))
        setGeoStatus('✓ Location captured')
        setTimeout(() => setGeoStatus(''), 3000)
      },
      (err) => setGeoStatus('GPS error: ' + err.message),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const handlePhotoCapture = async (e) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const photoId = uuidv4()
      const photo = {
        id: photoId,
        assessmentId: form.id,
        filename: file.name,
        blob: file,
        capturedAt: new Date().toISOString(),
        previewUrl: URL.createObjectURL(file)
      }
      await savePhoto(photo)
      setPhotos(prev => [...prev, photo])
    }
  }

  const removePhoto = async (photoId) => {
    await deletePhoto(photoId)
    setPhotos(prev => {
      const removed = prev.find(p => p.id === photoId)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter(p => p.id !== photoId)
    })
  }

  const validate = () => {
    const e = {}
    if (!form.assessorName.trim()) e.assessorName = 'Required'
    if (!form.address.trim()) e.address = 'Required'
    if (!form.latitude || !form.longitude) e.location = 'Capture or enter GPS coordinates'
    if (!form.condition) e.condition = 'Select a condition'
    if (!form.chickenCount || isNaN(form.chickenCount) ||
        parseInt(form.chickenCount) < 0)
      e.chickenCount = 'Enter a valid number'
    return e
  }

  // Save draft locally
  const handleSaveDraft = async () => {
    console.log("inside handlesavedraft")
    setSaving(true)
    try {
      console.log(form)
      await saveAssessment({
        ...form,
        chickenCount: parseInt(form.chickenCount) || 0,
        syncStatus: SYNC_STATUS.Pending
      })
      // Update farm status to InProgress
      if (form.farmId) {
        try {
          await api.updateFarmStatus(form.farmId, FARM_STATUS.InProgress)
        } catch { /* offline - ok */ }
      }
      onSave()
    } finally {
      setSaving(false)
    }
  }

  // Save and sync immediately
 const handleSubmit = async () => {
  console.log('=== SUBMIT STARTED ===')
  console.log('Current form state:', form)
  
  const errs = validate()
  console.log('Validation errors:', errs)
  
  if (Object.keys(errs).length > 0) {
    setErrors(errs)
    console.log('Validation failed, stopping')
    return
  }
  
  setSaving(true)
  try {
    const assessmentData = {
      ...form,
      chickenCount: parseInt(form.chickenCount),
      syncStatus: 'pending',
      assessorName: form.assessorName,
      address: form.address,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      condition: form.condition,
      notes: form.notes || '',
      createdAt: form.createdAt
    }
    
    console.log('Assessment data to save:', assessmentData)
    
    await saveAssessment(assessmentData)
    console.log('✓ Assessment saved to IndexedDB')
    
    // Save photos
    for (const photo of photos) {
      if (photo.blob) {
        console.log('Saving photo:', photo.filename)
        await savePhoto({
          id: photo.id,
          assessmentId: form.id,
          filename: photo.filename,
          blob: photo.blob,
          capturedAt: photo.capturedAt,
          previewUrl: photo.previewUrl
        })
      }
    }
    console.log('✓ Photos saved')

    let synced = false

    if (navigator.onLine) {
      console.log('Online - attempting sync')
      setSyncing(true)
      try {
        const formData = new FormData()
        formData.append('clientId', form.id)
        formData.append('assessorName', assessmentData.assessorName)
        formData.append('address', assessmentData.address)
        formData.append('latitude', assessmentData.latitude)
        formData.append('longitude', assessmentData.longitude)
        formData.append('condition', assessmentData.condition)
        formData.append('chickenCount', assessmentData.chickenCount)
        formData.append('notes', assessmentData.notes)
        formData.append('createdAt', assessmentData.createdAt)

        photos.forEach(photo => {
          if (photo.blob) formData.append('photos', photo.blob, photo.filename)
        })

        await api.syncAssessment(formData)
        console.log('✓ Synced to backend')
        await markAsSynced(form.id)
        synced = true
      } catch (err) {
        console.log('Sync failed (will retry later):', err.message)
        synced = false
      }
      setSyncing(false)
    } else {
      console.log('Offline - data queued for sync')
      synced = false
    }

    // UPDATE FARM STATUS based on sync result
    if (form.farmId) {
      try {
        const newStatus = synced ? FARM_STATUS.Completed : FARM_STATUS.PendingSync
        await api.updateFarmStatus(form.farmId, newStatus)
        console.log(`✓ Farm status updated to ${newStatus}`)
      } catch (err) {
        console.log('Farm status update failed (will update later):', err.message)
      }
    }
    
    console.log('=== SUBMIT COMPLETE ===')
    onSave()
  } catch (err) {
    console.error('SUBMIT ERROR:', err)
    setErrors({ submit: 'Failed to save assessment' })
  } finally {
    setSaving(false)
  }
}

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(err => ({ ...err, [field]: undefined }))
  }
if (!formLoaded || !form) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-400 font-mono text-sm">Loading assessment...</div>
    </div>
  )
}
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3
          flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onCancel}
          className="text-blue-400 font-semibold text-sm">
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold truncate">
            {farm?.farmName || 'Assessment'}
          </h2>
          {farm?.ownerName && (
            <p className="text-xs text-gray-500">{farm.ownerName}</p>
          )}
        </div>
        <span className="font-mono text-xs text-gray-500 bg-gray-800
            px-2 py-1 rounded flex-shrink-0">
          #{form.id.slice(0, 6).toUpperCase()}
        </span>
      </div>

      <div className="p-4 md:p-8 flex flex-col md:grid md:grid-cols-2
          md:gap-x-6 gap-5 pb-10">

        {/* Farm Info Banner */}
        {farm && (
          <div className="md:col-span-2 bg-blue-950/30 border
              border-blue-900/40 rounded-xl p-3 flex gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-400 font-semibold mb-0.5">
                Assigned Farm
              </p>
              <p className="text-sm font-semibold text-white truncate">
                {farm.farmName}
              </p>
              <p className="text-xs text-gray-400 truncate">{farm.address}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-500">Est. chickens</p>
              <p className="text-sm font-mono font-bold text-blue-400">
                {farm.estimatedChickens?.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Assessor Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider
              text-gray-400">
            Assessor Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="Your full name"
            value={form.assessorName}
            onChange={set('assessorName')}
            className={`bg-gray-900 border rounded-lg px-3 py-3 text-sm
                text-white placeholder-gray-600 focus:outline-none
                focus:border-blue-500
                ${errors.assessorName ? 'border-red-500' : 'border-gray-700'}`}
          />
          {errors.assessorName && (
            <span className="text-xs text-red-400">{errors.assessorName}</span>
          )}
        </div>

        {/* GPS Location */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider
              text-gray-400">
            GPS Location <span className="text-red-400">*</span>
          </label>
          <button
            onClick={captureLocation}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3
                py-3 text-sm text-blue-400 font-semibold flex items-center
                justify-center gap-2 hover:border-blue-500"
          >
            📍 Capture GPS Location
          </button>
          {geoStatus && (
            <p className="text-xs text-gray-400 font-mono">{geoStatus}</p>
          )}
          {form.latitude && (
            <div className="flex gap-4 bg-gray-900 border border-blue-900
                rounded-lg px-3 py-2 font-mono text-xs text-blue-400">
              <span>{parseFloat(form.latitude).toFixed(5)}°N</span>
              <span>{parseFloat(form.longitude).toFixed(5)}°W</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Latitude"
              value={form.latitude}
              onChange={set('latitude')}
              className={`bg-gray-900 border rounded-lg px-3 py-2.5 text-sm
                  text-white placeholder-gray-600 focus:outline-none
                  focus:border-blue-500
                  ${errors.location ? 'border-red-500' : 'border-gray-700'}`}
            />
            <input
              type="number"
              placeholder="Longitude"
              value={form.longitude}
              onChange={set('longitude')}
              className={`bg-gray-900 border rounded-lg px-3 py-2.5 text-sm
                  text-white placeholder-gray-600 focus:outline-none
                  focus:border-blue-500
                  ${errors.location ? 'border-red-500' : 'border-gray-700'}`}
            />
          </div>
          {errors.location && (
            <span className="text-xs text-red-400">{errors.location}</span>
          )}
        </div>

        {/* Address */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider
              text-gray-400">
            Farm Address <span className="text-red-400">*</span>
          </label>
          <textarea
            placeholder="Full address or landmark description"
            value={form.address}
            onChange={set('address')}
            rows={2}
            className={`bg-gray-900 border rounded-lg px-3 py-3 text-sm
                text-white placeholder-gray-600 focus:outline-none
                focus:border-blue-500 resize-none
                ${errors.address ? 'border-red-500' : 'border-gray-700'}`}
          />
          {errors.address && (
            <span className="text-xs text-red-400">{errors.address}</span>
          )}
        </div>

        {/* Chicken Count */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider
              text-gray-400">
            Total Chicken Count <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            placeholder="e.g. 15000"
            min="0"
            value={form.chickenCount}
            onChange={set('chickenCount')}
            className={`bg-gray-900 border rounded-lg px-3 py-3 text-sm
                text-white placeholder-gray-600 focus:outline-none
                focus:border-blue-500
                ${errors.chickenCount ? 'border-red-500' : 'border-gray-700'}`}
          />
          {errors.chickenCount && (
            <span className="text-xs text-red-400">{errors.chickenCount}</span>
          )}
        </div>

        {/* Condition */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider
              text-gray-400">
            Farm Condition <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
  {CONDITIONS.map(c => (
    <button
      key={c.value}
      onClick={() => {
        console.log('Clicked condition:', c.value) // DEBUG
        setForm(f => {
          console.log('Form before:', f.condition) // DEBUG
          return { ...f, condition: c.value }
        })
        setErrors(e => ({ ...e, condition: undefined }))
      }}
      className={`border-2 rounded-lg px-4 py-3 flex items-center
          gap-3 transition-all
          ${form.condition === c.value
            ? `${c.color} bg-gray-800`
            : 'border-gray-700 bg-gray-900'
          }`}
    >
      <div className={`w-3 h-3 rounded-full ${c.dot} flex-shrink-0`} />
      <div className="text-left">
        <div className={`text-sm font-bold
            ${form.condition === c.value ? c.text : 'text-white'}`}>
          {c.value}
        </div>
        <div className="text-xs text-gray-500">{c.desc}</div>
      </div>
    </button>
  ))}
</div>
          {errors.condition && (
            <span className="text-xs text-red-400">{errors.condition}</span>
          )}
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider
              text-gray-400">
            Field Notes
          </label>
          <textarea
            placeholder="Describe visible damage, infrastructure status,
                immediate concerns..."
            value={form.notes}
            onChange={set('notes')}
            rows={4}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3
                py-3 text-sm text-white placeholder-gray-600
                focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* Photos */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider
              text-gray-400">
            Site Photos
          </label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {photos.map(p => (
              <div key={p.id}
                className="relative aspect-square rounded-lg overflow-hidden
                    bg-gray-800">
                <img src={p.previewUrl} alt="site"
                  className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(p.id)}
                  className="absolute top-1 right-1 bg-black/70 text-white
                      rounded-full w-5 h-5 flex items-center justify-center
                      text-sm"
                >×</button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current.click()}
              className="aspect-square border-2 border-dashed border-gray-700
                  rounded-lg flex flex-col items-center justify-center gap-1
                  text-gray-500 hover:border-blue-500 hover:text-blue-400
                  transition-all"
            >
              <span className="text-2xl">📷</span>
              <span className="text-xs">Add Photo</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 md:col-span-2 mt-2">
          <button
            onClick={handleSubmit}
            disabled={saving || syncing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                text-white font-bold py-4 rounded-xl text-base
                transition-all active:scale-95"
          >
            {syncing ? 'Syncing...' :
             saving ? 'Saving...' : '✓ Submit Assessment'}
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-60
                text-gray-300 font-semibold py-3 rounded-xl text-sm
                transition-all border border-gray-700"
          >
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  )
}