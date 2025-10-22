const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { supabase } = require('../database');

class SocketServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? process.env.ALLOWED_ORIGINS?.split(',') || []
          : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:3006', 'http://localhost:3007'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.connectedUsers = new Map(); // userId -> socket.id
    this.userSockets = new Map(); // socket.id -> user info
    this.rooms = new Map(); // roomName -> Set of socket ids

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');

        // Verify user exists in database
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', decoded.id)
          .eq('is_active', true)
          .single();

        if (error || !user) {
          return next(new Error('Invalid user'));
        }

        socket.user = user;
        socket.tenantId = user.tenant_id;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.user.email} (${socket.id})`);

      // Store user connection
      this.connectedUsers.set(socket.user.id, socket.id);
      this.userSockets.set(socket.id, {
        userId: socket.user.id,
        email: socket.user.email,
        role: socket.user.role,
        tenantId: socket.tenantId,
        connectedAt: new Date()
      });

      // Join tenant-specific room
      socket.join(`tenant_${socket.tenantId}`);

      // Join role-specific rooms
      socket.join(`role_${socket.user.role}`);

      // Join user-specific room
      socket.join(`user_${socket.user.id}`);

      // Send welcome message with user's notifications
      this.sendPendingNotifications(socket);

      // Handle joining specific rooms
      socket.on('join-room', (roomName) => {
        if (this.isValidRoom(roomName, socket)) {
          socket.join(roomName);
          this.addToRoom(roomName, socket.id);
          socket.emit('room-joined', { room: roomName });
        }
      });

      // Handle leaving rooms
      socket.on('leave-room', (roomName) => {
        socket.leave(roomName);
        this.removeFromRoom(roomName, socket.id);
        socket.emit('room-left', { room: roomName });
      });

      // Handle marking notifications as read
      socket.on('mark-notification-read', async (notificationId) => {
        try {
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', socket.user.id);

          socket.emit('notification-marked-read', { notificationId });
        } catch (error) {
          console.error('Error marking notification as read:', error);
          socket.emit('error', { message: 'Failed to mark notification as read' });
        }
      });

      // Handle getting notification count
      socket.on('get-notification-count', async () => {
        try {
          const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', socket.user.id)
            .eq('is_read', false);

          if (!error) {
            socket.emit('notification-count', { count: count || 0 });
          }
        } catch (error) {
          console.error('Error getting notification count:', error);
        }
      });

      // Handle location updates (for delivery tracking, etc.)
      socket.on('location-update', (locationData) => {
        // Broadcast to security room if user is security personnel
        if (socket.user.role === 'admin' || socket.user.role === 'staff') {
          this.io.to(`tenant_${socket.tenantId}`).emit('location-update', {
            userId: socket.user.id,
            userName: socket.user.firstName + ' ' + socket.user.lastName,
            location: locationData,
            timestamp: new Date()
          });
        }
      });

      // Handle typing indicators (for future chat features)
      socket.on('typing-start', (data) => {
        socket.to(`tenant_${socket.tenantId}`).emit('user-typing', {
          userId: socket.user.id,
          userName: socket.user.firstName + ' ' + socket.user.lastName,
          room: data.room
        });
      });

      socket.on('typing-stop', (data) => {
        socket.to(`tenant_${socket.tenantId}`).emit('user-stop-typing', {
          userId: socket.user.id,
          room: data.room
        });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 User disconnected: ${socket.user.email} (${socket.id}) - ${reason}`);

        this.connectedUsers.delete(socket.user.id);
        this.userSockets.delete(socket.id);

        // Remove from all rooms
        this.rooms.forEach((sockets, roomName) => {
          this.removeFromRoom(roomName, socket.id);
        });

        // Notify other users about disconnection
        socket.to(`tenant_${socket.tenantId}`).emit('user-disconnected', {
          userId: socket.user.id,
          userName: socket.user.firstName + ' ' + socket.user.lastName
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.user.email}:`, error);
      });
    });
  }

  // Send pending notifications to a user
  async sendPendingNotifications(socket) {
    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', socket.user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && notifications.length > 0) {
        socket.emit('pending-notifications', notifications);
        socket.emit('notification-count', { count: notifications.length });
      }
    } catch (error) {
      console.error('Error fetching pending notifications:', error);
    }
  }

  // Validate if user can join a room
  isValidRoom(roomName, socket) {
    // Allow tenant rooms, role rooms, and user rooms
    if (roomName.startsWith(`tenant_${socket.tenantId}`)) return true;
    if (roomName.startsWith(`role_${socket.user.role}`)) return true;
    if (roomName.startsWith(`user_${socket.user.id}`)) return true;

    // Allow specific functional rooms
    const allowedRooms = [
      'security_incidents',
      'deliveries',
      'announcements',
      'payments',
      'emergency'
    ];

    return allowedRooms.includes(roomName);
  }

  // Room management
  addToRoom(roomName, socketId) {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName).add(socketId);
  }

  removeFromRoom(roomName, socketId) {
    if (this.rooms.has(roomName)) {
      this.rooms.get(roomName).delete(socketId);
      if (this.rooms.get(roomName).size === 0) {
        this.rooms.delete(roomName);
      }
    }
  }

  // Notification methods
  async sendNotificationToUser(userId, notification) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
    }

    // Store in database
    try {
      await supabase.from('notifications').insert([{
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        is_read: false,
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }

  async sendNotificationToRole(tenantId, role, notification) {
    this.io.to(`tenant_${tenantId}`).to(`role_${role}`).emit('notification', notification);

    // Store in database for all users with that role
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', role)
        .eq('is_active', true);

      if (users) {
        const notifications = users.map(user => ({
          user_id: user.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
          is_read: false,
          created_at: new Date().toISOString()
        }));

        await supabase.from('notifications').insert(notifications);
      }
    } catch (error) {
      console.error('Error storing role notifications:', error);
    }
  }

  async sendNotificationToTenant(tenantId, notification, excludeRoles = []) {
    this.io.to(`tenant_${tenantId}`).emit('notification', notification);

    // Store in database for all users in tenant
    try {
      let query = supabase
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (excludeRoles.length > 0) {
        query = query.not('role', 'in', excludeRoles);
      }

      const { data: users } = await query;

      if (users) {
        const notifications = users.map(user => ({
          user_id: user.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
          is_read: false,
          created_at: new Date().toISOString()
        }));

        await supabase.from('notifications').insert(notifications);
      }
    } catch (error) {
      console.error('Error storing tenant notifications:', error);
    }
  }

  // Specialized notification methods
  async sendSecurityIncidentAlert(tenantId, incident) {
    const notification = {
      type: 'security_incident',
      title: `Security Incident: ${incident.title}`,
      message: `A ${incident.severity_level} severity incident has been reported at ${incident.location}`,
      data: {
        incident_id: incident.id,
        severity: incident.severity_level,
        location: incident.location,
        type: incident.incident_type
      },
      priority: incident.severity_level === 'critical' ? 'high' : 'normal'
    };

    // Send to all security personnel and admins
    await this.sendNotificationToRole(tenantId, 'admin', notification);
    await this.sendNotificationToRole(tenantId, 'staff', notification);

    // Also broadcast to security room for real-time updates
    this.io.to(`tenant_${tenantId}`).to('security_incidents').emit('security-incident-update', incident);
  }

  async sendDeliveryNotification(tenantId, delivery, type) {
    const notification = {
      type: 'delivery',
      title: `Delivery ${type}`,
      message: `Your package from ${delivery.courier_service} has ${type}`,
      data: {
        delivery_id: delivery.id,
        courier: delivery.courier_service,
        tracking: delivery.tracking_number
      }
    };

    if (delivery.household_id) {
      // Send to household members
      const { data: residents } = await supabase
        .from('users')
        .select('id')
        .eq('household_id', delivery.household_id)
        .eq('is_active', true);

      if (residents) {
        for (const resident of residents) {
          await this.sendNotificationToUser(resident.id, notification);
        }
      }
    }

    // Broadcast to delivery room
    this.io.to(`tenant_${tenantId}`).to('deliveries').emit('delivery-update', {
      delivery,
      type
    });
  }

  async sendAnnouncement(tenantId, announcement) {
    const notification = {
      type: 'announcement',
      title: announcement.title,
      message: announcement.message,
      data: {
        announcement_id: announcement.id,
        priority: announcement.priority || 'normal'
      }
    };

    await this.sendNotificationToTenant(tenantId, notification);

    // Broadcast to announcement room
    this.io.to(`tenant_${tenantId}`).to('announcements').emit('announcement-update', announcement);
  }

  async sendEmergencyAlert(tenantId, alert) {
    const notification = {
      type: 'emergency',
      title: `🚨 ${alert.title}`,
      message: alert.message,
      data: {
        alert_id: alert.id,
        severity: alert.severity,
        type: alert.type
      },
      priority: 'critical'
    };

    // Send to all users in tenant
    await this.sendNotificationToTenant(tenantId, notification);

    // Also broadcast to emergency room with highest priority
    this.io.to(`tenant_${tenantId}`).emit('emergency-alert', alert);
  }

  // Get connection statistics
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalConnections: this.userSockets.size,
      rooms: Array.from(this.rooms.entries()).map(([name, sockets]) => ({
        name,
        users: sockets.size
      }))
    };
  }

  // Get connected users info
  getConnectedUsers() {
    return Array.from(this.userSockets.values());
  }

  // Send custom event
  sendCustomEvent(event, data, target = null) {
    if (target) {
      this.io.to(target).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }
}

module.exports = SocketServer;