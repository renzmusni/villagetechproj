'use client'

import { useState, useEffect } from 'react'
import { Home, Car, Users, CreditCard, Bell, Calendar, Plus, User, Settings, LogOut, AlertCircle, QrCode, Package } from 'lucide-react'
import { announcementsAPI, profileAPI } from '../lib/api'

export default function ResidencePortal() {
  const [activeTab, setActiveTab] = useState('home')
  const [user, setUser] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Check authentication and fetch data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuthenticated = localStorage.getItem('isAuthenticated')
      if (!isAuthenticated) {
        window.location.href = '/login'
        return
      }

      const userData = localStorage.getItem('user')
      if (userData) {
        setUser(JSON.parse(userData))
      }

      fetchData()
    }
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch announcements
      const announcementsResponse = await announcementsAPI.getAnnouncements('limit=5')
      if (announcementsResponse.data.success) {
        setAnnouncements(announcementsResponse.data.data || [])
      }

    } catch (err: any) {
      console.error('Fetch data error:', err)
      setError(err.response?.data?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('userRole')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  }

  const mobileMenuItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'household', icon: Users, label: 'Household' },
    { id: 'vehicles', icon: Car, label: 'Vehicles' },
    { id: 'qr', icon: QrCode, label: 'QR Pass' },
    { id: 'profile', icon: User, label: 'Profile' },
  ]

  const quickActions = [
    { title: 'Add Vehicle', description: 'Register new vehicle', icon: Car, color: 'bg-blue-500' },
    { title: 'Guest QR', description: 'Create guest QR code', icon: QrCode, color: 'bg-green-500' },
    { title: 'Gate Pass', description: 'Request access pass', icon: Calendar, color: 'bg-purple-500' },
    { title: 'Pay Dues', description: 'Pay HOA fees', icon: CreditCard, color: 'bg-yellow-500' },
  ]

  // Helper functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const householdInfo = {
    address: '456 Oak Ave, Apt 7B',
    unit: '7B',
    members: 3,
    vehicles: 2,
    guests: 1
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">My Home</h1>
              <p className="text-xs text-gray-500">{householdInfo.unit}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'J'}
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="px-4 py-6 space-y-6">
        {/* Household Info Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold">{householdInfo.address}</h2>
              <p className="text-blue-100 text-sm">Unit {householdInfo.unit}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1">
              <p className="text-xs font-medium">Active</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <p className="text-xl font-bold">{householdInfo.members}</p>
              <p className="text-xs text-blue-100">Members</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <p className="text-xl font-bold">{householdInfo.vehicles}</p>
              <p className="text-xs text-blue-100">Vehicles</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <p className="text-xl font-bold">{householdInfo.guests}</p>
              <p className="text-xs text-blue-100">Guests</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <p className="text-xl font-bold">✓</p>
              <p className="text-xs text-blue-100">Dues</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-all text-left active:scale-95"
              >
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{action.title}</h3>
                <p className="text-xs text-gray-600 line-clamp-2">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Announcements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent Announcements</h2>
            <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
              View All
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-red-600">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No announcements</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {announcements.slice(0, 3).map((announcement) => (
                  <div key={announcement.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1 text-sm">{announcement.title}</h3>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{announcement.content}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(announcement.publishedAt)}
                        </div>
                      </div>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Account Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Dues</span>
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Paid
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Access</span>
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Upcoming</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900">Board Meeting</p>
                  <p className="text-xs text-gray-500">Tomorrow</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900">Pool Maintenance</p>
                  <p className="text-xs text-gray-500">Saturday</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-5 h-16">
          {mobileMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                activeTab === item.id
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}