import React from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your project management platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-lg font-semibold text-primary">Active Projects</h3>
          <p className="text-3xl font-bold mt-2">3</p>
          <p className="text-sm text-muted-foreground">2 completed this month</p>
        </div>

        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-lg font-semibold text-accent">Tasks</h3>
          <p className="text-3xl font-bold mt-2">12</p>
          <p className="text-sm text-muted-foreground">8 pending, 4 completed</p>
        </div>

        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-400">Team Members</h3>
          <p className="text-3xl font-bold mt-2">5</p>
          <p className="text-sm text-muted-foreground">All active</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <div>
                <p className="text-sm">New task created: "Setup Database"</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <div>
                <p className="text-sm">Task completed: "Design UI Components"</p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <div>
                <p className="text-sm">Project milestone reached</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full btn-primary text-left px-4 py-3 rounded-lg">
              Create New Task
            </button>
            <button className="w-full btn-secondary text-left px-4 py-3 rounded-lg">
              Start New Project
            </button>
            <button className="w-full btn-ghost text-left px-4 py-3 rounded-lg border border-border">
              View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      {user && (
        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">
            Hello, {user.name}! 👋
          </h3>
          <p className="text-muted-foreground">
            You're logged in to <strong>{user.organization.name}</strong>. 
            This is your project management dashboard where you can manage tasks, 
            track progress, and collaborate with your team in real-time.
          </p>
        </div>
      )}
    </div>
  )
}