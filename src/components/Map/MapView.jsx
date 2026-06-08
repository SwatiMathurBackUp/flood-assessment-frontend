import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { api } from '../../lib/api'
import { FARM_STATUS, ASSESSMENT_CONDITION } from '../../lib/statuses'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
})

// Custom colored markers
const createIcon = (color) => L.divIcon({
  className: '',
  html: `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      background: ${color};
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
})

const STATUS_COLORS = {
  [FARM_STATUS.Pending]: '#6b7280',
  [FARM_STATUS.PendingSync]: '#f59e0b',
  [FARM_STATUS.InProgress]: '#3b82f6',
  [FARM_STATUS.Completed]: '#22c55e'
}

const COND_COLORS = {
  [ASSESSMENT_CONDITION.Good]: '#22c55e',
  [ASSESSMENT_CONDITION.Moderate]: '#f59e0b',
  [ASSESSMENT_CONDITION.Bad]: '#ef4444'
}

export default function MapView() {
  const [pins, setPins] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [colorBy, setColorBy] = useState('status')

  useEffect(() => {
    loadPins()
  }, [])

  const loadPins = async () => {
    setLoading(true)
    try {
      const data = await api.getMapPins()
      setPins(data)
    } catch {
      console.error('Failed to load map pins')
    } finally {
      setLoading(false)
    }
  }

  const getColor = (pin) => {
    if (colorBy === 'status') {
      return STATUS_COLORS[pin.status] || '#6b7280'
    }
    return pin.condition ? COND_COLORS[pin.condition] : '#6b7280'
  }

  // Center on Madison County, NC
  const center = [35.9582, -82.7541]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 font-mono text-sm">
          Loading map...
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen md:h-screen">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3
          flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-bold text-white">Map View</h1>
          <p className="text-xs text-gray-500">
            {pins.length} farms · Madison County, NC
          </p>
        </div>

        {/* Color By Toggle */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setColorBy('status')}
            className={`px-3 py-1 rounded text-xs font-semibold
                transition-all
                ${colorBy === 'status'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400'
                }`}
          >
            By Status
          </button>
          <button
            onClick={() => setColorBy('condition')}
            className={`px-3 py-1 rounded text-xs font-semibold
                transition-all
                ${colorBy === 'condition'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400'
                }`}
          >
            By Condition
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2
          flex gap-4 flex-shrink-0">
        {colorBy === 'status' ? (
          Object.entries(STATUS_COLORS).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full"
                style={{ background: color }} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))
        ) : (
          Object.entries(COND_COLORS).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full"
                style={{ background: color }} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='© OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pins.map(pin => (
            <Marker
              key={pin.id}
              position={[pin.latitude, pin.longitude]}
              icon={createIcon(getColor(pin))}
              eventHandlers={{
                click: () => setSelected(pin)
              }}
            >
              <Popup>
                <div className="text-sm min-w-48">
                  <p className="font-bold text-gray-900 mb-1">
                    {pin.farmName}
                  </p>
                  <p className="text-gray-600 text-xs mb-2">
                    {pin.address}
                  </p>
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className="font-semibold">{pin.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Assessor</span>
                      <span className="font-semibold">
                        {pin.assignedToName}
                      </span>
                    </div>
                    {pin.condition && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Condition</span>
                        <span className="font-semibold">{pin.condition}</span>
                      </div>
                    )}
                    {pin.chickenCount && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Chickens</span>
                        <span className="font-semibold">
                          {pin.chickenCount.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}