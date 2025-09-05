import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';

import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SpaceDetail from './pages/SpaceDetail';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterMoment}>
        <NotificationProvider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Navigate to="/dashboard" />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/spaces/:spaceId" element={<SpaceDetail />} />
                          <Route path="/tasks" element={<Tasks />} />
                          <Route path="/tasks/:taskId" element={<TaskDetail />} />
                          <Route path="/users" element={<Users />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/analytics" element={<Analytics />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </AuthProvider>
        </NotificationProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;