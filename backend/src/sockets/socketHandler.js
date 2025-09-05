const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Store active connections by space
const spaceConnections = new Map();

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details
    const userResult = await query(
      `SELECT u.*, o.name as organization_name 
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return next(new Error('User not found'));
    }

    socket.user = userResult.rows[0];
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
};

// Check if user has access to space
const checkSpaceAccess = async (userId, spaceId) => {
  const result = await query(
    `SELECT sm.role, s.created_by 
     FROM space_members sm
     RIGHT JOIN spaces s ON s.id = sm.space_id AND sm.user_id = $1
     WHERE s.id = $2`,
    [userId, spaceId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const row = result.rows[0];
  return row.role || row.created_by === userId;
};

const socketHandler = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.email} connected`);

    // Join user to their personal room
    socket.join(`user:${socket.user.id}`);

    // Handle joining spaces
    socket.on('join-space', async (spaceId) => {
      try {
        const hasAccess = await checkSpaceAccess(socket.user.id, spaceId);
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to space' });
          return;
        }

        // Join space room
        socket.join(`space:${spaceId}`);
        
        // Track connection
        if (!spaceConnections.has(spaceId)) {
          spaceConnections.set(spaceId, new Set());
        }
        spaceConnections.get(spaceId).add(socket.user.id);

        // Notify others in the space
        socket.to(`space:${spaceId}`).emit('user-joined', {
          userId: socket.user.id,
          name: socket.user.name,
          avatar_url: socket.user.avatar_url
        });

        // Send current online users in space
        const onlineUsers = Array.from(spaceConnections.get(spaceId) || []);
        socket.emit('space-users', { spaceId, onlineUsers });

        console.log(`User ${socket.user.email} joined space ${spaceId}`);
      } catch (error) {
        console.error('Join space error:', error);
        socket.emit('error', { message: 'Failed to join space' });
      }
    });

    // Handle leaving spaces
    socket.on('leave-space', (spaceId) => {
      socket.leave(`space:${spaceId}`);
      
      // Remove from tracking
      if (spaceConnections.has(spaceId)) {
        spaceConnections.get(spaceId).delete(socket.user.id);
        if (spaceConnections.get(spaceId).size === 0) {
          spaceConnections.delete(spaceId);
        }
      }

      // Notify others
      socket.to(`space:${spaceId}`).emit('user-left', {
        userId: socket.user.id,
        name: socket.user.name
      });

      console.log(`User ${socket.user.email} left space ${spaceId}`);
    });

    // Handle task updates
    socket.on('task-update', async (data) => {
      try {
        const { taskId, spaceId, updates } = data;
        
        const hasAccess = await checkSpaceAccess(socket.user.id, spaceId);
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Broadcast to space members
        socket.to(`space:${spaceId}`).emit('task-updated', {
          taskId,
          updates,
          updatedBy: {
            id: socket.user.id,
            name: socket.user.name,
            avatar_url: socket.user.avatar_url
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Task update error:', error);
        socket.emit('error', { message: 'Failed to update task' });
      }
    });

    // Handle task creation
    socket.on('task-created', async (data) => {
      try {
        const { task, spaceId } = data;
        
        const hasAccess = await checkSpaceAccess(socket.user.id, spaceId);
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Broadcast to space members
        socket.to(`space:${spaceId}`).emit('task-created', {
          task,
          createdBy: {
            id: socket.user.id,
            name: socket.user.name,
            avatar_url: socket.user.avatar_url
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Task creation broadcast error:', error);
      }
    });

    // Handle task movement (drag and drop)
    socket.on('task-moved', async (data) => {
      try {
        const { taskId, fromGroupId, toGroupId, spaceId, position } = data;
        
        const hasAccess = await checkSpaceAccess(socket.user.id, spaceId);
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Broadcast to space members
        socket.to(`space:${spaceId}`).emit('task-moved', {
          taskId,
          fromGroupId,
          toGroupId,
          position,
          movedBy: {
            id: socket.user.id,
            name: socket.user.name,
            avatar_url: socket.user.avatar_url
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Task move broadcast error:', error);
      }
    });

    // Handle typing indicators for comments
    socket.on('typing-start', async (data) => {
      try {
        const { taskId, spaceId } = data;
        
        const hasAccess = await checkSpaceAccess(socket.user.id, spaceId);
        if (!hasAccess) return;

        socket.to(`space:${spaceId}`).emit('user-typing', {
          taskId,
          user: {
            id: socket.user.id,
            name: socket.user.name,
            avatar_url: socket.user.avatar_url
          }
        });
      } catch (error) {
        console.error('Typing start error:', error);
      }
    });

    socket.on('typing-stop', async (data) => {
      try {
        const { taskId, spaceId } = data;
        
        const hasAccess = await checkSpaceAccess(socket.user.id, spaceId);
        if (!hasAccess) return;

        socket.to(`space:${spaceId}`).emit('user-stopped-typing', {
          taskId,
          userId: socket.user.id
        });
      } catch (error) {
        console.error('Typing stop error:', error);
      }
    });

    // Handle comments
    socket.on('comment-added', async (data) => {
      try {
        const { comment, taskId, spaceId } = data;
        
        const hasAccess = await checkSpaceAccess(socket.user.id, spaceId);
        if (!hasAccess) return;

        socket.to(`space:${spaceId}`).emit('comment-added', {
          comment: {
            ...comment,
            user_name: socket.user.name,
            user_email: socket.user.email,
            avatar_url: socket.user.avatar_url
          },
          taskId
        });
      } catch (error) {
        console.error('Comment broadcast error:', error);
      }
    });

    // Handle cursor position sharing (for collaborative editing)
    socket.on('cursor-position', async (data) => {
      try {
        const { spaceId, position, element } = data;
        
        const hasAccess = await checkSpaceAccess(socket.user.id, spaceId);
        if (!hasAccess) return;

        socket.to(`space:${spaceId}`).emit('cursor-position', {
          userId: socket.user.id,
          user: {
            name: socket.user.name,
            avatar_url: socket.user.avatar_url
          },
          position,
          element
        });
      } catch (error) {
        console.error('Cursor position error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.email} disconnected`);
      
      // Remove from all space connections
      spaceConnections.forEach((users, spaceId) => {
        if (users.has(socket.user.id)) {
          users.delete(socket.user.id);
          if (users.size === 0) {
            spaceConnections.delete(spaceId);
          }
          
          // Notify others in the space
          socket.to(`space:${spaceId}`).emit('user-left', {
            userId: socket.user.id,
            name: socket.user.name
          });
        }
      });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  return io;
};

module.exports = socketHandler;