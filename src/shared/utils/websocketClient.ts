import { io, Socket } from 'socket.io-client'
import { AppError, ErrorLogger, classifyError } from './errorHandler'

export interface NotificationData {
  id: string
  type: string
  title: string
  message: string
  data?: any
  is_read: boolean
  created_at: string
  priority?: 'low' | 'normal' | 'high' | 'critical'
}

export interface SecurityIncidentUpdate {
  id: string
  title: string
  description: string
  severity_level: 'low' | 'medium' | 'high' | 'critical'
  location: string
  status: 'open' | 'in_progress' | 'resolved'
  incident_type: string
  reported_by_user?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  created_at: string
}

export interface DeliveryUpdate {
  id: string
  recipient_name: string
  courier_service: string
  tracking_number?: string
  status: 'pending' | 'arrived' | 'delivered'
  household_id?: string
  type: 'created' | 'arrived' | 'delivered' | 'notified'
}

export interface AnnouncementUpdate {
  id: string
  title: string
  message: string
  priority?: 'low' | 'normal' | 'high'
  created_at: string
  created_by: string
}

export interface EmergencyAlert {
  id: string
  title: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: string
  created_at: string
}

export interface UserStatus {
  userId: string
  userName: string
  status: 'online' | 'offline'
  lastSeen?: string
}

export interface LocationUpdate {
  userId: string
  userName: string
  location: {
    latitude: number
    longitude: number
    address?: string
  }
  timestamp: string
}

export interface TypingIndicator {
  userId: string
  userName: string
  room: string
}

class WebSocketClient {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private reconnectTimeoutId: NodeJS.Timeout | null = null
  private listeners = new Map<string, Set<Function>>()
  private notificationListeners = new Set<Function>()
  private securityIncidentListeners = new Set<Function>()
  private deliveryListeners = new Set<Function>()
  private announcementListeners = new Set<Function>()
  private emergencyListeners = new Set<Function>()
  private connectionStatusListeners = new Set<(connected: boolean) => void>()
  private userStatusListeners = new Set<Function>()
  private locationUpdateListeners = new Set<Function>()

  constructor() {
    this.setupGlobalErrorHandling()
  }

