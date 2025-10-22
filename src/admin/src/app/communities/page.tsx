'use client'

import { useState, useEffect } from 'react'
import { Building, Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, MapPin, Users, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Community {
  id: string
  name: string
  address: string
  city: string
  state: string
  country: string
  postalCode: string
  totalUnits: number
  occupiedUnits: number
  totalTenants: number
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
  headAdmin?: {
    id: string
    name: string
    email: string
  }
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Mock data
  useEffect(() => {
    const mockCommunities: Community[] = [
      {
        id: '1',
        name: 'Sunny Meadows Community',
        address: '1234 Meadow Lane',
        city: 'San Diego',
        state: 'CA',
        country: 'USA',
        postalCode: '92101',
        totalUnits: 150,
        occupiedUnits: 142,
        totalTenants: 380,
        status: 'active',
        createdAt: '2024-01-15T10:30:00Z',
        headAdmin: {
          id: 'admin-1',
          name: 'Robert Johnson',
          email: 'robert@sunny-meadows.com'
        }
      },
      {
        id: '2',
        name: 'Riverside Apartments',
        address: '567 River Road',
        city: 'Austin',
        state: 'TX',
        country: 'USA',
        postalCode: '78701',
        totalUnits: 200,
        occupiedUnits: 195,
        totalTenants: 450,
        status: 'active',
        createdAt: '2024-02-20T14:15:00Z',
        headAdmin: {
          id: 'admin-2',
          name: 'Maria Garcia',
          email: 'maria@riverside.com'
        }
      },
      {
        id: '3',
        name: 'Oakwood Villas',
        address: '890 Oak Street',
        city: 'Portland',
        state: 'OR',
        country: 'USA',
        postalCode: '97201',
        totalUnits: 80,
        occupiedUnits: 65,
        totalTenants: 180,
        status: 'active',
        createdAt: '2024-03-10T09:45:00Z',
        headAdmin: {
          id: 'admin-3',
          name: 'David Chen',
          email: 'david@oakwood.com'
        }
      },
      {
        id: '4',
        name: 'Mountain View Estates',
        address: '345 Mountain View Dr',
        city: 'Denver',
        state: 'CO',
        country: 'USA',
        postalCode: '80202',
        totalUnits: 120,
        occupiedUnits: 110,
        totalTenants: 320,
        status: 'active',
        createdAt: '2024-04-05T16:20:00Z'
      }
    ]

    setCommunities(mockCommunities)
    setLoading(false)
  }, [])

  const handleDeleteCommunity = async (communityId: string) => {
    if (!confirm('Are you sure you want to delete this community? This action cannot be undone.')) return

    try {
      setCommunities(communities.filter(c => c.id !== communityId))
    } catch (error) {
      console.error('Failed to delete community:', error)
    }
  }

  const handleToggleStatus = async (communityId: string, currentStatus: string) => {
    try {
      setCommunities(communities.map(c =>
        c.id === communityId
          ? { ...c, status: currentStatus === 'active' ? 'inactive' : 'active' as any }
          : c
      ))
    } catch (error) {
      console.error('Failed to toggle community status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'suspended': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getOccupancyRate = (occupied: number, total: number) => {
    return Math.round((occupied / total) * 100)
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Communities</h1>
            <p className="text-gray-600 mt-2">Manage residential communities and their properties</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Community
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search communities..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Communities Grid */}
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
        ) : communities.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No communities found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first community</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Community
            </Button>
          </div>
        ) : (
          communities.map((community) => (
            <div key={community.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{community.name}</h3>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-1" />
                      {community.address}, {community.city}, {community.state}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(community.status)}`}>
                    {community.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Units</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {community.occupiedUnits}/{community.totalUnits}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${getOccupancyRate(community.occupiedUnits, community.totalUnits)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Residents</p>
                    <p className="text-lg font-semibold text-gray-900">{community.totalTenants}</p>
                    <p className="text-xs text-gray-500">Total residents</p>
                  </div>
                </div>

                {community.headAdmin && (
                  <div className="border-t pt-3 mb-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-blue-600">
                          {community.headAdmin.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{community.headAdmin.name}</p>
                        <p className="text-xs text-gray-500">{community.headAdmin.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(community.id, community.status)}
                    >
                      {community.status === 'active' ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteCommunity(community.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Create New Community</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add a new residential community to the platform.
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Street address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="City"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Postal code"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Units</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Number of units"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Country"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Head Admin Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="head.admin@community.com"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  onClick={() => {
                    // Mock community creation
                    const newCommunity: Community = {
                      id: Date.now().toString(),
                      name: 'New Community',
                      address: '123 New Street',
                      city: 'New City',
                      state: 'NY',
                      country: 'USA',
                      postalCode: '10001',
                      totalUnits: 100,
                      occupiedUnits: 0,
                      totalTenants: 0,
                      status: 'active',
                      createdAt: new Date().toISOString()
                    }
                    setCommunities([...communities, newCommunity])
                    setShowCreateModal(false)
                  }}
                  className="ml-3"
                >
                  Create Community
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
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