const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

function getToken() {
  return localStorage.getItem('tawati_token')
}

export async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    // Network-level failure (server down, no connection) — distinct from
    // an API error response, so the UI can show "can't connect" instead
    // of a validation-style message.
    throw { networkError: true, message: "Can't connect to the server right now." }
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // No JSON body (e.g. a 204) — fine, leave data as null.
  }

  if (!res.ok) {
    throw { status: res.status, message: data?.error || 'Something went wrong' }
  }

  return data
}

export const api = {
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: 'POST', body }),
  put: (path, body) => apiRequest(path, { method: 'PUT', body }),
  patch: (path, body) => apiRequest(path, { method: 'PATCH', body }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
}
