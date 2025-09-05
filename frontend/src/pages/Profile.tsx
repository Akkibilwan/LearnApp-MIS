import React from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function Profile() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input className="input-base" value={user.name} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input className="input-base" value={user.email} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <input className="input-base" value={user.role} readOnly />
            </div>
          </div>
        </div>

        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Organization</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Organization</label>
              <input className="input-base" value={user.organization.name} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Member Since</label>
              <input className="input-base" value="January 2024" readOnly />
            </div>
          </div>
        </div>
      </div>

      <div className="neumorphic rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Account Actions</h3>
        <div className="space-x-4">
          <button className="btn-primary px-4 py-2 rounded-lg">
            Edit Profile
          </button>
          <button className="btn-secondary px-4 py-2 rounded-lg">
            Change Password
          </button>
        </div>
      </div>
    </div>
  )
}