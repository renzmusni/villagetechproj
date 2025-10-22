'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building, Users, Car, CreditCard, Home, Megaphone, Menu, X, Activity, LogOut, User, CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react'
import { profileAPI, announcementsAPI } from '../lib/api'

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Check authentication and fetch data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuthenticated = localStorage.getItem('isAuthenticated')
      const userRole = localStorage.getItem('userRole')

      if (!isAuthenticated || !userRole || (!userRole.includes('admin') && !userRole.includes('superadmin'))) {
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

      // Fetch announcements for security staff
      const announcementsResponse = await announcementsAPI.getAnnouncements('limit=5&priority=urgent,high')
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

  const menuItems = [
    { icon: Activity, label: 'Dashboard', active: true, href: '/' },
    { icon: Home, label: 'Households', active: false, href: '/households' },
    { icon: Users, label: 'Residents', active: false, href: '#' },
    { icon: Car, label: 'Vehicle Stickers', active: false, href: '/vehicles' },
    { icon: CreditCard, label: 'Gate Passes', active: false, href: '#' },
    { icon: Megaphone, label: 'Announcements', active: false, href: '#' },
  ]

  const recentActivity = [
    {
      id: 1,
      type: 'household',
      action: 'New Household Registered',
      details: 'Johnson Family - Unit 205B',
      time: '2 min ago',
      status: 'success',
      user: 'Maria Garcia'
    },
    {
      id: 2,
      type: 'payment',
      action: 'Payment Received',
      details: 'Chen Family - Monthly dues',
      time: '15 min ago',
      status: 'success',
      user: 'System'
    },
    {
      id: 3,
      type: 'vehicle',
      action: 'Vehicle Sticker Issued',
      details: 'Tesla Model 3 - EV-789',
      time: '1 hour ago',
      status: 'success',
      user: 'David Wilson'
    },
    {
      id: 4,
      type: 'announcement',
      action: 'Community Announcement Posted',
      details: 'Pool Maintenance Notice',
      time: '2 hours ago',
      status: 'success',
      user: 'Maria Garcia'
    },
  ]

  const quickStats = [
    { label: 'Total Households', value: '142', change: '+3', icon: Home, color: 'text-blue-600 bg-blue-100' },
    { label: 'Active Residents', value: '387', change: '+8', icon: Users, color: 'text-green-600 bg-green-100' },
    { label: 'Vehicle Stickers', value: '234', change: '+5', icon: Car, color: 'text-purple-600 bg-purple-100' },
    { label: 'Pending Payments', value: '12', change: '-2', icon: CreditCard, color: 'text-orange-600 bg-orange-100' },
  ]

  const accessMethods = [
    {
      title: 'Manage Households',
      description: 'Add and manage household registrations',
      icon: Home,
      color: 'bg-blue-500',
      href: '/households'
    },
    {
      title: 'Vehicle Stickers',
      description: 'Issue and manage vehicle stickers',
      icon: Car,
      color: 'bg-green-500',
      href: '/vehicles'
    },
    {
      title: 'Gate Passes',
      description: 'Create and approve gate passes',
      icon: CreditCard,
      color: 'bg-purple-500',
      href: '#gatepasses'
    },
    {
      title: 'New Announcement',
      description: 'Create community announcements',
      icon: Megaphone,
      color: 'bg-orange-500',
      href: '#announcements'
    },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 bg-blue-600 text-white">
          <div className="flex items-center">
            <Building className="w-6 h-6 mr-2" />
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  item.active
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin Manager'}</p>
              <p className="text-xs text-gray-500">{user?.role?.replace('-', ' ') || 'HOA Administrator'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-semibold text-gray-900">{user?.name || 'Admin Manager'}</span>
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-6 py-8">
            {/* Community Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-800">Community Update</h3>
                  <p className="text-sm text-blue-600 mt-1">
                    3 new household registrations pending approval. Please review and process applications.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {quickStats.map((stat, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color.split(' ')[1]}`}>
                      <stat.icon className={`w-6 h-6 ${stat.color.split(' ')[0]}`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm font-medium text-success-600">
                      {stat.change} from yesterday
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Community Announcements */}
            <div className="mb-8">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Community Announcements</h2>
                  <span className="text-sm text-gray-500">Recent Updates</span>
                </div>
                <div className="p-6">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center py-8 text-red-600">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      {error}
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Megaphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No announcements at this time</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="border-l-4 border-blue-200 bg-blue-50 p-4 rounded-r-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 mb-1">{announcement.title}</h3>
                              <p className="text-sm text-gray-600 mb-2">{announcement.content}</p>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDate(announcement.publishedAt)}
                                {announcement.author && (
                                  <span className="ml-3">by {announcement.author.name}</span>
                                )}
                              </div>
                            </div>
                            <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                              {announcement.priority.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Access Methods */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {accessMethods.map((method, index) => (
                  <Link
                    key={index}
                    href={method.href}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left group"
                  >
                    <div className={`w-12 h-12 ${method.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <method.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{method.title}</h3>
                    <p className="text-sm text-gray-600">{method.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <span className="text-sm text-gray-500">Last 24 hours</span>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.status === 'success' ? 'bg-success-100' :
                          activity.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                        }`}>
                          {activity.status === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-success-600" />
                          ) : activity.status === 'warning' ? (
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-sm text-gray-600">{activity.details}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{activity.time}</p>
                        <p className="text-xs text-gray-400">{activity.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Community Management Overview */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Community Overview</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Recent Payments</h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">Chen Family - Monthly Dues</span>
                        </div>
                        <span className="text-sm text-green-600 font-medium">Paid</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">Smith Family - Parking</span>
                        </div>
                        <span className="text-sm text-yellow-600 font-medium">Pending</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">Wilson Residence - Facilities</span>
                        </div>
                        <span className="text-sm text-green-600 font-medium">Paid</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Pending Approvals</h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">Johnson Family - Registration</span>
                        </div>
                        <span className="text-sm text-blue-600 font-medium">2 min ago</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">Vehicle Sticker - ABC-123</span>
                        </div>
                        <span className="text-sm text-blue-600 font-medium">1 hour ago</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">Gate Pass - Guest Access</span>
                        </div>
                        <span className="text-sm text-blue-600 font-medium">3 hours ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}