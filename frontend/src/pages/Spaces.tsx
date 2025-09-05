import React from 'react'

export default function Spaces() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Spaces</h1>
        <p className="text-muted-foreground mt-2">
          Manage your project spaces and teams
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="neumorphic rounded-lg p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Sample Project</h3>
            <div className="w-3 h-3 bg-primary rounded-full"></div>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            A demonstration project showing platform capabilities
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">5 members</span>
            <span className="text-muted-foreground">12 tasks</span>
          </div>
        </div>

        <div className="neumorphic rounded-lg p-6 card-hover border-2 border-dashed border-border">
          <div className="text-center">
            <div className="text-4xl text-muted-foreground mb-2">+</div>
            <h3 className="text-lg font-semibold mb-2">Create New Space</h3>
            <p className="text-muted-foreground text-sm">
              Start a new project space
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}