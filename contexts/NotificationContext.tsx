'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '@/lib/api'

interface Notification {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: Date
    read: boolean
    ticketId?: string
}

interface NotificationContextType {
    notifications: Notification[]
    visibleToastIds: Set<string>
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    removeNotification: (id: string) => void
    clearAll: () => void
    showToast: (id: string) => void
    dismissToast: (id: string) => void
    unreadCount: number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Local storage key for notifications
const NOTIFICATIONS_STORAGE_KEY = 'zendesk_notifications'

// Helper functions for localStorage
const getStoredNotifications = (): Notification[] => {
    if (typeof window === 'undefined') return []

    try {
        const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
        if (stored) {
            const notifications = JSON.parse(stored)
            // Convert timestamp strings back to Date objects
            return notifications.map((notif: any) => ({
                ...notif,
                timestamp: new Date(notif.timestamp)
            }))
        }
    } catch (error) {
        console.error('Error loading notifications from localStorage:', error)
    }
    return []
}

const saveNotificationsToStorage = (notifications: Notification[]) => {
    if (typeof window === 'undefined') return

    try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications))
    } catch (error) {
        console.error('Error saving notifications to localStorage:', error)
    }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [visibleToastIds, setVisibleToastIds] = useState<Set<string>>(new Set())
    const isInitialized = useRef(false)
    const notificationsRef = useRef<Notification[]>([])

    console.log('🔄 NotificationProvider render')

    // Load notifications from localStorage on mount (only once)
    useEffect(() => {
        if (!isInitialized.current) {
            const storedNotifications = getStoredNotifications()
            console.log('🔵 Loading stored notifications:', storedNotifications.length)
            setNotifications(storedNotifications)
            notificationsRef.current = storedNotifications
            isInitialized.current = true
        }
    }, [])



    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        console.log('🔵 addNotification called with:', notification.title)
        const newNotification: Notification = {
            ...notification,
            id: Date.now().toString(),
            timestamp: new Date(),
            read: false
        }
        setNotifications(prev => {
            console.log('🔵 Previous notifications count:', prev.length)
            const updated = [newNotification, ...prev]
            console.log('🔵 Updated notifications count:', updated.length)
            notificationsRef.current = updated
            saveNotificationsToStorage(updated)
            return updated
        })

        // Show the notification as a toast popup
        setVisibleToastIds(prev => new Set(Array.from(prev).concat(newNotification.id)))
    }, [])

    const showToast = useCallback((id: string) => {
        setVisibleToastIds(prev => new Set(Array.from(prev).concat(id)))
    }, [])

    const dismissToast = useCallback((id: string) => {
        setVisibleToastIds(prev => {
            const newSet = new Set(Array.from(prev))
            newSet.delete(id)
            return newSet
        })
    }, [])





    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => {
            const updated = prev.map(notif =>
                notif.id === id ? { ...notif, read: true } : notif
            )
            saveNotificationsToStorage(updated)
            return updated
        })
    }, [])

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => {
            const updated = prev.map(notif => ({ ...notif, read: true }))
            saveNotificationsToStorage(updated)
            return updated
        })
    }, [])

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => {
            const updated = prev.filter(notif => notif.id !== id)
            saveNotificationsToStorage(updated)
            return updated
        })
    }, [])

    const clearAll = useCallback(() => {
        console.log('🔴 clearAll called - this should NOT happen!')
        setNotifications([])
        saveNotificationsToStorage([])
    }, [])

    const unreadCount = notifications.filter(notif => !notif.read).length

    // Debug: Log every time notifications state changes
    useEffect(() => {
        console.log('🔄 Notifications state changed to:', notifications.length, 'notifications')
    }, [notifications])

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        notifications,
        visibleToastIds,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        showToast,
        dismissToast,
        unreadCount
    }), [notifications, visibleToastIds, addNotification, markAsRead, markAllAsRead, removeNotification, clearAll, showToast, dismissToast, unreadCount])

    // Auto-remove old notifications (keep last 50 notifications) - TEMPORARILY DISABLED
    // useEffect(() => {
    //     const timer = setInterval(() => {
    //         setNotifications(prev => {
    //             const now = Date.now()
    //             const filtered = prev.filter(notif => {
    //                 // Keep notifications from last 7 days
    //                 const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
    //                 return notif.timestamp.getTime() > sevenDaysAgo
    //             })

    //             // Also limit to last 50 notifications
    //             const limited = filtered.slice(0, 50)

    //             if (limited.length !== prev.length) {
    //                 console.log('🔴 Auto-cleanup removing notifications:', prev.length - limited.length)
    //                 saveNotificationsToStorage(limited)
    //                 return limited
    //             }
    //             return prev
    //         })
    //     }, 60000) // Check every minute

    //     return () => clearInterval(timer)
    // }, [])

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider')
    }
    return context
} 