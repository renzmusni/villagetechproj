import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    expired: 'bg-gray-100 text-gray-800',
    paid: 'bg-green-100 text-green-800',
    unpaid: 'bg-red-100 text-red-800',
    overdue: 'bg-red-100 text-red-800',
  }
  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-800',
    platform_admin: 'bg-indigo-100 text-indigo-800',
    tenant_admin: 'bg-blue-100 text-blue-800',
    admin_head: 'bg-cyan-100 text-cyan-800',
    security_head: 'bg-orange-100 text-orange-800',
    admin_staff: 'bg-teal-100 text-teal-800',
    security_staff: 'bg-yellow-100 text-yellow-800',
    resident: 'bg-gray-100 text-gray-800',
  }
  return colors[role.toLowerCase()] || 'bg-gray-100 text-gray-800'
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function generatePaginationItems(currentPage: number, totalPages: number) {
  const items = []
  const maxVisible = 7

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      items.push(i)
    }
  } else {
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) {
        items.push(i)
      }
      items.push('...')
      items.push(totalPages)
    } else if (currentPage >= totalPages - 3) {
      items.push(1)
      items.push('...')
      for (let i = totalPages - 4; i <= totalPages; i++) {
        items.push(i)
      }
    } else {
      items.push(1)
      items.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        items.push(i)
      }
      items.push('...')
      items.push(totalPages)
    }
  }

  return items
}