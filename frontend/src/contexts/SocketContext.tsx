import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'

import { useAuth } from './AuthContext'
import { getAuthToken } from '@/lib/api'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinSpace: (spaceId: string) => void
  leaveSpace: (spaceId: string) => void
  emitTaskUpdate: (taskId: string, spaceId: string, updates: any) => void
  emitTaskCreated: (task: any, spaceId: string) => void
  emitTaskMoved: (taskId: string, fromGroupId: string, toGroupId: string, spaceId: string, position?: number) => void
  onlineUsers: Set<string>
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
        setOnlineUsers(new Set())
      }
      return
    }

    const token = getAuthToken()
    if (!token) return

    // Create socket connection
    const newSocket = io({
      auth: {
        token,
      },
      autoConnect: true,
    })

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
      toast.success('Real-time connection established', { id: 'socket-connected' })
    })

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setIsConnected(false)
      if (reason !== 'io client disconnect') {
        toast.error('Real-time connection lost', { id: 'socket-disconnected' })
      }
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
      toast.error('Failed to establish real-time connection')
    })

    // Space-related events
    newSocket.on('user-joined', (data) => {
      console.log('User joined space:', data)
      setOnlineUsers(prev => new Set([...prev, data.userId]))
      toast(`${data.name} joined the space`, {
        icon: '👋',
        duration: 3000,
      })
    })

    newSocket.on('user-left', (data) => {
      console.log('User left space:', data)
      setOnlineUsers(prev => {
        const updated = new Set(prev)
        updated.delete(data.userId)
        return updated
      })
    })

    newSocket.on('space-users', (data) => {
      console.log('Space users:', data)
      setOnlineUsers(new Set(data.onlineUsers))
    })

    // Task-related events
    newSocket.on('task-updated', (data) => {
      console.log('Task updated:', data)
      toast.success(`Task updated by ${data.updatedBy.name}`, {
        duration: 3000,
      })
      // Emit custom event for components to listen to
      window.dispatchEvent(new CustomEvent('task-updated', { detail: data }))
    })

    newSocket.on('task-created', (data) => {
      console.log('Task created:', data)
      toast.success(`New task created by ${data.createdBy.name}`, {
        duration: 3000,
      })
      // Emit custom event for components to listen to
      window.dispatchEvent(new CustomEvent('task-created', { detail: data }))
    })

    newSocket.on('task-moved', (data) => {
      console.log('Task moved:', data)
      // Emit custom event for components to listen to
      window.dispatchEvent(new CustomEvent('task-moved', { detail: data }))
    })

    // Comment events
    newSocket.on('comment-added', (data) => {
      console.log('Comment added:', data)
      toast(`${data.comment.user_name} commented on a task`, {
        icon: '💬',
        duration: 3000,
      })
      window.dispatchEvent(new CustomEvent('comment-added', { detail: data }))
    })

    // Typing events
    newSocket.on('user-typing', (data) => {
      window.dispatchEvent(new CustomEvent('user-typing', { detail: data }))
    })

    newSocket.on('user-stopped-typing', (data) => {
      window.dispatchEvent(new CustomEvent('user-stopped-typing', { detail: data }))
    })

    // Cursor position events for collaborative features
    newSocket.on('cursor-position', (data) => {
      window.dispatchEvent(new CustomEvent('cursor-position', { detail: data }))
    })

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error)
      toast.error(error.message || 'Real-time error occurred')
    })

    // Ping/pong for connection health
    newSocket.on('pong', () => {
      // Connection is healthy
    })

    setSocket(newSocket)

    // Cleanup on unmount
    return () => {
      newSocket.disconnect()
      setSocket(null)
      setIsConnected(false)
      setOnlineUsers(new Set())
    }
  }, [isAuthenticated, user])

  // Keep connection alive with ping
  useEffect(() => {
    if (!socket || !isConnected) return

    const pingInterval = setInterval(() => {
      socket.emit('ping')
    }, 30000) // Ping every 30 seconds

    return () => clearInterval(pingInterval)
  }, [socket, isConnected])

  const joinSpace = (spaceId: string) => {
    if (socket && isConnected) {
      socket.emit('join-space', spaceId)
    }
  }

  const leaveSpace = (spaceId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-space', spaceId)
    }
  }

  const emitTaskUpdate = (taskId: string, spaceId: string, updates: any) => {
    if (socket && isConnected) {
      socket.emit('task-update', { taskId, spaceId, updates })
    }
  }

  const emitTaskCreated = (task: any, spaceId: string) => {
    if (socket && isConnected) {
      socket.emit('task-created', { task, spaceId })
    }
  }

  const emitTaskMoved = (
    taskId: string,
    fromGroupId: string,
    toGroupId: string,
    spaceId: string,
    position?: number
  ) => {
    if (socket && isConnected) {
      socket.emit('task-moved', {
        taskId,
        fromGroupId,
        toGroupId,
        spaceId,
        position,
      })
    }
  }

  const value: SocketContextType = {
    socket,
    isConnected,
    joinSpace,
    leaveSpace,
    emitTaskUpdate,
    emitTaskCreated,
    emitTaskMoved,
    onlineUsers,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export default SocketContext