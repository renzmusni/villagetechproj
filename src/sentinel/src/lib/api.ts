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

// Profile API
export const profileAPI = {
  getProfile: () => api.get('/api/user/profile'),
}

// Announcements API
export const announcementsAPI = {
  getAnnouncements: (params?: string) =>
    api.get(`/api/announcements${params ? `?${params}` : ''}`),

  getAnnouncement: (id: string) => api.get(`/api/announcements/${id}`),

  createAnnouncement: (announcementData: any) => api.post('/api/announcements', announcementData),

  updateAnnouncement: (id: string, announcementData: any) =>
    api.put(`/api/announcements/${id}`, announcementData),

  deleteAnnouncement: (id: string) => api.delete(`/api/announcements/${id}`),

  publishAnnouncement: (id: string) => api.post(`/api/announcements/${id}/publish`),

  unpublishAnnouncement: (id: string) => api.post(`/api/announcements/${id}/unpublish`),
}

// Households API
export const householdsAPI = {
  getHouseholds: (params?: string) =>
    api.get(`/api/households${params ? `?${params}` : ''}`),

  getHousehold: (id: string) => api.get(`/api/households/${id}`),

  createHousehold: (householdData: any) => api.post('/api/households', householdData),

  updateHousehold: (id: string, householdData: any) =>
    api.put(`/api/households/${id}`, householdData),

  deleteHousehold: (id: string) => api.delete(`/api/households/${id}`),

  getHouseholdMembers: (id: string) => api.get(`/api/households/${id}/members`),

  addHouseholdMember: (id: string, memberData: any) =>
    api.post(`/api/households/${id}/members`, memberData),

  removeHouseholdMember: (id: string, memberId: string) =>
    api.delete(`/api/households/${id}/members/${memberId}`),
}

// Vehicles API
export const vehiclesAPI = {
  getVehicles: (params?: string) =>
    api.get(`/api/vehicles${params ? `?${params}` : ''}`),

  getVehicle: (id: string) => api.get(`/api/vehicles/${id}`),

  createVehicle: (vehicleData: any) => api.post('/api/vehicles', vehicleData),

  updateVehicle: (id: string, vehicleData: any) =>
    api.put(`/api/vehicles/${id}`, vehicleData),

  deleteVehicle: (id: string) => api.delete(`/api/vehicles/${id}`),

  renewSticker: (id: string, expiryData?: any) =>
    api.post(`/api/vehicles/${id}/renew-sticker`, expiryData),
}

// Public Announcements API (for residents)
export const publicAnnouncementsAPI = {
  getAnnouncements: (params?: string) =>
    api.get(`/api/public/announcements${params ? `?${params}` : ''}`),

  getAnnouncement: (id: string) => api.get(`/api/public/announcements/${id}`),
}

export default api