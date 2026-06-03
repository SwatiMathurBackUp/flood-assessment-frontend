const TOKEN_KEY = 'flood_auth_token'
const USER_KEY = 'flood_auth_user'

export function saveAuth(data) {
  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(USER_KEY, JSON.stringify({
    userId: data.userId,
    name: data.name,
    role: data.role,
    expiresAt: data.expiresAt
  }))
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  const user = localStorage.getItem(USER_KEY)
  return user ? JSON.parse(user) : null
}

export function isLoggedIn() {
  const token = getToken()
  const user = getUser()
  if (!token || !user) return false
  // Check if token is expired
  if (new Date(user.expiresAt) < new Date()) {
    clearAuth()
    return false
  }
  return true
}

export function isManager() {
  const user = getUser()
  return user?.role === 'Manager'
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}