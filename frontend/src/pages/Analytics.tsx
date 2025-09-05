import React from 'react'

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Project performance and team insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Tasks</h3>
          <p className="text-2xl font-bold text-primary">24</p>
        </div>
        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
          <p className="text-2xl font-bold text-green-400">18</p>
        </div>
        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground">In Progress</h3>
          <p className="text-2xl font-bold text-accent">4</p>
        </div>
        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Overdue</h3>
          <p className="text-2xl font-bold text-red-400">2</p>
        </div>
      </div>

      <div className="neumorphic rounded-lg p-6">
        <p className="text-muted-foreground">
          Charts and detailed analytics will be implemented here using Recharts.
        </p>
      </div>
    </div>
  )
}