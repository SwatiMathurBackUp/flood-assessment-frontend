import { useState } from 'react'
import { api } from '../../lib/api'
import { saveAuth } from '../../lib/auth'

export default function Login({ onLogin }) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || pin.length !== 4) {
      setError('Please enter your name and 4-digit PIN')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.login(name, pin)
      saveAuth(data)
      onLogin(data)
    } catch {
      setError('Invalid name or PIN. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePinInput = (val) => {
    if (/^\d{0,4}$/.test(val)) setPin(val)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐔</div>
          <p className="text-xs font-mono font-semibold text-blue-400
             tracking-widest uppercase mb-1">
            Ceres Field Operations
          </p>
          <h1 className="text-2xl font-bold text-white">Flood Assessment</h1>
          <p className="text-sm text-gray-500 mt-1">Madison County, NC</p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6
            flex flex-col gap-4">

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider
                text-gray-400">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3
                  py-3 text-sm text-white placeholder-gray-600
                  focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* PIN */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider
                text-gray-400">
              4-Digit PIN
            </label>
            <input
              type="password"
              placeholder="••••"
              maxLength={4}
              value={pin}
              onChange={e => handlePinInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3
                  py-3 text-sm text-white placeholder-gray-600
                  focus:outline-none focus:border-blue-500 tracking-widest
                  text-center text-lg"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                text-white font-bold py-3 rounded-xl text-sm
                transition-all active:scale-95 mt-1"
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl
            p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase
              tracking-wider mb-2">
            Demo Credentials
          </p>
          <div className="flex flex-col gap-1.5 text-xs font-mono">
            <div className="flex justify-between text-gray-400">
              <span>Admin Manager</span>
              <span className="text-blue-400">PIN: 1234</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>John Smith</span>
              <span className="text-blue-400">PIN: 1111</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Sarah Johnson</span>
              <span className="text-blue-400">PIN: 2222</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Mike Davis</span>
              <span className="text-blue-400">PIN: 3333</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}