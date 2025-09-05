import React from 'react'
import { useParams } from 'react-router-dom'

export default function SpaceDetail() {
  const { spaceId } = useParams()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Space Detail</h1>
        <p className="text-muted-foreground mt-2">
          Viewing space: {spaceId}
        </p>
      </div>

      <div className="neumorphic rounded-lg p-6">
        <p className="text-muted-foreground">
          Kanban board and space management will be implemented here.
        </p>
      </div>
    </div>
  )
}