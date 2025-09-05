import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/contexts/SocketContext'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const { isConnected } = useSocket()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gradient">
              Project Manager
            </h1>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <span className="text-sm text-muted-foreground">
                  Welcome, {user.name}
                </span>
                <button
                  onClick={logout}
                  className="btn-ghost px-3 py-2 rounded-md text-sm"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className="flex">
        <nav className="w-64 bg-card border-r border-border min-h-screen p-4">
          <div className="space-y-2">
            <a href="/dashboard" className="block px-3 py-2 rounded-md text-sm hover:bg-accent">
              Dashboard
            </a>
            <a href="/spaces" className="block px-3 py-2 rounded-md text-sm hover:bg-accent">
              Spaces
            </a>
            <a href="/tasks" className="block px-3 py-2 rounded-md text-sm hover:bg-accent">
              Tasks
            </a>
            <a href="/analytics" className="block px-3 py-2 rounded-md text-sm hover:bg-accent">
              Analytics
            </a>
            <a href="/settings" className="block px-3 py-2 rounded-md text-sm hover:bg-accent">
              Settings
            </a>
            <a href="/profile" className="block px-3 py-2 rounded-md text-sm hover:bg-accent">
              Profile
            </a>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}