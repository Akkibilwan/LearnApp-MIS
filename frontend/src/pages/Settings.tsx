import React from 'react'

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your workspace and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Organization Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Organization Name</label>
              <input className="input-base" value="Demo Organization" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Working Hours</label>
              <select className="input-base">
                <option>9 AM - 5 PM</option>
                <option>8 AM - 6 PM</option>
                <option>24/7</option>
              </select>
            </div>
          </div>
        </div>

        <div className="neumorphic rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Notifications</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">Email notifications</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">Task updates</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm">Weekly reports</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}