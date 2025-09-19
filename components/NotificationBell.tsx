'use client'

import React, { useState } from 'react'
import { Bell, X, Check, Trash2, AlertTriangle, Info } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import { format } from 'date-fns'

export default function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications()
    const [isOpen, setIsOpen] = useState(false)

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <Check className="h-4 w-4 text-green-500" />
            case 'error':
                return <X className="h-4 w-4 text-red-500" />
            case 'warning':
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />
            case 'info':
                return <Info className="h-4 w-4 text-blue-500" />
            default:
                return <Bell className="h-4 w-4 text-gray-500" />
        }
    }

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'success':
                return 'border-l-green-500 bg-green-50'
            case 'error':
                return 'border-l-red-500 bg-red-50'
            case 'warning':
                return 'border-l-yellow-500 bg-yellow-50'
            case 'info':
                return 'border-l-blue-500 bg-blue-50'
            default:
                return 'border-l-gray-500 bg-gray-50'
        }
    }

    const getNotificationTypeLabel = (type: string) => {
        switch (type) {
            case 'success':
                return 'Success'
            case 'error':
                return 'Error'
            case 'warning':
                return 'Warning'
            case 'info':
                return 'Info'
            default:
                return 'Notification'
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                    }}
                >
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="ml-2 text-sm text-gray-500">
                                        ({unreadCount} unread)
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center space-x-3">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        console.log('🔴 X button clicked - closing popup only')
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setIsOpen(false)
                                    }}
                                    onMouseDown={(e) => {
                                        console.log('🔴 X button mousedown - preventing default')
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                                    title="Fermer les notifications"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm font-medium">Aucune notification pour le moment</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Vous verrez les notifications ici lorsque vous créerez des tickets ou recevrez des mises à jour
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${!notification.read ? 'bg-opacity-100' : 'bg-opacity-30'
                                            } hover:bg-opacity-100 transition-all duration-200`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-3 flex-1">
                                                {getNotificationIcon(notification.type)}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2">
                                                        <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'
                                                            }`}>
                                                            {notification.title}
                                                        </p>
                                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                                            {getNotificationTypeLabel(notification.type)}
                                                        </span>
                                                        {!notification.read && (
                                                            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                                                                Nouveau
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <p className="text-xs text-gray-400">
                                                            {format(notification.timestamp, 'MMM dd, yyyy HH:mm')}
                                                        </p>
                                                        {notification.ticketId && notification.ticketId !== 'test-123' && notification.ticketId !== 'test-456' && notification.ticketId !== 'test-789' && (
                                                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                                Ticket #{notification.ticketId.slice(0, 8)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex space-x-1 ml-2">
                                                {!notification.read && (
                                                    <button
                                                        onClick={() => markAsRead(notification.id)}
                                                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                                                        title="Marquer comme lu"
                                                    >
                                                        ✓
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => removeNotification(notification.id)}
                                                    className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                                                    title="Supprimer la notification"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Click outside to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsOpen(false)
                    }}
                />
            )}
        </div>
    )
} 