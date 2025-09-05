import axios, { AxiosError, AxiosResponse } from 'axios'
import toast from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    pagination?: {
      limit: number
      offset: number
      total: number
    }
    timestamp?: string
    [key: string]: any
  }
}

// Token management
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    localStorage.setItem('auth_token', token)
  } else {
    delete api.defaults.headers.common['Authorization']
    localStorage.removeItem('auth_token')
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken
  
  const storedToken = localStorage.getItem('auth_token')
  if (storedToken) {
    setAuthToken(storedToken)
    return storedToken
  }
  
  return null
}

// Initialize token from localStorage on import
getAuthToken()

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Ensure we have the latest token
    const token = getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response
  },
  (error: AxiosError<ApiResponse>) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Token expired or invalid
      setAuthToken(null)
      window.location.href = '/auth/login'
      toast.error('Session expired. Please log in again.')
      return Promise.reject(error)
    }

    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.')
      return Promise.reject(error)
    }

    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
      return Promise.reject(error)
    }

    if (error.code === 'NETWORK_ERROR' || !error.response) {
      toast.error('Network error. Please check your connection.')
      return Promise.reject(error)
    }

    // Let specific errors be handled by the calling code
    return Promise.reject(error)
  }
)

// Generic API functions
export async function get<T>(url: string, params?: any): Promise<T> {
  const response = await api.get<ApiResponse<T>>(url, { params })
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Request failed')
  }
  return response.data.data!
}

export async function post<T>(url: string, data?: any): Promise<T> {
  const response = await api.post<ApiResponse<T>>(url, data)
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Request failed')
  }
  return response.data.data!
}

export async function put<T>(url: string, data?: any): Promise<T> {
  const response = await api.put<ApiResponse<T>>(url, data)
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Request failed')
  }
  return response.data.data!
}

export async function del<T>(url: string): Promise<T> {
  const response = await api.delete<ApiResponse<T>>(url)
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Request failed')
  }
  return response.data.data!
}

// Auth API functions
export const authApi = {
  login: async (email: string, password: string) => {
    return post<{ user: any; token: string }>('/auth/login', { email, password })
  },

  register: async (data: {
    email: string
    name: string
    password: string
    organizationName?: string
    organizationSlug?: string
  }) => {
    return post<{ user: any; token: string }>('/auth/register', data)
  },

  getProfile: async () => {
    return get<{ user: any }>('/auth/me')
  },

  updateProfile: async (data: any) => {
    return put<{ user: any }>('/auth/profile', data)
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return put<{ message: string }>('/auth/password', {
      currentPassword,
      newPassword,
    })
  },

  refreshToken: async () => {
    return post<{ token: string }>('/auth/refresh')
  },

  logout: async () => {
    return post<{ message: string }>('/auth/logout')
  },
}

// Organization API functions
export const organizationApi = {
  get: async () => {
    return get<{ organization: any }>('/organizations')
  },

  update: async (data: any) => {
    return put<{ organization: any }>('/organizations', data)
  },

  getUsers: async (params?: any) => {
    return get<{ users: any[]; total: number }>('/organizations/users', params)
  },

  getSpaces: async (params?: any) => {
    return get<{ spaces: any[]; total: number }>('/organizations/spaces', params)
  },
}

// Spaces API functions
export const spacesApi = {
  getAll: async (params?: any) => {
    return get<{ spaces: any[] }>('/spaces', params)
  },

  create: async (data: any) => {
    return post<{ space: any }>('/spaces', data)
  },

  getById: async (spaceId: string) => {
    return get<{ space: any }>(`/spaces/${spaceId}`)
  },

  update: async (spaceId: string, data: any) => {
    return put<{ space: any }>(`/spaces/${spaceId}`, data)
  },

  archive: async (spaceId: string) => {
    return put<{ space: any }>(`/spaces/${spaceId}/archive`)
  },

  delete: async (spaceId: string) => {
    return del<{ message: string }>(`/spaces/${spaceId}`)
  },

  getMembers: async (spaceId: string) => {
    return get<{ members: any[] }>(`/spaces/${spaceId}/members`)
  },

  addMember: async (spaceId: string, data: any) => {
    return post<{ member: any }>(`/spaces/${spaceId}/members`, data)
  },

  updateMember: async (spaceId: string, userId: string, data: any) => {
    return put<{ member: any }>(`/spaces/${spaceId}/members/${userId}`, data)
  },

  removeMember: async (spaceId: string, userId: string) => {
    return del<{ message: string }>(`/spaces/${spaceId}/members/${userId}`)
  },

  getAnalytics: async (spaceId: string, range?: string) => {
    return get<{ analytics: any }>(`/spaces/${spaceId}/analytics`, { range })
  },
}

// Groups API functions
export const groupsApi = {
  getBySpace: async (spaceId: string) => {
    return get<{ groups: any[] }>(`/groups/space/${spaceId}`)
  },

  create: async (spaceId: string, data: any) => {
    return post<{ group: any }>(`/groups/space/${spaceId}`, data)
  },

  update: async (groupId: string, data: any) => {
    return put<{ group: any }>(`/groups/${groupId}`, data)
  },

  delete: async (groupId: string) => {
    return del<{ message: string }>(`/groups/${groupId}`)
  },

  reorder: async (groupId: string, newPosition: number) => {
    return post<{ groups: any[] }>(`/groups/${groupId}/reorder`, {
      newPosition,
    })
  },
}

// Tasks API functions
export const tasksApi = {
  getBySpace: async (spaceId: string, params?: any) => {
    return get<{ tasks: any[] }>(`/tasks/space/${spaceId}`, params)
  },

  create: async (spaceId: string, data: any) => {
    return post<{ task: any }>(`/tasks/space/${spaceId}`, data)
  },

  getById: async (taskId: string) => {
    return get<{ task: any }>(`/tasks/${taskId}`)
  },

  update: async (taskId: string, data: any) => {
    return put<{ task: any }>(`/tasks/${taskId}`, data)
  },

  move: async (taskId: string, groupId: string, position?: number) => {
    return put<{ task: any }>(`/tasks/${taskId}/move`, {
      group_id: groupId,
      position,
    })
  },

  delete: async (taskId: string) => {
    return del<{ message: string }>(`/tasks/${taskId}`)
  },
}

// Users API functions
export const usersApi = {
  search: async (query: string, limit?: number) => {
    return get<{ users: any[] }>('/users/search', { q: query, limit })
  },

  getAll: async (params?: any) => {
    return get<{ users: any[] }>('/users', params)
  },

  getById: async (userId: string) => {
    return get<{ user: any }>(`/users/${userId}`)
  },

  update: async (userId: string, data: any) => {
    return put<{ user: any }>(`/users/${userId}`, data)
  },

  delete: async (userId: string) => {
    return del<{ message: string }>(`/users/${userId}`)
  },

  getSpaces: async (userId: string) => {
    return get<{ spaces: any[] }>(`/users/${userId}/spaces`)
  },
}

// Analytics API functions
export const analyticsApi = {
  getSpaceAnalytics: async (spaceId: string, dateRange?: string) => {
    return get<any>(`/analytics/spaces/${spaceId}`, { dateRange })
  },

  getOrganizationAnalytics: async () => {
    return get<any>('/analytics/organization')
  },
}

export default api