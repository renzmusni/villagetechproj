'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, Users, Settings, Crown, Shield, Home, Car } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Tenant {
  id: string
  name: string
  domain: string
  status: 'active' | 'inactive' | 'suspended'
  totalUsers: number
  totalHouseholds: number
  createdAt: string
  subscriptionType: 'basic' | 'premium' | 'enterprise'
  maxUsers: number
  maxHouseholds: number
  adminContact: {
    name: string
    email: string
    phone: string
  }
  communityId?: string
  communityName?: string
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: string
  isActive: boolean
  householdId?: string
  householdName?: string
  createdAt: string
}

const ROLES = [
  { value: 'admin-head', label: 'Admin Head', description: 'Residential community admin, manages household residents', icon: Crown },
  { value: 'admin-officer', label: 'Admin Officer', description: 'Residential community admin, manages household residents', icon: Users },
  { value: 'household-head', label: 'Household Head', description: 'Resident admin, manages household users', icon: Home },
  { value: 'household-member', label: 'Household Member', description: 'Registered resident under a household', icon: Home },
  { value: 'household-beneficial', label: 'Household Beneficial', description: 'Non-resident but associated with a household, issued a vehicle pass', icon: Car },
  { value: 'security-head', label: 'Security Head', description: 'Admin of security group', icon: Shield },
  { value: 'security-officer', label: 'Security Officer', description: 'Member of security group', icon: Shield },
]

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState<'tenants' | 'users'>('tenants')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)

  // Mock data
  useEffect(() => {
    const mockTenants: Tenant[] = [
      {
        id: '1',
        name: 'Sunny Meadows Community',
        domain: 'sunny-meadows',
        status: 'active',
        totalUsers: 380,
        totalHouseholds: 150,
        createdAt: '2024-01-15T10:30:00Z',
        subscriptionType: 'premium',
        maxUsers: 500,
        maxHouseholds: 200,
        adminContact: {
          name: 'Robert Johnson',
          email: 'robert@sunny-meadows.com',
          phone: '+1 (619) 123-4567'
        },
        communityId: '1',
        communityName: 'Sunny Meadows Community'
      },
      {
        id: '2',
        name: 'Riverside Apartments',
        domain: 'riverside',
        status: 'active',
        totalUsers: 450,
        totalHouseholds: 200,
        createdAt: '2024-02-20T14:15:00Z',
        subscriptionType: 'enterprise',
        maxUsers: 1000,
        maxHouseholds: 300,
        adminContact: {
          name: 'Maria Garcia',
          email: 'maria@riverside.com',
          phone: '+1 (512) 987-6543'
        },
        communityId: '2',
        communityName: 'Riverside Apartments'
      }
    ]

    const mockUsers: User[] = [
      {
        id: '1',
        email: 'robert@sunny-meadows.com',
        firstName: 'Robert',
        lastName: 'Johnson',
        phone: '+1 (619) 123-4567',
        role: 'admin-head',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        email: 'maria@riverside.com',
        firstName: 'Maria',
        lastName: 'Garcia',
        phone: '+1 (512) 987-6543',
        role: 'admin-head',
        isActive: true,
        createdAt: '2024-02-20T14:15:00Z'
      },
      {
        id: '3',
        email: 'john.doe@sunny-meadows.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1 (619) 234-5678',
        role: 'household-head',
        isActive: true,
        householdId: '1',
        householdName: 'Household 1A',
        createdAt: '2024-01-20T09:00:00Z'
      }
    ]

    setTenants(mockTenants)
    setUsers(mockUsers)
    setLoading(false)
  }, [])

  const handleCreateUser = (userData: any) => {
    const newUser: User = {
      id: Date.now().toString(),
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      role: userData.role,
      isActive: true,
      createdAt: new Date().toISOString()
    }

    setUsers([...users, newUser])
    setShowCreateUserModal(false)
  }

  const handleCreateTenant = (tenantData: any) => {
    const newTenant: Tenant = {
      id: Date.now().toString(),
      name: tenantData.name,
      domain: tenantData.domain,
      status: 'active',
      totalUsers: 0,
      totalHouseholds: 0,
      createdAt: new Date().toISOString(),
      subscriptionType: 'basic',
      maxUsers: tenantData.maxUsers || 100,
      maxHouseholds: tenantData.maxHouseholds || 50,
      adminContact: {
        name: tenantData.adminName,
        email: tenantData.adminEmail,
        phone: tenantData.adminPhone
      }
    }

    setTenants([...tenants, newTenant])
    setShowCreateTenantModal(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'suspended': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin-head': return 'bg-purple-100 text-purple-800'
      case 'admin-officer': return 'bg-blue-100 text-blue-800'
      case 'household-head': return 'bg-green-100 text-green-800'
      case 'household-member': return 'bg-gray-100 text-gray-800'
      case 'household-beneficial': return 'bg-orange-100 text-orange-800'
      case 'security-head': return 'bg-red-100 text-red-800'
      case 'security-officer': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tenants & Users</h1>
            <p className="text-gray-600 mt-2">Manage residential communities and their users</p>
          </div>
          <div className="flex space-x-3">
            {activeTab === 'tenants' ? (
              <Button onClick={() => setShowCreateTenantModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Tenant
              </Button>
            ) : (
              <Button onClick={() => setShowCreateUserModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('tenants')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tenants'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tenants ({tenants.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Users ({users.length})
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'tenants' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                </div>
              </div>
            ))
          ) : tenants.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants found</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first tenant</p>
              <Button onClick={() => setShowCreateTenantModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Tenant
              </Button>
            </div>
          ) : (
            tenants.map((tenant) => (
              <div key={tenant.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{tenant.name}</h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className="w-4 h-4 mr-1" />
                        {tenant.domain}.hoa-platform.com
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tenant.status)}`}>
                      {tenant.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Users</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {tenant.totalUsers}/{tenant.maxUsers}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Households</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {tenant.totalHouseholds}/{tenant.maxHouseholds}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-3 mb-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-blue-600">
                          {tenant.adminContact.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tenant.adminContact.name}</p>
                        <p className="text-xs text-gray-500">{tenant.adminContact.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4 mr-1" />
                        Settings
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">All Roles</option>
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Household
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {user.firstName[0]}{user.lastName[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {ROLES.find(r => r.value === user.role)?.label || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.householdName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Tenant Modal */}
      {showCreateTenantModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Create New Tenant</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add a new tenant community to the platform.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Community Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter community name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                    <div className="flex">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="community-name"
                      />
                      <span className="px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 rounded-r-lg">
                        .hoa-platform.com
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="100"
                        defaultValue="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Households</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="50"
                        defaultValue="50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Contact</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                      placeholder="Admin name"
                    />
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                      placeholder="admin@community.com"
                    />
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  onClick={() => handleCreateTenant({
                    name: 'New Community',
                    domain: 'new-community',
                    maxUsers: 100,
                    maxHouseholds: 50,
                    adminName: 'Admin Name',
                    adminEmail: 'admin@community.com',
                    adminPhone: '+1 (555) 123-4567'
                  })}
                  className="ml-3"
                >
                  Create Tenant
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateTenantModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add a new user to the platform with specific role.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Tenant</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">Select a tenant</option>
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="user@community.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">Select a role</option>
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800 font-medium mb-1">Role Description:</p>
                    <p className="text-xs text-blue-700">
                      Select a role to see its description
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  onClick={() => handleCreateUser({
                    email: 'user@community.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '+1 (555) 123-4567',
                    role: 'household-member'
                  })}
                  className="ml-3"
                >
                  Create User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateUserModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}