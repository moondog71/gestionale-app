const BASE = '/api'

function getToken() { return localStorage.getItem('token') }
function getRefreshToken() { return localStorage.getItem('refreshToken') }
function saveTokens(token: string, refreshToken?: string) {
  localStorage.setItem('token', token)
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
}
function clearTokens() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
}

async function refreshAccessToken(): Promise<boolean> {
  const rt = getRefreshToken()
  if (!rt) return false
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    })
    if (!res.ok) { clearTokens(); return false }
    const { token } = await res.json()
    saveTokens(token)
    return true
  } catch { clearTokens(); return false }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    const ok = await refreshAccessToken()
    if (ok) {
      headers['Authorization'] = `Bearer ${getToken()}`
      res = await fetch(`${BASE}${path}`, { ...options, headers })
    } else {
      window.location.href = '/login'
      throw new Error('Non autorizzato')
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Errore server' }))
    throw new Error(err.error || 'Errore server')
  }
  return res.json()
}

export async function apiLogin(username: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error('Credenziali non valide')
  const data = await res.json()
  saveTokens(data.token, data.refreshToken)
  return data
}

export async function apiLogout() {
  const rt = getRefreshToken()
  if (rt) await fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  }).catch(() => {})
  clearTokens()
}

export { saveTokens, clearTokens, getToken }
