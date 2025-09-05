import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { authApi, setAuthToken, getAuthToken } from '@/lib/api'

// Types
interface User {
  id: string
  email: string
  name: string
  role: string
  avatar_url?: string
  organization: {
    id: string
    name: string
    slug: string
  }
  settings?: any
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateProfile: (data: any) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

interface RegisterData {
  email: string
  name: string
  password: string
  organizationName?: string
  organizationSlug?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const queryClient = useQueryClient()

  // Query to get user profile if token exists
  const {
    data: profileData,
    isLoading: isLoadingProfile,
    error: profileError,
  } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authApi.getProfile(),
    enabled: !!getAuthToken() && !isInitialized,
    retry: false,
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      const { user, token } = data
      setAuthToken(token)
      setUser(user)
      queryClient.setQueryData(['auth', 'profile'], { user })
      toast.success(`Welcome back, ${user.name}!`)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Login failed'
      toast.error(message)
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
    onSuccess: (data) => {
      const { user, token } = data
      setAuthToken(token)
      setUser(user)
      queryClient.setQueryData(['auth', 'profile'], { user })
      toast.success(`Welcome, ${user.name}! Your account has been created.`)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Registration failed'
      toast.error(message)
    },
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => authApi.updateProfile(data),
    onSuccess: (data) => {
      const { user } = data
      setUser(user)
      queryClient.setQueryData(['auth', 'profile'], { user })
      toast.success('Profile updated successfully')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Failed to update profile'
      toast.error(message)
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string
      newPassword: string
    }) => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Failed to change password'
      toast.error(message)
    },
  })

  // Initialize auth state
  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setIsInitialized(true)
      return
    }

    if (profileData) {
      setUser(profileData.user)
      setIsInitialized(true)
    } else if (profileError) {
      // Token is invalid
      setAuthToken(null)
      setUser(null)
      setIsInitialized(true)
    }
  }, [profileData, profileError])

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password })
  }

  const register = async (data: RegisterData) => {
    await registerMutation.mutateAsync(data)
  }

  const logout = () => {
    setAuthToken(null)
    setUser(null)
    queryClient.clear()
    toast.success('Logged out successfully')
  }

  const updateProfile = async (data: any) => {
    await updateProfileMutation.mutateAsync(data)
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await changePasswordMutation.mutateAsync({ currentPassword, newPassword })
  }

  const isLoading = !isInitialized || isLoadingProfile

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext