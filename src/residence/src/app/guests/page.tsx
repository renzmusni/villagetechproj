'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, QrCode, Users, Calendar, Clock, X, Check, AlertTriangle, Car, User, ChevronRight, Filter, MoreVertical } from 'lucide-react'
import { guestsAPI } from '../../lib/api'

interface Guest {
  id: string
  household_id: string
  host_id: string
  tenant_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  purpose: string
  visit_type: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  access_notes?: string
  vehicle_info?: string
  qr_code: string
  status: string
  duration_days: number
  access_count: number
  last_access?: string
  last_access_point?: string
  created_at: string
  updated_at: string
}

export default function GuestsPage() {
  const [activeTab, setActiveTab] = useState('guests')
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    purpose: '',
    visitType: 'day-visit',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    accessNotes: '',
    vehicleInfo: ''
  })

  useEffect(() => {
    if (activeTab === 'guests') {
      fetchGuests()
    }
  }, [activeTab, searchTerm, statusFilter])

  const fetchGuests = async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      })

      const response = await guestsAPI.getGuests(params.toString())
      if (response.data.success) {
        setGuests(response.data.data || [])
      }
    } catch (err: any) {
      console.error('Fetch guests error:', err)
      setError(err.response?.data?.message || 'Failed to fetch guests')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGuest = async () => {
    try {
      // Get user info from localStorage to use as host
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}

      const guestData = {
        householdId: user.householdId || '1', // Use household from user or fallback
        hostId: user.id || '1', // Use user ID or fallback
        ...formData,
        // Use today's date as default if not provided
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        endDate: formData.endDate || new Date().toISOString().split('T')[0]
      }

      const response = await guestsAPI.createGuest(guestData)
      if (response.data.success) {
        setShowCreateModal(false)
        resetForm()
        fetchGuests()
      }
    } catch (err: any) {
      console.error('Create guest error:', err)
      setError(err.response?.data?.message || 'Failed to create guest')
    }
  }

  const handleDeleteGuest = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this guest registration?')) return

    try {
      const response = await guestsAPI.deleteGuest(id)
      if (response.data.success) {
        fetchGuests()
      }
    } catch (err: any) {
      console.error('Delete guest error:', err)
      setError(err.response?.data?.message || 'Failed to delete guest')
    }
  }

  const openQRModal = (guest: Guest) => {
    setSelectedGuest(guest)
    setShowQRModal(true)
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      purpose: '',
      visitType: 'day-visit',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      accessNotes: '',
      vehicleInfo: ''
    })
    setSelectedGuest(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return timeString ? new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) : ''
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Check className="w-4 h-4" />
      case 'expired': return <AlertTriangle className="w-4 h-4" />
      case 'cancelled': return <X className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case 'day-visit': return 'Day Visit'
      case 'multi-day': return 'Multi-Day'
      case 'delivery': return 'Delivery'
      case 'contractor': return 'Contractor'
      default: return type
    }
  }

  const isExpired = (guest: Guest) => {
    const now = new Date()
    const endDate = new Date(guest.end_date)
    return now > endDate
  }

  const activeGuestsCount = guests.filter(g => g.status === 'active' && !isExpired(g)).length
  const todayGuestsCount = guests.filter(g => {
    const today = new Date().toISOString().split('T')[0]
    return g.start_date === today && g.status === 'active'
  }).length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Guest Management</h1>
              <p className="text-xs text-gray-500">Register guests & create QR codes</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Guest</span>
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Active Guests</p>
              <p className="text-2xl font-bold text-gray-900">{activeGuestsCount}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Today's Guests</p>
              <p className="text-2xl font-bold text-gray-900">{todayGuestsCount}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search guests by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={fetchGuests}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200">
          <div className="flex items-center">
            <span className="text-sm text-red-600">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Guests List */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : guests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No guests found</h3>
            <p className="text-sm text-gray-500 mb-4">Get started by registering your first guest</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Register Guest
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {guests.map((guest) => (
              <div key={guest.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {guest.first_name} {guest.last_name}
                        </h3>
                        <p className="text-sm text-gray-500">{guest.purpose}</p>
                      </div>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(guest.status)}`}>
                        {getStatusIcon(guest.status)}
                        <span className="ml-1">{guest.status.charAt(0).toUpperCase() + guest.status.slice(1)}</span>
                      </span>
                    </div>

                    <div className="ml-13 space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(guest.start_date)} - {formatDate(guest.end_date)}
                        <span className="mx-2">•</span>
                        {getVisitTypeLabel(guest.visit_type)}
                      </div>

                      {guest.start_time && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-2" />
                          {formatTime(guest.start_time)} - {formatTime(guest.end_time)}
                        </div>
                      )}

                      {guest.vehicle_info && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Car className="w-4 h-4 mr-2" />
                          {guest.vehicle_info}
                        </div>
                      )}

                      <div className="flex items-center text-sm text-gray-600">
                        <QrCode className="w-4 h-4 mr-2" />
                        <span className="font-mono text-xs">#{guest.qr_code.split('-')[1]}</span>
                        {guest.access_count > 0 && (
                          <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                            {guest.access_count} check-ins
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => openQRModal(guest)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Show QR Code"
                    >
                      <QrCode className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteGuest(guest.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cancel Guest"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Guest Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowCreateModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Register New Guest</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Name *</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purpose *</label>
                    <input
                      type="text"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      placeholder="e.g., Family visit, Business meeting"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Visit Type</label>
                    <select
                      value={formData.visitType}
                      onChange={(e) => setFormData({ ...formData, visitType: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                    >
                      <option value="day-visit">Day Visit</option>
                      <option value="multi-day">Multi-Day</option>
                      <option value="delivery">Delivery</option>
                      <option value="contractor">Contractor</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date *</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Time</label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Time</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle Info</label>
                    <input
                      type="text"
                      value={formData.vehicleInfo}
                      onChange={(e) => setFormData({ ...formData, vehicleInfo: e.target.value })}
                      placeholder="e.g., Honda Civic - ABC 123"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Access Notes</label>
                    <textarea
                      value={formData.accessNotes}
                      onChange={(e) => setFormData({ ...formData, accessNotes: e.target.value })}
                      rows={3}
                      placeholder="Any special access instructions for security"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleCreateGuest}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Register Guest
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedGuest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowQRModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Guest QR Code</h3>
                <div className="text-center space-y-4">
                  <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                    <QrCode className="w-24 h-24 text-gray-400" />
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">
                      {selectedGuest.first_name} {selectedGuest.last_name}
                    </h4>
                    <p className="text-sm text-gray-600">{selectedGuest.purpose}</p>
                    <div className="text-xs text-gray-500 bg-gray-100 rounded-lg p-2 font-mono">
                      {selectedGuest.qr_code}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Valid: {formatDate(selectedGuest.start_date)} - {formatDate(selectedGuest.end_date)}</p>
                    {selectedGuest.start_time && (
                      <p>Time: {formatTime(selectedGuest.start_time)} - {formatTime(selectedGuest.end_time)}</p>
                    )}
                    <p>Access Count: {selectedGuest.access_count}</p>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">Share this QR code with your guest for easy access</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}