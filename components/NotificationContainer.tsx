'use client'

import React from 'react'
import { useNotifications } from '@/contexts/NotificationContext'
import NotificationToast from './NotificationToast'

export default function NotificationContainer() {
    const { notifications, visibleToastIds } = useNotifications()

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {notifications
                .filter(notification => visibleToastIds.has(notification.id))
                .map((notification) => (
                    <NotificationToast
                        key={notification.id}
                        {...notification}
                    />
                ))}
        </div>
    )
} 