'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface User {
    id: string
    username: string
    email: string
    first_name: string
    last_name: string
    phone?: string
    role: 'admin' | 'employee' | 'technician'
    group: string
}

interface AuthContextType {
    user: User | null
    setUser: (user: User | null) => void
    login: (email: string, password: string) => Promise<void>
    register: (userData: any) => Promise<void>
    logout: () => Promise<void>
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const queryClient = useQueryClient()

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('access_token')
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`
            fetchProfile()
        } else {
            setIsLoading(false)
        }
    }, [])

    const fetchProfile = async () => {
        try {
            const response = await api.get('/api/auth/profile/')
            setUser(response.data)
        } catch (error) {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            delete api.defaults.headers.common['Authorization']
        } finally {
            setIsLoading(false)
        }
    }

    const login = async (email: string, password: string) => {
        try {
            const response = await api.post('/api/auth/login/', { email, password })
            const { access, refresh, user: userData } = response.data

            localStorage.setItem('access_token', access)
            localStorage.setItem('refresh_token', refresh)
            api.defaults.headers.common['Authorization'] = `Bearer ${access}`

            setUser(userData)

            // Invalidate dashboard stats cache to refresh with updated timestamps
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        } catch (error) {
            throw error
        }
    }

    const register = async (userData: any) => {
        try {
            const response = await api.post('/api/auth/register/', userData)
            const { access, refresh, user: newUser } = response.data

            localStorage.setItem('access_token', access)
            localStorage.setItem('refresh_token', refresh)
            api.defaults.headers.common['Authorization'] = `Bearer ${access}`

            setUser(newUser)
        } catch (error) {
            throw error
        }
    }

    const logout = async () => {
        try {
            // Call backend logout endpoint to update last_logout timestamp
            await api.post('/api/auth/logout/')
        } catch (error) {
            // Even if logout fails, we still want to clear local state
            console.error('Logout API call failed:', error)
        } finally {
            // Always clear local storage and state
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            delete api.defaults.headers.common['Authorization']
            setUser(null)

            // Clear all cached queries since user is logging out
            queryClient.clear()
        }
    }

    return (
        <AuthContext.Provider value={{ user, setUser, login, register, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
} 