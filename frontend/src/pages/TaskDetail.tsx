import React from 'react'
import { useParams } from 'react-router-dom'

export default function TaskDetail() {
  const { taskId } = useParams()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Task Detail</h1>
        <p className="text-muted-foreground mt-2">
          Viewing task: {taskId}
        </p>
      </div>

      <div className="neumorphic rounded-lg p-6">
        <p className="text-muted-foreground">
          Task details, comments, and editing interface will be implemented here.
        </p>
      </div>
    </div>
  )
}