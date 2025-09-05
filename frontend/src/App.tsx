import { Routes, Route, Navigate } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import { AuthProvider } from '@/contexts/AuthContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Auth components
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'

// Protected components
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Layout from '@/components/layout/Layout'

// Main pages
import Dashboard from '@/pages/Dashboard'
import Spaces from '@/pages/Spaces'
import SpaceDetail from '@/pages/SpaceDetail'
import Tasks from '@/pages/Tasks'
import TaskDetail from '@/pages/TaskDetail'
import Analytics from '@/pages/Analytics'
import Settings from '@/pages/Settings'
import Profile from '@/pages/Profile'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DndProvider backend={HTML5Backend}>
          <div className="min-h-screen bg-background text-foreground">
            <Routes>
              {/* Public routes */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <SocketProvider>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/spaces" element={<Spaces />} />
                          <Route path="/spaces/:spaceId" element={<SpaceDetail />} />
                          <Route path="/tasks" element={<Tasks />} />
                          <Route path="/tasks/:taskId" element={<TaskDetail />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </Layout>
                    </SocketProvider>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </DndProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App