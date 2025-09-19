'use client'

import React, { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'

interface NotificationToastProps {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: Date
    read: boolean
    ticketId?: string
}

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
}

const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
}

const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
}

export default function NotificationToast({
    id,
    type,
    title,
    message,
    timestamp,
    read,
    ticketId
}: NotificationToastProps) {
    const { dismissToast, markAsRead } = useNotifications()
    const Icon = icons[type]

    useEffect(() => {
        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
            dismissToast(id)
        }, 5000)

        return () => clearTimeout(timer)
    }, [id, dismissToast])

    const handleClick = () => {
        if (!read) {
            markAsRead(id)
        }
        if (ticketId) {
            // Navigate to ticket if ticketId is provided
            window.location.href = `/tickets/${ticketId}`
        }
    }

    return (
        <div
            className={`relative p-4 border rounded-lg shadow-lg max-w-sm w-full transition-all duration-300 transform ${read ? 'opacity-75' : 'opacity-100'
                } ${colors[type]} hover:shadow-xl cursor-pointer`}
            onClick={handleClick}
        >
            <div className="flex items-start space-x-3">
                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColors[type]}`} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-sm mt-1 opacity-90">{message}</p>
                    <p className="text-xs mt-2 opacity-75">
                        {timestamp.toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        dismissToast(id)
                    }}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
} 