import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObject = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(dateObject)
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const dateObject = typeof date === 'string' ? new Date(date) : date
  const diffInSeconds = Math.floor((now.getTime() - dateObject.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`
  }

  return formatDate(dateObject)
}

/**
 * Format a number with proper separators
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-US', options).format(value)
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

/**
 * Convert string to title case
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  if (cleaned.length === 10) {
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`
    }
  }
  
  return phoneNumber
}

/**
 * Format currency
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  decimals = 1,
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

/**
 * Water monitoring specific formatters
 */

/**
 * Format water quality measurements
 */
export function formatWaterQuality(value: number, unit: string): string {
  const formattedValue = formatNumber(value, { maximumFractionDigits: 2 })
  return `${formattedValue} ${unit}`
}

/**
 * Format flow rate
 */
export function formatFlowRate(value: number): string {
  return formatWaterQuality(value, 'L/min')
}

/**
 * Format temperature
 */
export function formatTemperature(value: number): string {
  return formatWaterQuality(value, '°C')
}

/**
 * Format pH level
 */
export function formatPH(value: number): string {
  return formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

/**
 * Format pressure
 */
export function formatPressure(value: number): string {
  return formatWaterQuality(value, 'PSI')
}

/**
 * Format turbidity
 */
export function formatTurbidity(value: number): string {
  return formatWaterQuality(value, 'NTU')
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'online':
    case 'active':
    case 'good':
      return 'text-green-600 bg-green-100'
    case 'warning':
    case 'caution':
      return 'text-yellow-600 bg-yellow-100'
    case 'offline':
    case 'error':
    case 'critical':
      return 'text-red-600 bg-red-100'
    case 'inactive':
    case 'suspended':
      return 'text-gray-600 bg-gray-100'
    default:
      return 'text-blue-600 bg-blue-100'
  }
}