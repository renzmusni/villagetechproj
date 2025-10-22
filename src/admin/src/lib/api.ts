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
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/api/auth/login', credentials),

  refreshToken: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refreshToken }),

  logout: () => api.post('/api/auth/logout'),

  getProfile: () => api.get('/api/auth/profile'),
}

// Users API
export const usersAPI = {
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    api.get('/users', { params }),

  getUser: (id: string) => api.get(`/users/${id}`),

  createUser: (userData: any) => api.post('/users', userData),

  updateUser: (id: string, userData: any) => api.put(`/users/${id}`, userData),

  deleteUser: (id: string) => api.delete(`/users/${id}`),

  resetPassword: (id: string) => api.post(`/users/${id}/reset-password`),

  toggleMFA: (id: string) => api.post(`/api/users/${id}/toggle-mfa`),
}

// Communities API
export const communitiesAPI = {
  getCommunities: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/api/communities', { params }),

  getCommunity: (id: string) => api.get(`/api/communities/${id}`),

  createCommunity: (communityData: any) => api.post('/api/communities', communityData),

  updateCommunity: (id: string, communityData: any) => api.put(`/api/communities/${id}`, communityData),

  deleteCommunity: (id: string) => api.delete(`/api/communities/${id}`),
}

// Tenants API
export const tenantsAPI = {
  getTenants: (params?: { page?: number; limit?: number; search?: string; communityId?: string }) =>
    api.get('/api/tenants', { params }),

  getTenant: (id: string) => api.get(`/api/tenants/${id}`),

  createTenant: (tenantData: any) => api.post('/api/tenants', tenantData),

  updateTenant: (id: string, tenantData: any) => api.put(`/api/tenants/${id}`, tenantData),

  deleteTenant: (id: string) => api.delete(`/api/tenants/${id}`),
}

// Households API
export const householdsAPI = {
  getHouseholds: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/households', { params }),

  getHousehold: (id: string) => api.get(`/households/${id}`),

  createHousehold: (householdData: any) => api.post('/households', householdData),

  updateHousehold: (id: string, householdData: any) => api.put(`/households/${id}`, householdData),

  deleteHousehold: (id: string) => api.delete(`/households/${id}`),

  getHouseholdMembers: (id: string) => api.get(`/households/${id}/members`),

  addMember: (id: string, userId: string) => api.post(`/households/${id}/members`, { userId }),

  removeMember: (id: string, userId: string) => api.delete(`/households/${id}/members/${userId}`),
}

// Vehicles API
export const vehiclesAPI = {
  getVehicles: (params?: { page?: number; limit?: number; search?: string; householdId?: string }) =>
    api.get('/vehicles', { params }),

  getVehicle: (id: string) => api.get(`/vehicles/${id}`),

  createVehicle: (vehicleData: any) => api.post('/vehicles', vehicleData),

  updateVehicle: (id: string, vehicleData: any) => api.put(`/vehicles/${id}`, vehicleData),

  deleteVehicle: (id: string) => api.delete(`/vehicles/${id}`),

  renewRegistration: (id: string, expiryDate: string) =>
    api.post(`/vehicles/${id}/renew-registration`, { expiryDate }),

  renewInsurance: (id: string, expiryDate: string) =>
    api.post(`/vehicles/${id}/renew-insurance`, { expiryDate }),
}

// Gate Passes API
export const gatePassesAPI = {
  getGatePasses: (params?: { page?: number; limit?: number; status?: string; type?: string }) =>
    api.get('/gate-passes', { params }),

  getGatePass: (id: string) => api.get(`/gate-passes/${id}`),

  createGatePass: (gatePassData: any) => api.post('/gate-passes', gatePassData),

  approveGatePass: (id: string) => api.post(`/gate-passes/${id}/approve`),

  rejectGatePass: (id: string, reason?: string) =>
    api.post(`/gate-passes/${id}/reject`, { reason }),

  cancelGatePass: (id: string) => api.post(`/gate-passes/${id}/cancel`),

  generateQRCode: (id: string) => api.get(`/gate-passes/${id}/qr-code`),
}

// Guests API
export const guestsAPI = {
  getGuests: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get('/guests', { params }),

  getGuest: (id: string) => api.get(`/guests/${id}`),

  createGuest: (guestData: any) => api.post('/guests', guestData),

  updateGuest: (id: string, guestData: any) => api.put(`/guests/${id}`, guestData),

  deleteGuest: (id: string) => api.delete(`/guests/${id}`),

  checkIn: (id: string) => api.post(`/guests/${id}/check-in`),

  checkOut: (id: string) => api.post(`/guests/${id}/check-out`),
}

// Announcements API
export const announcementsAPI = {
  getAnnouncements: (params?: { page?: number; limit?: number; published?: boolean }) =>
    api.get('/announcements', { params }),

  getAnnouncement: (id: string) => api.get(`/announcements/${id}`),

  createAnnouncement: (announcementData: any) => api.post('/announcements', announcementData),

  updateAnnouncement: (id: string, announcementData: any) =>
    api.put(`/announcements/${id}`, announcementData),

  deleteAnnouncement: (id: string) => api.delete(`/announcements/${id}`),

  publishAnnouncement: (id: string) => api.post(`/announcements/${id}/publish`),

  unpublishAnnouncement: (id: string) => api.post(`/announcements/${id}/unpublish`),
}

// Payments API
export const paymentsAPI = {
  getPayments: (params?: { page?: number; limit?: number; status?: string; householdId?: string }) =>
    api.get('/payments', { params }),

  getPayment: (id: string) => api.get(`/payments/${id}`),

  createPayment: (paymentData: any) => api.post('/payments', paymentData),

  processPayment: (id: string, gatewayData: any) =>
    api.post(`/payments/${id}/process`, gatewayData),

  refundPayment: (id: string, amount?: number, reason?: string) =>
    api.post(`/payments/${id}/refund`, { amount, reason }),

  generateHOADues: (data: any) => api.post('/payments/generate-hoa-dues', data),

  getOverduePayments: () => api.get('/payments/overdue'),

  sendPaymentReminder: (id: string) => api.post(`/payments/${id}/remind`),
}

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/api/dashboard/stats'),

  getRecentActivity: () => api.get('/api/dashboard/recent-activity'),

  getPaymentOverview: () => api.get('/api/dashboard/payments'),

  getOccupancyStats: () => api.get('/api/dashboard/occupancy'),
}

export default api