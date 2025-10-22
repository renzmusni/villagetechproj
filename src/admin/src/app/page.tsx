'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, Car, CreditCard, Bell, Megaphone, Shield, Menu, X, Building, Home } from 'lucide-react'

export default function Dashboard() {
  // Check authentication on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuthenticated = localStorage.getItem('isAuthenticated')
      if (!isAuthenticated) {
        window.location.href = '/login'
      }
    }
  }, [])

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('userRole')
      window.location.href = '/login'
    }
  }

  const handleNavigation = (label: string) => {
    if (typeof window !== 'undefined') {
      switch (label) {
        case 'Dashboard':
          window.location.href = '/'
          break
        case 'Communities':
          window.location.href = '/communities'
          break
        case 'Tenants':
          window.location.href = '/tenants'
          break
        case 'Announcements':
          window.location.href = '/announcements'
          break
        default:
          console.log(`${label} navigation not implemented yet`)
      }
    }
  }

  // Get user info safely
  const userEmail = typeof window !== 'undefined'
    ? localStorage.getItem('userEmail') || 'Super Admin'
    : 'Super Admin'
  const userRole = typeof window !== 'undefined'
    ? localStorage.getItem('userRole') || 'superadmin'
    : 'superadmin'

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menuItems = [
    { icon: Building2, label: 'Dashboard', active: true },
    { icon: Building, label: 'Communities', active: false },
    { icon: Building2, label: 'Tenants', active: false },
    { icon: Users, label: 'Users', active: false },
    { icon: Building2, label: 'Households', active: false },
    { icon: Car, label: 'Vehicles', active: false },
    { icon: Shield, label: 'Gate Passes', active: false },
    { icon: Users, label: 'Guests', active: false },
    { icon: CreditCard, label: 'Payments', active: false },
    { icon: Megaphone, label: 'Announcements', active: false },
    { icon: Bell, label: 'Notifications', active: false },
  ]

  const stats = [
    { label: 'Total Communities', value: '4', change: '+1', icon: Building },
    { label: 'Active Tenants', value: '4', change: '+1', icon: Home },
    { label: 'Total Users', value: '830', change: '+125', icon: Users },
    { label: 'Total Households', value: '350', change: '+28', icon: Building2 },
  ]

  const recentActivity = [
    { user: 'Super Admin', action: 'Created Sunny Meadows Community', time: '2 hours ago' },
    { user: 'Super Admin', action: 'Added tenant: Riverside Apartments', time: '3 hours ago' },
    { user: 'Maria Garcia', action: 'Added Admin Head role to 5 users', time: '5 hours ago' },
    { user: 'Robert Johnson', action: 'Updated community settings', time: '6 hours ago' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 bg-primary-600 text-white">
          <h1 className="text-xl font-semibold">HOA Admin</h1>
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
              <button
                key={index}
                onClick={() => handleNavigation(item.label)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  item.active
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>
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
                Welcome back, <span className="font-semibold text-gray-900">{userEmail.split('@')[0]}</span>
                <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                  Super Admin
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                title="Logout"
              >
                Logout
              </button>
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                SA
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">Welcome to your HOA Community Management dashboard</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className={`text-sm font-medium ${
                      stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change} from last month
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Activity */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                          <p className="text-sm text-gray-600">{activity.action}</p>
                        </div>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.href = '/communities'}
                      className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Create Community
                    </button>
                    <button
                      onClick={() => window.location.href = '/tenants'}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Add Tenant
                    </button>
                    <button
                      onClick={() => window.location.href = '/tenants'}
                      className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                      Add New User
                    </button>
                    <button className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                      Create Announcement
                    </button>
                    <button className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                      Generate Report
                    </button>
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