import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4003'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('isAuthenticated')
        localStorage.removeItem('userEmail')
        localStorage.removeItem('userRole')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/api/auth/login', credentials),

  getProfile: () => api.get('/api/user/profile'),
}

// Announcements API (Public view for residents)
export const announcementsAPI = {
  getAnnouncements: (params?: string) =>
    api.get(`/api/public/announcements${params ? `?${params}` : ''}`),

  getAnnouncement: (id: string) => api.get(`/api/public/announcements/${id}`),
}

// Profile API
export const profileAPI = {
  getProfile: () => api.get('/api/user/profile'),
}

// Guests API
export const guestsAPI = {
  getGuests: (params?: string) =>
    api.get(`/api/guests${params ? `?${params}` : ''}`),

  getGuest: (id: string) => api.get(`/api/guests/${id}`),

  createGuest: (guestData: any) => api.post('/api/guests', guestData),

  updateGuest: (id: string, guestData: any) =>
    api.put(`/api/guests/${id}`, guestData),

  deleteGuest: (id: string) => api.delete(`/api/guests/${id}`),

  checkInGuest: (id: string, accessData?: any) =>
    api.post(`/api/guests/${id}/check-in`, accessData),

  getGuestQRCode: (id: string) => api.get(`/api/guests/${id}/qr-code`),
}

export default api