  private setupGlobalErrorHandling() {
    if (typeof window !== 'undefined') {
      // Handle page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.disconnect()
        } else {
          this.connect()
        }
      })

      // Handle page unload
      window.addEventListener('beforeunload', () => {
        this.disconnect()
      })
    }
  }

  async connect(token?: string): Promise<boolean> {
    if (this.socket?.connected) {
      return true
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkConnection = () => {
          if (this.socket?.connected) {
            resolve(true)
          } else if (!this.isConnecting) {
            resolve(false)
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        checkConnection()
      })
    }

    try {
      this.isConnecting = true

      const authToken = token || this.getStoredToken()
      if (!authToken) {
        throw new Error('Authentication token required')
      }

      const serverUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4003'

      this.socket = io(serverUrl, {
        auth: {
          token: authToken
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: false // We'll handle reconnection ourselves
      })

      this.setupEventHandlers()

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.isConnecting = false
          reject(new AppError('Connection timeout', 'NETWORK'))
        }, 10000)

        this.socket!.once('connect', () => {
          clearTimeout(timeout)
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.notifyConnectionStatus(true)
          console.log('✅ WebSocket connected')
          resolve(true)
        })

        this.socket!.once('connect_error', (error) => {
          clearTimeout(timeout)
          this.isConnecting = false
          this.notifyConnectionStatus(false)
          const appError = classifyError(error)
          ErrorLogger.log(appError, { component: 'WebSocket', action: 'Connection' })
          reject(appError)
        })
      })

    } catch (error) {
      this.isConnecting = false
      const appError = classifyError(error)
      ErrorLogger.log(appError, { component: 'WebSocket', action: 'Connection' })
      throw appError
    }
  }

  disconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.notifyConnectionStatus(false)
      console.log('🔌 WebSocket disconnected')
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log(`🔌 WebSocket disconnected: ${reason}`)
      this.notifyConnectionStatus(false)
      this.handleReconnection()
    })

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error)
      const appError = classifyError(error)
      ErrorLogger.log(appError, { component: 'WebSocket', action: 'Error' })
    })

    // Notification events
    this.socket.on('notification', (notification: NotificationData) => {
      this.handleNotification(notification)
    })

    this.socket.on('pending-notifications', (notifications: NotificationData[]) => {
      notifications.forEach(notification => this.handleNotification(notification))
    })

    this.socket.on('notification-count', ({ count }: { count: number }) => {
      this.emit('notification-count', count)
    })

    this.socket.on('notification-marked-read', ({ notificationId }: { notificationId: string }) => {
      this.emit('notification-marked-read', notificationId)
    })

    // Security incident events
    this.socket.on('security-incident-update', (incident: SecurityIncidentUpdate) => {
      this.handleSecurityIncident(incident)
    })

    // Delivery events
    this.socket.on('delivery-update', (update: DeliveryUpdate) => {
      this.handleDeliveryUpdate(update)
    })

    // Announcement events
    this.socket.on('announcement-update', (announcement: AnnouncementUpdate) => {
      this.handleAnnouncement(announcement)
    })

    // Emergency events
    this.socket.on('emergency-alert', (alert: EmergencyAlert) => {
      this.handleEmergencyAlert(alert)
    })

    // User status events
    this.socket.on('user-connected', (user: UserStatus) => {
      this.handleUserStatus({ ...user, status: 'online' })
    })

    this.socket.on('user-disconnected', (user: UserStatus) => {
      this.handleUserStatus({ ...user, status: 'offline' })
    })

    // Location events
    this.socket.on('location-update', (location: LocationUpdate) => {
      this.handleLocationUpdate(location)
    })

    // Typing events
    this.socket.on('user-typing', (typing: TypingIndicator) => {
      this.emit('user-typing', typing)
    })

    this.socket.on('user-stop-typing', (typing: TypingIndicator) => {
      this.emit('user-stop-typing', typing)
    })

    // Room events
    this.socket.on('room-joined', ({ room }: { room: string }) => {
      console.log(`📝 Joined room: ${room}`)
      this.emit('room-joined', room)
    })

    this.socket.on('room-left', ({ room }: { room: string }) => {
      console.log(`📝 Left room: ${room}`)
      this.emit('room-left', room)
    })
  }

  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)

    this.reconnectTimeoutId = setTimeout(async () => {
      try {
        await this.connect()
      } catch (error) {
        console.error('❌ Reconnection failed:', error)
      }
    }, delay)
  }

  private handleNotification(notification: NotificationData) {
    // Show browser notification if permission granted
    this.showBrowserNotification(notification)

    // Notify listeners
    this.notificationListeners.forEach(listener => {
      try {
        listener(notification)
      } catch (error) {
        console.error('Error in notification listener:', error)
      }
    })

    // Emit general event
    this.emit('notification', notification)
  }

  private handleSecurityIncident(incident: SecurityIncidentUpdate) {
    // Show browser notification for high severity incidents
    if (incident.severity_level === 'critical' || incident.severity_level === 'high') {
      this.showBrowserNotification({
        id: incident.id,
        type: 'security_incident',
        title: `🚨 Security Incident: ${incident.title}`,
        message: `A ${incident.severity_level} severity incident at ${incident.location}`,
        data: incident,
        is_read: false,
        created_at: incident.created_at,
        priority: incident.severity_level === 'critical' ? 'critical' : 'high'
      })
    }

    this.securityIncidentListeners.forEach(listener => {
      try {
        listener(incident)
      } catch (error) {
        console.error('Error in security incident listener:', error)
      }
    })

    this.emit('security-incident-update', incident)
  }

  private handleDeliveryUpdate(update: DeliveryUpdate) {
    this.deliveryListeners.forEach(listener => {
      try {
        listener(update)
      } catch (error) {
        console.error('Error in delivery listener:', error)
      }
    })

    this.emit('delivery-update', update)
  }

  private handleAnnouncement(announcement: AnnouncementUpdate) {
    this.announcementListeners.forEach(listener => {
      try {
        listener(announcement)
      } catch (error) {
        console.error('Error in announcement listener:', error)
      }
    })

    this.emit('announcement-update', announcement)
  }

  private handleEmergencyAlert(alert: EmergencyAlert) {
    // Always show browser notification for emergency alerts
    this.showBrowserNotification({
      id: alert.id,
      type: 'emergency',
      title: `🚨 ${alert.title}`,
      message: alert.message,
      data: alert,
      is_read: false,
      created_at: alert.created_at,
      priority: 'critical'
    })

    this.emergencyListeners.forEach(listener => {
      try {
        listener(alert)
      } catch (error) {
        console.error('Error in emergency listener:', error)
      }
    })

    this.emit('emergency-alert', alert)
  }

  private handleUserStatus(user: UserStatus) {
    this.userStatusListeners.forEach(listener => {
      try {
        listener(user)
      } catch (error) {
        console.error('Error in user status listener:', error)
      }
    })

    this.emit('user-status', user)
  }

  private handleLocationUpdate(location: LocationUpdate) {
    this.locationUpdateListeners.forEach(listener => {
      try {
        listener(location)
      } catch (error) {
        console.error('Error in location update listener:', error)
      }
    })

    this.emit('location-update', location)
  }

  private showBrowserNotification(notification: NotificationData) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    if (Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'critical'
      })

      browserNotification.onclick = () => {
        window.focus()
        browserNotification.close()
        this.emit('notification-clicked', notification)
      }

      // Auto-close non-critical notifications
      if (notification.priority !== 'critical') {
        setTimeout(() => browserNotification.close(), 5000)
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission()
    }
  }

  private notifyConnectionStatus(connected: boolean) {
    this.connectionStatusListeners.forEach(listener => {
      try {
        listener(connected)
      } catch (error) {
        console.error('Error in connection status listener:', error)
      }
    })
  }

  private emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error(`Error in ${event} listener:`, error)
      }
    })
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('accessToken')
  }

  // Public API methods
  public isConnected(): boolean {
    return this.socket?.connected || false
  }

  public async joinRoom(roomName: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new AppError('Not connected to server', 'NETWORK')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new AppError('Room join timeout', 'NETWORK'))
      }, 5000)

      this.socket!.emit('join-room', roomName)

      const onRoomJoined = (room: string) => {
        if (room === roomName) {
          clearTimeout(timeout)
          this.socket!.off('room-joined', onRoomJoined)
          resolve()
        }
      }

      this.socket!.on('room-joined', onRoomJoined)
    })
  }

  public async leaveRoom(roomName: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new AppError('Not connected to server', 'NETWORK')
    }

    this.socket.emit('leave-room', roomName)
  }

  public async markNotificationRead(notificationId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new AppError('Not connected to server', 'NETWORK')
    }

    this.socket.emit('mark-notification-read', notificationId)
  }

  public async getNotificationCount(): Promise<void> {
    if (!this.socket?.connected) {
      throw new AppError('Not connected to server', 'NETWORK')
    }

    this.socket.emit('get-notification-count')
  }

  public sendLocationUpdate(location: { latitude: number; longitude: number; address?: string }): void {
    if (!this.socket?.connected) {
      return
    }

    this.socket.emit('location-update', location)
  }

  public startTyping(room: string): void {
    if (!this.socket?.connected) {
      return
    }

    this.socket.emit('typing-start', { room })
  }

  public stopTyping(room: string): void {
    if (!this.socket?.connected) {
      return
    }

    this.socket.emit('typing-stop', { room })
  }

  // Event listeners
  public onNotification(listener: (notification: NotificationData) => void): () => void {
    this.notificationListeners.add(listener)
    return () => this.notificationListeners.delete(listener)
  }

  public onSecurityIncident(listener: (incident: SecurityIncidentUpdate) => void): () => void {
    this.securityIncidentListeners.add(listener)
    return () => this.securityIncidentListeners.delete(listener)
  }

  public onDeliveryUpdate(listener: (update: DeliveryUpdate) => void): () => void {
    this.deliveryListeners.add(listener)
    return () => this.deliveryListeners.delete(listener)
  }

  public onAnnouncement(listener: (announcement: AnnouncementUpdate) => void): () => void {
    this.announcementListeners.add(listener)
    return () => this.announcementListeners.delete(listener)
  }

  public onEmergencyAlert(listener: (alert: EmergencyAlert) => void): () => void {
    this.emergencyListeners.add(listener)
    return () => this.emergencyListeners.delete(listener)
  }

  public onConnectionStatus(listener: (connected: boolean) => void): () => void {
    this.connectionStatusListeners.add(listener)
    return () => this.connectionStatusListeners.delete(listener)
  }

  public onUserStatus(listener: (user: UserStatus) => void): () => void {
    this.userStatusListeners.add(listener)
    return () => this.userStatusListeners.delete(listener)
  }

  public onLocationUpdate(listener: (location: LocationUpdate) => void): () => void {
    this.locationUpdateListeners.add(listener)
    return () => this.locationUpdateListeners.delete(listener)
  }

  public on(event: string, listener: (data?: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
    return () => this.listeners.get(event)?.delete(listener)
  }

  // Cleanup
  public destroy() {
    this.disconnect()
    this.listeners.clear()
    this.notificationListeners.clear()
    this.securityIncidentListeners.clear()
    this.deliveryListeners.clear()
    this.announcementListeners.clear()
    this.emergencyListeners.clear()
    this.connectionStatusListeners.clear()
    this.userStatusListeners.clear()
    this.locationUpdateListeners.clear()
  }
}

// Singleton instance
export const websocketClient = new WebSocketClient()

export default websocketClient